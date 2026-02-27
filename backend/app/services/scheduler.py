from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
import pytz
from app.services.database import posts_collection
from app.services.fb_service import FacebookService
from app.services.insta_service import InstaService
from app.services.linkedin_service import LinkedInService
from app.services.image_service import ImageService
from app.services.social_accounts import get_platform_credentials
import logging

logger = logging.getLogger(__name__)

# Pakistani Standard Time (UTC+5)
PAKISTAN_TZ = pytz.timezone('Asia/Karachi')

scheduler = BackgroundScheduler(timezone=PAKISTAN_TZ)


def _normalize_hashtags(hashtags):
    normalized = []
    for tag in hashtags:
        if not tag:
            continue
        normalized.append(tag if tag.startswith("#") else f"#{tag}")
    return normalized


def _build_caption(caption, hashtags):
    caption_text = caption or ""
    hashtag_text = " ".join(_normalize_hashtags(hashtags))
    if caption_text and hashtag_text:
        return f"{caption_text}\n\n{hashtag_text}"
    return caption_text or hashtag_text


def process_scheduled_posts():
    """Check for scheduled posts that are due and publish them"""
    try:
        # Get current time in Pakistani timezone
        now = datetime.now(PAKISTAN_TZ)
        logger.info(f"Checking for scheduled posts at {now.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        
        # Find posts with status="scheduled" and scheduled_at <= now
        due_posts = posts_collection.find({
            "status": "scheduled",
            "scheduled_at": {"$lte": now}
        })
        
        for post in due_posts:
            post_id = post["_id"]
            platforms = post.get("platforms", [])
            user_id = str(post.get("created_by") or post.get("user_id") or "")
            
            if not platforms:
                logger.warning(f"Post {post_id} has no platforms selected, skipping")
                continue
            
            # Extract media - support both old 'image' field and new 'media' array
            image = post.get("image")
            media = post.get("media") or []
            
            # If no direct image, try to extract from media array
            if not image and media:
                # Get first image from media array
                for media_item in media:
                    if isinstance(media_item, dict) and media_item.get("type") in ["image", "photo"]:
                        image = media_item.get("url")
                        break
            
            # Instagram requires an image, but Facebook allows text-only posts
            if "instagram" in platforms and not image:
                logger.warning(f"Post {post_id} scheduled for Instagram but has no image, skipping")
                continue
            
            caption = post.get("caption") or post.get("content")
            hashtags = post.get("hashtags") or []
            caption_text = _build_caption(caption or "", hashtags)
            
            results = {}
            any_success = False
            
            # Publish to selected platforms
            if "facebook" in platforms:
                try:
                    fb_creds = get_platform_credentials(user_id, "facebook") if user_id else None
                    if not fb_creds:
                        results["facebook"] = {"status": "error", "detail": "Facebook account not connected"}
                        logger.warning(f"Post {post_id} has no Facebook credentials, skipping")
                    else:
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
                        logger.info(f"Published post {post_id} to Facebook: {results['facebook']}")
                        if results["facebook"].get("status") == "success":
                            any_success = True
                except Exception as e:
                    logger.error(f"Failed to publish post {post_id} to Facebook: {e}")
                    results["facebook"] = {"status": "error", "detail": str(e)}
            
            if "instagram" in platforms:
                try:
                    ig_creds = get_platform_credentials(user_id, "instagram") if user_id else None
                    if not ig_creds:
                        results["instagram"] = {"status": "error", "detail": "Instagram account not connected"}
                        logger.warning(f"Post {post_id} has no Instagram credentials, skipping")
                        raise ValueError("Instagram account not connected")

                    insta_service = InstaService(
                        ig_user_id=ig_creds.get("ig_user_id"),
                        access_token=ig_creds.get("access_token"),
                    )
                    
                    # If image is base64, upload to imgbb first to get public URL
                    final_image = image
                    if not final_image:
                        logger.error(f"Post {post_id} scheduled for Instagram but image is missing")
                        results["instagram"] = {"status": "error", "detail": "Image required for Instagram"}
                        continue
                    
                    if ImageService.is_base64(final_image):
                        logger.info(f"Converting base64 image to public URL for Instagram post {post_id}")
                        upload_result = ImageService.upload_base64_to_imgbb(final_image)
                        if upload_result["status"] == "success":
                            final_image = upload_result["url"]
                            logger.info(f"Base64 image converted to: {final_image}")
                        else:
                            logger.error(f"Failed to upload image for Instagram: {upload_result['detail']}")
                            results["instagram"] = {"status": "error", "detail": f"Image upload failed: {upload_result['detail']}"}
                            continue
                    else:
                        logger.info(f"Using existing image URL for Instagram: {final_image}")
                    
                    logger.info(f"Posting to Instagram with image: {final_image}")
                    results["instagram"] = insta_service.publish_photo(final_image, caption_text)
                    logger.info(f"Published post {post_id} to Instagram: {results['instagram']}")
                    if results["instagram"].get("status") == "success":
                        any_success = True
                except Exception as e:
                    logger.error(f"Failed to publish post {post_id} to Instagram: {e}", exc_info=True)
                    results["instagram"] = {"status": "error", "detail": str(e)}
            
            # Publish to LinkedIn Personal
            if "linkedin-personal" in platforms:
                try:
                    li_personal_creds = get_platform_credentials(user_id, "linkedin-personal") if user_id else None
                    if not li_personal_creds:
                        results["linkedin-personal"] = {"status": "error", "detail": "LinkedIn Personal account not connected"}
                        logger.warning(f"Post {post_id} has no LinkedIn Personal credentials, skipping")
                    else:
                        linkedin_service = LinkedInService(
                            user_id=li_personal_creds.get("linkedin_user_id"),
                            access_token=li_personal_creds.get("access_token"),
                        )
                        if image:
                            # Publish with image
                            results["linkedin-personal"] = linkedin_service.publish_photo([image], caption_text)
                        else:
                            # Publish text-only
                            results["linkedin-personal"] = linkedin_service.publish_text(caption_text)
                        logger.info(f"Published post {post_id} to LinkedIn Personal: {results['linkedin-personal']}")
                        if results["linkedin-personal"].get("status") == "success":
                            any_success = True
                except Exception as e:
                    logger.error(f"Failed to publish post {post_id} to LinkedIn Personal: {e}", exc_info=True)
                    results["linkedin-personal"] = {"status": "error", "detail": str(e)}
            
            # Publish to LinkedIn Company
            if "linkedin-company" in platforms:
                try:
                    li_company_creds = get_platform_credentials(user_id, "linkedin-company") if user_id else None
                    if not li_company_creds:
                        results["linkedin-company"] = {"status": "error", "detail": "LinkedIn Company account not connected"}
                        logger.warning(f"Post {post_id} has no LinkedIn Company credentials, skipping")
                    else:
                        linkedin_service = LinkedInService(
                            user_id=li_company_creds.get("linkedin_user_id"),
                            access_token=li_company_creds.get("access_token"),
                            organization_id=li_company_creds.get("linkedin_organization_id"),
                        )
                        if image:
                            # Publish with image
                            results["linkedin-company"] = linkedin_service.publish_photo([image], caption_text)
                        else:
                            # Publish text-only
                            results["linkedin-company"] = linkedin_service.publish_text(caption_text)
                        logger.info(f"Published post {post_id} to LinkedIn Company: {results['linkedin-company']}")
                        if results["linkedin-company"].get("status") == "success":
                            any_success = True
                except Exception as e:
                    logger.error(f"Failed to publish post {post_id} to LinkedIn Company: {e}", exc_info=True)
                    results["linkedin-company"] = {"status": "error", "detail": str(e)}
            
            # Update post status
            status = "published" if any_success else "draft"
            published_at = datetime.now(PAKISTAN_TZ) if any_success else None
            posts_collection.update_one(
                {"_id": post_id},
                {
                    "$set": {
                        "status": status,
                        "published_at": published_at,
                        "platform_results": results
                    }
                }
            )
            
            logger.info(f"Successfully processed scheduled post {post_id}")
            
    except Exception as e:
        logger.error(f"Error in process_scheduled_posts: {e}")


def start_scheduler():
    """Start the background scheduler"""
    if scheduler.running:
        logger.info("Scheduler already running")
        return
    
    # Add job to check for scheduled posts every minute
    scheduler.add_job(
        process_scheduled_posts,
        'interval',
        minutes=1,
        id='process_scheduled_posts',
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("APScheduler started - checking for scheduled posts every minute")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down")
