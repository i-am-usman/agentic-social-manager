from fastapi import APIRouter, Depends, HTTPException
from app.services.ai_service import AIService
from app.services.dependencies import get_current_user
from app.services.database import posts_collection
from app.schemas.post_schema import PostCreate, PostPublic
from datetime import datetime
from bson import ObjectId

router = APIRouter(prefix="/posts", tags=["Posts"])

@router.post("/create")
async def create_post(post: PostCreate, user: dict = Depends(get_current_user)):
    """Create a new social media post with AI-generated content"""
    try:
        caption = AIService.generate_caption(post.topic, post.language)
        hashtags = AIService.generate_hashtags(post.topic)
        image = AIService.generate_image(post.topic)

        post_data = {
            "title": post.title,
            "content": post.content,
            "caption": caption,
            "hashtags": hashtags,
            "image": image,
            "created_by": str(user["_id"]),   #  store as string
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