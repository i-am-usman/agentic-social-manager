from fastapi import APIRouter, Depends, HTTPException
from app.services.ai_service import AIService
from app.services.dependencies import get_current_user
from app.services.database import posts_collection
from app.services.image_service import ImageService
from app.schemas.post_schema import PostCreate, PostPublic, PublishRequest, RescheduleRequest, EditPostRequest
from app.services.fb_service import FacebookService
from app.services.insta_service import InstaService
from app.services.social_accounts import get_platform_credentials
from app.services.job_tracker import job_tracker
from app.services.media_validator import validate_carousel_aspect_ratios, format_aspect_ratio_error
from datetime import datetime, timezone
import pytz
from bson import ObjectId
from typing import List
import logging
import threading

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


@router.get("/status/{job_id}")
async def get_publish_status(job_id: str):
    """Get the current status of a publish job"""
    job = job_tracker.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return job


def _execute_publish_worker(job_id: str, payload_dict: dict, user: dict):
    """Background worker that executes the actual publishing"""
    try:
        user_id = str(user["_id"])
        platforms = [p.lower() for p in payload_dict["platforms"]]
        
        job_tracker.update_job(job_id, status="preparing", progress=10, message="Preparing media...")
        
        fb_creds = get_platform_credentials(user_id, "facebook")
        ig_creds = get_platform_credentials(user_id, "instagram")

        post_doc = None
        if payload_dict.get("post_id"):
            try:
                post_doc = posts_collection.find_one({"_id": ObjectId(payload_dict["post_id"])})
            except Exception:
                job_tracker.fail_job(job_id, "Invalid post_id")
                return

        caption = payload_dict.get("caption")
        hashtags = payload_dict.get("hashtags") or []
        image = payload_dict.get("image")
        media = payload_dict.get("media") or []

        if post_doc:
            caption = post_doc.get("caption") or post_doc.get("content")
            hashtags = post_doc.get("hashtags") or []
            
            if post_doc.get("media"):
                media = post_doc.get("media")
            else:
                image = post_doc.get("image")

        media_to_publish = []
        if media:
            media_to_publish = media if isinstance(media, list) else [media]
        elif image:
            media_to_publish = [{"type": "image", "url": image, "order": 0}]

        caption_text = _build_caption(caption or "", hashtags)

        results = {}
        completed = 0
        total = len(platforms)
        
        # Publish to Facebook
        if "facebook" in platforms:
            job_tracker.update_job(
                job_id, 
                status="publishing", 
                progress=20 + int(40 * completed / total), 
                message="Publishing to Facebook...",
                platform_status={"facebook": "publishing"}
            )
            try:
                fb_service = FacebookService(
                    page_id=fb_creds.get("page_id"),
                    access_token=fb_creds.get("access_token"),
                )
                
                if not media_to_publish:
                    results["facebook"] = fb_service.publish_text(caption_text)
                else:
                    images = [m for m in media_to_publish if m.get("type") != "video"]
                    videos = [m for m in media_to_publish if m.get("type") == "video"]
                    
                    fb_results = []
                    
                    if videos:
                        for vidx, video in enumerate(videos):
                            video_url = video.get("url")
                            video_caption = caption_text
                            if images and len(videos) > 1:
                                video_caption = f"{caption_text}\n[Video {vidx + 1}/{len(videos)}]"
                            
                            video_result = fb_service.publish_video(video_url, video_caption)
                            fb_results.append(("video", video_result))
                    
                    if images:
                        if len(images) == 1:
                            media_url = images[0].get("url")
                            img_caption = caption_text
                            if videos:
                                img_caption = f"{caption_text}\n(With {len(videos)} video)" if len(videos) == 1 else f"{caption_text}\n(With {len(videos)} videos)"
                            
                            image_result = fb_service.publish_photo(media_url, img_caption)
                            fb_results.append(("image", image_result))
                        else:
                            image_urls = [m.get("url") for m in images]
                            img_caption = caption_text
                            if videos:
                                img_caption = f"{caption_text}\n(With {len(videos)} video)" if len(videos) == 1 else f"{caption_text}\n(With {len(videos)} videos)"
                            
                            album_result = fb_service.publish_album(image_urls, img_caption)
                            fb_results.append(("images", album_result))
                    
                    if fb_results:
                        all_success = all(r[1].get("status") == "success" for r in fb_results)
                        
                        if all_success:
                            results["facebook"] = {
                                "status": "success",
                                "data": {"posts": [(media_type, r.get("data")) for media_type, r in fb_results]}
                            }
                        else:
                            failed = [media_type for media_type, r in fb_results if r.get("status") != "success"]
                            results["facebook"] = {
                                "status": "partial",
                                "data": {"posts": [(media_type, r.get("data")) for media_type, r in fb_results]},
                                "detail": f"Failed to publish: {', '.join(failed)}"
                            }
                    else:
                        results["facebook"] = {"status": "error", "detail": "No valid media to publish to Facebook"}

                # Update platform status based on actual result
                fb_result = results.get("facebook", {})
                if fb_result.get("status") == "success":
                    job_tracker.update_job(job_id, platform_status={"facebook": "completed"})
                else:
                    error_detail = fb_result.get("detail", "Unknown error")
                    logger.error(f"Facebook publish failed: {error_detail}")
                    job_tracker.update_job(job_id, platform_status={"facebook": "failed"})
            except Exception as e:
                logger.error(f"Error publishing to Facebook: {str(e)}")
                results["facebook"] = {"status": "error", "detail": str(e)}
                job_tracker.update_job(job_id, platform_status={"facebook": "failed"})
            
            completed += 1

        # Publish to Instagram
        if "instagram" in platforms:
            job_tracker.update_job(
                job_id, 
                status="publishing", 
                progress=20 + int(40 * completed / total), 
                message="Publishing to Instagram...",
                platform_status={"instagram": "publishing"}
            )
            try:
                insta_service = InstaService(
                    ig_user_id=ig_creds.get("ig_user_id"),
                    access_token=ig_creds.get("access_token"),
                    job_tracker=job_tracker,
                    job_id=job_id
                )
                
                final_media = []
                for media_item in media_to_publish:
                    media_url = media_item.get("url") if isinstance(media_item, dict) else media_item
                    media_type = media_item.get("type", "image") if isinstance(media_item, dict) else "image"
                    
                    if not media_url or media_url.startswith("data:"):
                        results["instagram"] = {"status": "error", "detail": "Invalid media URL"}
                        break
                    
                    final_media.append({
                        "url": media_url,
                        "type": media_type,
                        "order": media_item.get("order", 0) if isinstance(media_item, dict) else 0
                    })
                
                if not results.get("instagram"):
                    if len(final_media) == 1:
                        media_item = final_media[0]
                        media_type = media_item.get("type", "image")
                        
                        if media_type == "video":
                            job_tracker.update_job(job_id, message="Processing Instagram reel (this may take 1-2 minutes)...")
                            results["instagram"] = insta_service.publish_reel(media_item["url"], caption_text)
                        else:
                            results["instagram"] = insta_service.publish_photo(media_item["url"], caption_text)
                    else:
                        # Multiple items - validate aspect ratios for carousel
                        job_tracker.update_job(job_id, message="Validating media aspect ratios...")
                        validation = validate_carousel_aspect_ratios(final_media)
                        
                        if not validation.get("valid"):
                            # Aspect ratios don't match - provide detailed error
                            error_msg = format_aspect_ratio_error(validation)
                            logger.warning(f"Instagram carousel aspect ratio validation failed: {error_msg}")
                            
                            # Use fallback: publish first item only with warning
                            job_tracker.update_job(
                                job_id, 
                                message="⚠️ Aspect ratios don't match. Publishing first item only..."
                            )
                            
                            first_item = final_media[0]
                            if first_item.get("type") == "video":
                                results["instagram"] = insta_service.publish_reel(first_item["url"], caption_text)
                            else:
                                results["instagram"] = insta_service.publish_photo(first_item["url"], caption_text)
                            
                            # Add warning to result
                            if results["instagram"].get("status") == "success":
                                results["instagram"]["warning"] = (
                                    f"Only first item published. {validation.get('message', 'Aspect ratios must match for carousels.')}"
                                )
                        else:
                            # Validation passed - proceed with carousel
                            job_tracker.update_job(job_id, message=f"Creating Instagram carousel with {len(final_media)} items...")
                            results["instagram"] = insta_service.publish_carousel(final_media, caption_text)

                # Update platform status based on actual result
                ig_result = results.get("instagram", {})
                if ig_result.get("status") == "success":
                    job_tracker.update_job(job_id, platform_status={"instagram": "completed"})
                else:
                    error_detail = ig_result.get("detail", "Unknown error")
                    logger.error(f"Instagram publish failed: {error_detail}")
                    job_tracker.update_job(job_id, platform_status={"instagram": "failed"})
            except Exception as e:
                logger.error(f"Error publishing to Instagram: {str(e)}", exc_info=True)
                results["instagram"] = {"status": "error", "detail": str(e)}
                job_tracker.update_job(job_id, platform_status={"instagram": "failed"})
            
            completed += 1

        if post_doc:
            any_success = any(
                r.get("status") == "success" 
                for r in (results.get("facebook"), results.get("instagram")) 
                if r
            )
            
            update = {
                "status": "published" if any_success else "failed",
                "published_at": datetime.now(PAKISTAN_TZ) if any_success else None,
                "platform_results": results,
            }
            posts_collection.update_one({"_id": post_doc["_id"]}, {"$set": update})

        failed_platforms = [
            p for p in platforms 
            if results.get(p, {}).get("status") != "success"
        ]
        
        if failed_platforms:
            final_result = {
                "status": "partial",
                "message": f"Published to {len(platforms) - len(failed_platforms)}/{len(platforms)} platforms",
                "results": results,
                "failed_platforms": failed_platforms
            }
        else:
            final_result = {"status": "success", "results": results}
        
        job_tracker.complete_job(job_id, final_result)
        
    except Exception as e:
        logger.error(f"Error in publish worker: {str(e)}", exc_info=True)
        job_tracker.fail_job(job_id, str(e))


@router.post("/publish")
async def publish_post(payload: PublishRequest, user: dict = Depends(get_current_user)):
    """Start a publishing job and return job ID immediately"""
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
    
    # Instagram requires media
    media_to_check = payload.media or []
    if not media_to_check and payload.image:
        media_to_check = [payload.image]
    
    if "instagram" in platforms and not media_to_check:
        raise HTTPException(status_code=400, detail="Media (images or videos) is required for publishing to Instagram")

    # Create job
    job_id = job_tracker.create_job(user_id)
    
    # Convert payload to dict for thread
    payload_dict = payload.dict()
    
    # Start background worker
    worker_thread = threading.Thread(
        target=_execute_publish_worker,
        args=(job_id, payload_dict, user),
        daemon=True
    )
    worker_thread.start()
    
    return {
        "job_id": job_id,
        "status": "processing",
        "message": "Publishing started. Use /posts/status/{job_id} to check progress."
    }


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