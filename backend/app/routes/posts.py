from fastapi import APIRouter, Depends, HTTPException
from app.services.ai_service import AIService
from app.services.dependencies import get_current_user
from app.services.database import posts_collection
from app.schemas.post_schema import PostCreate, PostPublic, PublishRequest
from app.services.fb_service import FacebookService
from app.services.insta_service import InstaService
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter(prefix="/posts", tags=["Posts"])


def _normalize_hashtags(hashtags: List[str]) -> List[str]:
    normalized = []
    for tag in hashtags:
        if not tag:
            continue
        normalized.append(tag if tag.startswith("#") else f"#{tag}")
    return normalized


def _build_caption(caption: str, hashtags: List[str]) -> str:
    caption_text = caption or ""
    hashtag_text = " ".join(_normalize_hashtags(hashtags))
    if caption_text and hashtag_text:
        return f"{caption_text}\n\n{hashtag_text}"
    return caption_text or hashtag_text

@router.post("/create")
async def create_post(post: PostCreate, user: dict = Depends(get_current_user)):
    """Create a new social media post with AI-generated content"""
    try:
        caption = AIService.generate_caption(post.topic, post.language)
        hashtags = AIService.generate_hashtags(post.topic)
        image = AIService.generate_image(post.topic)

        user_id = str(user["_id"])
        post_data = {
            "title": post.title,
            "content": post.content,
            "caption": caption,
            "hashtags": hashtags,
            "image": image,
            "created_by": user_id,
            "user_id": user_id,
            "status": "draft",
            "created_at": datetime.utcnow()
        }

        result = posts_collection.insert_one(post_data)
        post_data["_id"] = str(result.inserted_id)

        return {"status": "success", "post": post_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user-posts")
async def get_user_posts(user: dict = Depends(get_current_user)):
    """Get all posts created by the user"""
    # Normalize user id to string (dependencies already returns string id)
    user_id = str(user["_id"])

    # Support both field names (`created_by` from posts.create and `user_id` from content.save)
    query = {"$or": [{"created_by": user_id}, {"user_id": user_id}]}

    posts = list(posts_collection.find(query).sort("created_at", -1))

    # Convert ObjectId and datetimes to serializable values
    for p in posts:
        p["_id"] = str(p["_id"])
        if "created_at" in p and hasattr(p["created_at"], "isoformat"):
            p["created_at"] = p["created_at"].isoformat()
            
    return {"status": "success", "posts": posts}


@router.get("/stats")
async def get_post_stats(user: dict = Depends(get_current_user)):
    """Get post statistics for the dashboard"""
    user_id = str(user["_id"])
    total = posts_collection.count_documents({"user_id": user_id})
    drafts = posts_collection.count_documents({"user_id": user_id, "status": "draft"})
    scheduled = posts_collection.count_documents({"user_id": user_id, "status": "scheduled"})
    published = posts_collection.count_documents({"user_id": user_id, "status": "published"})
    return {"status": "success", "stats": {"total_posts": total, "drafts": drafts, "scheduled": scheduled, "published": published}}


@router.post("/publish")
async def publish_post(payload: PublishRequest, user: dict = Depends(get_current_user)):
    platforms = [p.lower() for p in payload.platforms]
    allowed = {"facebook", "instagram"}
    invalid = [p for p in platforms if p not in allowed]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Unsupported platforms: {', '.join(invalid)}")

    post_doc = None
    if payload.post_id:
        try:
            post_doc = posts_collection.find_one({"_id": ObjectId(payload.post_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid post_id")

        if not post_doc:
            raise HTTPException(status_code=404, detail="Post not found")

        user_id = str(user["_id"])
        owner_id = str(post_doc.get("created_by") or post_doc.get("user_id"))
        if owner_id != user_id:
            raise HTTPException(status_code=403, detail="Not allowed to publish this post")

    caption = payload.caption
    hashtags = payload.hashtags or []
    image = payload.image

    if post_doc:
        caption = post_doc.get("caption") or post_doc.get("content")
        hashtags = post_doc.get("hashtags") or []
        image = post_doc.get("image")

    if not image:
        raise HTTPException(status_code=400, detail="Image is required for publishing")

    caption_text = _build_caption(caption or "", hashtags)

    results = {}
    if "facebook" in platforms:
        fb_service = FacebookService()
        results["facebook"] = fb_service.publish_photo(image, caption_text)

    if "instagram" in platforms:
        insta_service = InstaService()
        results["instagram"] = insta_service.publish_photo(image, caption_text)

    if post_doc:
        update = {
            "status": "published",
            "published_at": datetime.utcnow(),
            "platform_results": results,
        }
        posts_collection.update_one({"_id": post_doc["_id"]}, {"$set": update})

    return {"status": "success", "results": results}