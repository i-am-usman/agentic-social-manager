from fastapi import APIRouter, Depends, HTTPException
from app.services.ai_service import AIService
from app.services.dependencies import get_current_user
from app.services.database import posts_collection
from app.services.image_service import ImageService
from app.schemas.post_schema import PostCreate, PostPublic, PublishRequest, RescheduleRequest, EditPostRequest
from app.services.fb_service import FacebookService
from app.services.insta_service import InstaService
from app.services.social_accounts import get_platform_credentials
from datetime import datetime, timezone
import pytz
from bson import ObjectId
from typing import List
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/posts", tags=["Posts"])

# Pakistani Standard Time (UTC+5)
PAKISTAN_TZ = pytz.timezone('Asia/Karachi')


def _to_pakistan_time(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return PAKISTAN_TZ.localize(dt)
    return dt.astimezone(PAKISTAN_TZ)


def _serialize_to_pakistan_time(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = pytz.UTC.localize(dt)
    return dt.astimezone(PAKISTAN_TZ).isoformat()


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
            "created_at": datetime.now(PAKISTAN_TZ)
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
            p["created_at"] = _serialize_to_pakistan_time(p["created_at"])
        if "scheduled_at" in p and hasattr(p["scheduled_at"], "isoformat"):
            p["scheduled_at"] = _serialize_to_pakistan_time(p["scheduled_at"])
        if "published_at" in p and hasattr(p["published_at"], "isoformat"):
            p["published_at"] = _serialize_to_pakistan_time(p["published_at"])
            
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

    user_id = str(user["_id"])
    fb_creds = get_platform_credentials(user_id, "facebook")
    ig_creds = get_platform_credentials(user_id, "instagram")

    if "facebook" in platforms and not fb_creds:
        raise HTTPException(status_code=400, detail="Facebook account not connected")
    if "instagram" in platforms and not ig_creds:
        raise HTTPException(status_code=400, detail="Instagram account not connected")

    post_doc = None
    if payload.post_id:
        try:
            post_doc = posts_collection.find_one({"_id": ObjectId(payload.post_id)})
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid post_id")

        if not post_doc:
            raise HTTPException(status_code=404, detail="Post not found")

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

    # Instagram requires an image, but Facebook allows text-only posts
    if "instagram" in platforms and not image:
        raise HTTPException(status_code=400, detail="Image is required for publishing to Instagram")

    caption_text = _build_caption(caption or "", hashtags)

    results = {}
    if "facebook" in platforms:
        fb_service = FacebookService(
            page_id=fb_creds.get("page_id"),
            access_token=fb_creds.get("access_token"),
        )
        if image:
            # Publish with image
            results["facebook"] = fb_service.publish_photo(image, caption_text)
        else:
            # Publish text-only
            results["facebook"] = fb_service.publish_text(caption_text)

    if "instagram" in platforms:
        insta_service = InstaService(
            ig_user_id=ig_creds.get("ig_user_id"),
            access_token=ig_creds.get("access_token"),
        )
        
        # If image is base64, upload to imgbb first to get public URL
        final_image = image
        if final_image and ImageService.is_base64(final_image):
            logger.info(f"Converting base64 image to imgbb URL for Instagram")
            upload_result = ImageService.upload_base64_to_imgbb(final_image)
            if upload_result["status"] == "success":
                final_image = upload_result["url"]
                logger.info(f"Image uploaded to imgbb: {final_image}")
            else:
                logger.error(f"Failed to upload image to imgbb: {upload_result['detail']}")
                raise HTTPException(status_code=500, detail=f"Failed to upload image: {upload_result['detail']}")
        
        logger.info(f"Publishing to Instagram with image: {final_image[:50] if final_image else 'None'}...")
        results["instagram"] = insta_service.publish_photo(final_image, caption_text)
        logger.info(f"Instagram publish result: {results['instagram']}")

    if post_doc:
        update = {
            "status": "published",
            "published_at": datetime.now(PAKISTAN_TZ),
            "platform_results": results,
        }
        posts_collection.update_one({"_id": post_doc["_id"]}, {"$set": update})

    return {"status": "success", "results": results}


@router.patch("/{post_id}/schedule")
async def reschedule_post(
    post_id: str,
    payload: RescheduleRequest,
    user: dict = Depends(get_current_user)
):
    """Reschedule or cancel a scheduled post"""
    try:
        post_doc = posts_collection.find_one({"_id": ObjectId(post_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid post_id")

    if not post_doc:
        raise HTTPException(status_code=404, detail="Post not found")

    user_id = str(user["_id"])
    owner_id = str(post_doc.get("created_by") or post_doc.get("user_id"))
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not allowed to modify this post")

    update = {}
    
    # Normalize scheduled_at to Pakistani timezone
    scheduled_at_aware = None
    if payload.scheduled_at:
        scheduled_at_aware = _to_pakistan_time(payload.scheduled_at)
    
    # Cancel schedule if scheduled_at is None
    if payload.scheduled_at is None:
        update["status"] = "draft"
        update["scheduled_at"] = None
        message = "Schedule cancelled"
    # Reschedule if future datetime provided
    elif scheduled_at_aware > datetime.now(PAKISTAN_TZ):
        update["status"] = "scheduled"
        update["scheduled_at"] = scheduled_at_aware
        message = "Post rescheduled"
    # If past datetime, keep as draft
    else:
        update["status"] = "draft"
        update["scheduled_at"] = scheduled_at_aware
        message = "Schedule time is in the past, post saved as draft"
    
    # Update platforms if provided
    if payload.platforms is not None:
        update["platforms"] = payload.platforms
    
    posts_collection.update_one({"_id": ObjectId(post_id)}, {"$set": update})
    
    return {"status": "success", "message": message}


@router.patch("/{post_id}/edit")
async def edit_post(
    post_id: str,
    payload: EditPostRequest,
    current_user: dict = Depends(get_current_user)
):
    """Edit a post's caption, hashtags, or image"""
    try:
        # Find the post
        post = posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Verify ownership
        user_id = current_user.get("user_id") or current_user.get("_id")
        post_owner = post.get("created_by") or post.get("user_id")
        
        if str(user_id) != str(post_owner):
            raise HTTPException(status_code=403, detail="Not authorized to edit this post")
        
        # Build update dictionary with only provided fields
        update = {}
        if payload.caption is not None:
            update["caption"] = payload.caption
        if payload.hashtags is not None:
            update["hashtags"] = payload.hashtags
        if payload.image is not None:
            update["image"] = payload.image
        
        if not update:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update the post
        posts_collection.update_one({"_id": ObjectId(post_id)}, {"$set": update})
        
        return {"status": "success", "message": "Post updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{post_id}")
async def delete_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a post"""
    try:
        # Find the post
        post = posts_collection.find_one({"_id": ObjectId(post_id)})
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        # Verify ownership
        user_id = current_user.get("user_id") or current_user.get("_id")
        post_owner = post.get("created_by") or post.get("user_id")
        
        if str(user_id) != str(post_owner):
            raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        
        # Delete the post
        result = posts_collection.delete_one({"_id": ObjectId(post_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Post not found")
        
        return {"status": "success", "message": "Post deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-image")
async def upload_image(
    image_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Upload an image (base64 or URL)
    Expected format: {"image": "base64_string" or "url"}
    """
    try:
        image = image_data.get("image")
        if not image:
            raise HTTPException(status_code=400, detail="No image provided")
        
        # Return the image data
        # The image will be stored as is (base64 or URL)
        return {"status": "success", "image": image}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))