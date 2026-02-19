from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
import pytz
from app.services.database import posts_collection
from app.services.fb_service import FacebookService
from app.services.insta_service import InstaService
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
            
            if not platforms:
                logger.warning(f"Post {post_id} has no platforms selected, skipping")
                continue
            
            image = post.get("image")
            # Instagram requires an image, but Facebook allows text-only posts
            if "instagram" in platforms and not image:
                logger.warning(f"Post {post_id} scheduled for Instagram but has no image, skipping")
                continue
            
            caption = post.get("caption") or post.get("content")
            hashtags = post.get("hashtags") or []
            caption_text = _build_caption(caption or "", hashtags)
            
            results = {}
            
            # Publish to selected platforms
            if "facebook" in platforms:
                try:
                    fb_service = FacebookService()
                    if image:
                        # Publish with image
                        results["facebook"] = fb_service.publish_photo(image, caption_text)
                    else:
                        # Publish text-only
                        results["facebook"] = fb_service.publish_text(caption_text)
                    logger.info(f"Published post {post_id} to Facebook: {results['facebook']}")
                except Exception as e:
                    logger.error(f"Failed to publish post {post_id} to Facebook: {e}")
                    results["facebook"] = {"status": "error", "detail": str(e)}
            
            if "instagram" in platforms:
                try:
                    insta_service = InstaService()
                    results["instagram"] = insta_service.publish_photo(image, caption_text)
                    logger.info(f"Published post {post_id} to Instagram: {results['instagram']}")
                except Exception as e:
                    logger.error(f"Failed to publish post {post_id} to Instagram: {e}")
                    results["instagram"] = {"status": "error", "detail": str(e)}
            
            # Update post status
            posts_collection.update_one(
                {"_id": post_id},
                {
                    "$set": {
                        "status": "published",
                        "published_at": datetime.now(PAKISTAN_TZ),
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
