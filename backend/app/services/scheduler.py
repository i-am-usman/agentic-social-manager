from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timezone
import pytz
from app.services.database import (
    posts_collection,
    poll_cursor_state_collection,
    users_collection,
    automation_settings_collection,
)
from app.services.fb_service import FacebookService
from app.services.insta_service import InstaService
from app.services.linkedin_service import LinkedInService
from app.services.image_service import ImageService
from app.services.automation_service import AutomationService
from app.services.decision_engine_service import DecisionEngineService
from app.services.automation_dispatch_service import AutomationDispatchService
from app.services.social_accounts import get_platform_credentials
from pymongo.errors import PyMongoError
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging

logger = logging.getLogger(__name__)

# Pakistani Standard Time (UTC+5)
PAKISTAN_TZ = pytz.timezone('Asia/Karachi')

scheduler = BackgroundScheduler(
    timezone=PAKISTAN_TZ,
    job_defaults={
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 45,
    },
)


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
            
    except PyMongoError as e:
        logger.warning(f"Mongo transient error in process_scheduled_posts: {e}")
    except Exception as e:
        logger.error(f"Error in process_scheduled_posts: {e}")


# ========== AUTOMATION POLLING JOBS ==========

def _should_poll_now(cursor_state: dict) -> bool:
    """Check if it's time to poll based on cursor state"""
    if not cursor_state:
        return True
    
    next_poll_at = cursor_state.get("next_poll_at")
    if not next_poll_at:
        return True
    
    return datetime.utcnow() >= next_poll_at.replace(tzinfo=None)


def _poll_user_automation(service: AutomationService, user_id: str, event_type: str, platform: str) -> int:
    """Poll a single user's platform/event channel and return stored event count."""
    if event_type == "comment_created" and platform == "facebook":
        return service.fetch_facebook_comments(user_id)
    if event_type == "comment_created" and platform == "instagram":
        return service.fetch_instagram_comments(user_id)
    if event_type == "dm_received" and platform == "facebook":
        return service.fetch_facebook_dms(user_id)
    if event_type == "dm_received" and platform == "instagram":
        return service.fetch_instagram_dms(user_id)
    return 0


def poll_automation_for_all_users(event_type: str, platform: str, force: bool = False):
    """Generic polling job that fetches all users and polls each one"""
    try:
        logger.info(f"Starting automation polling: {platform} {event_type}")
        
        # Get all users who have automation enabled for this platform
        enabled_settings = list(
            automation_settings_collection.find({
                "platform": platform,
                "enabled": True
            })
        )
        
        total_events = 0
        users_considered = len(enabled_settings)
        users_polled = 0
        users_skipped_not_due = 0
        users_skipped_no_credentials = 0
        poll_targets = []
        
        for settings in enabled_settings:
            user_id = settings["user_id"]
            
            # Check if we should poll based on cursor state
            cursor_state = poll_cursor_state_collection.find_one({
                "user_id": user_id,
                "platform": platform,
                "channel_type": event_type,
            })
            
            if not force and not _should_poll_now(cursor_state):
                logger.debug(f"Skipping {platform}/{event_type} for user {user_id} - not time yet")
                users_skipped_not_due += 1
                continue
            
            # Get user's social credentials
            creds = get_platform_credentials(user_id, platform)
            if not creds:
                logger.warning(f"User {user_id} has no {platform} credentials, skipping")
                users_skipped_no_credentials += 1
                continue

            users_polled += 1
            
            # Create AutomationService and poll
            service = AutomationService(
                fb_page_id=creds.get("page_id") if platform == "facebook" else None,
                fb_token=creds.get("access_token") if platform == "facebook" else None,
                ig_user_id=creds.get("ig_user_id") if platform == "instagram" else None,
                ig_token=creds.get("access_token") if platform == "instagram" else None,
            )
            
            poll_targets.append((user_id, service))

        if poll_targets:
            max_workers = min(8, len(poll_targets))
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                future_to_user_id = {
                    executor.submit(_poll_user_automation, service, user_id, event_type, platform): user_id
                    for user_id, service in poll_targets
                }
                for future in as_completed(future_to_user_id):
                    polled_user_id = future_to_user_id[future]
                    try:
                        count = future.result()
                        total_events += int(count or 0)
                    except Exception as e:
                        logger.error(
                            f"Error polling {platform}/{event_type} for user {polled_user_id}: {e}",
                            exc_info=True,
                        )
        
        logger.info(f"Automation polling complete: {platform} {event_type} - {total_events} events stored")
        return {
            "platform": platform,
            "event_type": event_type,
            "events_stored": total_events,
            "users_considered": users_considered,
            "users_polled": users_polled,
            "users_skipped_not_due": users_skipped_not_due,
            "users_skipped_no_credentials": users_skipped_no_credentials,
        }
        
    except PyMongoError as e:
        logger.warning(f"Mongo transient error in poll_automation_for_all_users ({platform}/{event_type}): {e}")
        return {
            "platform": platform,
            "event_type": event_type,
            "events_stored": 0,
            "users_considered": 0,
            "users_polled": 0,
            "users_skipped_not_due": 0,
            "users_skipped_no_credentials": 0,
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Error in poll_automation_for_all_users: {e}", exc_info=True)
        return {
            "platform": platform,
            "event_type": event_type,
            "events_stored": 0,
            "users_considered": 0,
            "users_polled": 0,
            "users_skipped_not_due": 0,
            "users_skipped_no_credentials": 0,
            "error": str(e),
        }


def poll_facebook_comments(force: bool = False):
    """Poll Facebook comments on a short cadence (if due based on cursor state)."""
    return poll_automation_for_all_users("comment_created", "facebook", force=force)


def poll_instagram_comments(force: bool = False):
    """Poll Instagram comments on a short cadence (if due based on cursor state)."""
    return poll_automation_for_all_users("comment_created", "instagram", force=force)


def poll_facebook_dms(force: bool = False):
    """Poll Facebook DMs on a short cadence (if due based on cursor state)."""
    return poll_automation_for_all_users("dm_received", "facebook", force=force)


def poll_instagram_dms(force: bool = False):
    """Poll Instagram DMs on a short cadence (if due based on cursor state)."""
    return poll_automation_for_all_users("dm_received", "instagram", force=force)


def process_automation_decisions():
    """Convert pending events into guarded reply actions."""
    try:
        engine = DecisionEngineService()
        summary = engine.process_pending_events(batch_size=200)
        logger.info(
            "Decision engine: seen=%s pending=%s skipped=%s failed=%s",
            summary.get("events_seen", 0),
            summary.get("actions_pending", 0),
            summary.get("actions_skipped", 0),
            summary.get("actions_failed", 0),
        )
        return summary
    except PyMongoError as e:
        logger.warning(f"Mongo transient error in process_automation_decisions: {e}")
        return {
            "events_seen": 0,
            "actions_pending": 0,
            "actions_skipped": 0,
            "actions_failed": 0,
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Error in process_automation_decisions: {e}", exc_info=True)
        return {
            "events_seen": 0,
            "actions_pending": 0,
            "actions_skipped": 0,
            "actions_failed": 1,
            "error": str(e),
        }


def process_automation_dispatch():
    """Send pending actions to platform APIs and update action lifecycle."""
    try:
        dispatcher = AutomationDispatchService()
        summary = dispatcher.process_pending_actions(batch_size=200)
        logger.info(
            "Dispatch engine: seen=%s sent=%s failed=%s skipped=%s",
            summary.get("seen", 0),
            summary.get("sent", 0),
            summary.get("failed", 0),
            summary.get("skipped", 0),
        )
        return summary
    except PyMongoError as e:
        logger.warning(f"Mongo transient error in process_automation_dispatch: {e}")
        return {
            "seen": 0,
            "sent": 0,
            "failed": 0,
            "skipped": 0,
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Error in process_automation_dispatch: {e}", exc_info=True)
        return {
            "seen": 0,
            "sent": 0,
            "failed": 1,
            "skipped": 0,
            "error": str(e),
        }


def process_automation_retries():
    """Requeue failed actions whose retry window has opened."""
    try:
        dispatcher = AutomationDispatchService()
        summary = dispatcher.enqueue_retryable_actions(batch_size=300, max_retries=5)
        logger.info(
            "Retry engine: seen=%s requeued=%s dead_lettered=%s",
            summary.get("seen", 0),
            summary.get("requeued", 0),
            summary.get("dead_lettered", 0),
        )
        return summary
    except PyMongoError as e:
        logger.warning(f"Mongo transient error in process_automation_retries: {e}")
        return {
            "seen": 0,
            "requeued": 0,
            "dead_lettered": 0,
            "error": str(e),
        }
    except Exception as e:
        logger.error(f"Error in process_automation_retries: {e}", exc_info=True)
        return {
            "seen": 0,
            "requeued": 0,
            "dead_lettered": 0,
            "error": str(e),
        }




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
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    
    # Add automation polling jobs on a short scheduler cadence; cursor_state gates actual poll timing.
    scheduler.add_job(
        poll_facebook_comments,
        'interval',
        seconds=15,
        id='poll_facebook_comments',
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    
    scheduler.add_job(
        poll_instagram_comments,
        'interval',
        seconds=15,
        id='poll_instagram_comments',
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    
    scheduler.add_job(
        poll_facebook_dms,
        'interval',
        seconds=30,
        id='poll_facebook_dms',
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    
    scheduler.add_job(
        poll_instagram_dms,
        'interval',
        seconds=30,
        id='poll_instagram_dms',
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )

    scheduler.add_job(
        process_automation_decisions,
        'interval',
        seconds=15,
        id='process_automation_decisions',
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )

    scheduler.add_job(
        process_automation_dispatch,
        'interval',
        seconds=15,
        id='process_automation_dispatch',
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )

    scheduler.add_job(
        process_automation_retries,
        'interval',
        seconds=30,
        id='process_automation_retries',
        replace_existing=True,
        coalesce=True,
        max_instances=1,
    )
    
    scheduler.start()
    logger.info("APScheduler started with:")
    logger.info("  - process_scheduled_posts (check every 1 minute)")
    logger.info("  - poll_facebook_comments (check every 15 seconds, dynamic poll interval: 30-60 sec)")
    logger.info("  - poll_instagram_comments (check every 15 seconds, dynamic poll interval: 30-60 sec)")
    logger.info("  - poll_facebook_dms (check every 30 seconds, dynamic poll interval: 1-2 min)")
    logger.info("  - poll_instagram_dms (check every 30 seconds, dynamic poll interval: 1-2 min)")
    logger.info("  - process_automation_decisions (check every 15 seconds)")
    logger.info("  - process_automation_dispatch (check every 15 seconds)")
    logger.info("  - process_automation_retries (check every 30 seconds)")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shut down")
