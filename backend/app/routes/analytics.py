from fastapi import APIRouter, Depends, Query
from app.services.dependencies import get_current_user
from app.services.analytics_service import AnalyticsService
from app.services.social_accounts import get_platform_credentials
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.post("/comments/{comment_id}/reply")
async def reply_to_comment(
    comment_id: str,
    message: str = Query(..., min_length=1, max_length=1000),
    platform: str = Query("facebook", pattern="^(facebook|instagram)$"),
    user: dict = Depends(get_current_user)
):
    """Reply to a comment on Facebook or Instagram"""
    try:
        fb_creds = get_platform_credentials(user["_id"], "facebook")
        ig_creds = get_platform_credentials(user["_id"], "instagram")
        analytics_service = AnalyticsService(
            fb_page_id=fb_creds.get("page_id") if fb_creds else None,
            fb_token=fb_creds.get("access_token") if fb_creds else None,
            ig_user_id=ig_creds.get("ig_user_id") if ig_creds else None,
            ig_token=ig_creds.get("access_token") if ig_creds else None,
        )
        return analytics_service.reply_to_comment(comment_id, message, platform)
    except Exception as e:
        logger.error(f"Error in reply_to_comment: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


@router.get("/facebook")
async def get_facebook_analytics(
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """
    Fetch Facebook posts with engagement metrics (likes, comments, shares)
    """
    try:
        fb_creds = get_platform_credentials(user["_id"], "facebook")
        if not fb_creds:
            return {"status": "error", "detail": "Facebook account not connected"}
        analytics_service = AnalyticsService(
            fb_page_id=fb_creds.get("page_id"),
            fb_token=fb_creds.get("access_token"),
            ig_user_id=None,
            ig_token=None,
        )
        result = analytics_service.get_facebook_posts(limit)
        return result
    except Exception as e:
        logger.error(f"Error in get_facebook_analytics: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


@router.get("/instagram")
async def get_instagram_analytics(
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """
    Fetch Instagram media with engagement metrics (likes, comments)
    """
    try:
        ig_creds = get_platform_credentials(user["_id"], "instagram")
        if not ig_creds:
            return {"status": "error", "detail": "Instagram account not connected"}
        analytics_service = AnalyticsService(
            fb_page_id=None,
            fb_token=None,
            ig_user_id=ig_creds.get("ig_user_id"),
            ig_token=ig_creds.get("access_token"),
        )
        result = analytics_service.get_instagram_media(limit)
        return result
    except Exception as e:
        logger.error(f"Error in get_instagram_analytics: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


@router.get("/all")
async def get_all_analytics(
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """
    Fetch media from both Facebook and Instagram with engagement metrics
    Returns combined list sorted by date
    """
    try:
        fb_creds = get_platform_credentials(user["_id"], "facebook")
        ig_creds = get_platform_credentials(user["_id"], "instagram")
        analytics_service = AnalyticsService(
            fb_page_id=fb_creds.get("page_id") if fb_creds else None,
            fb_token=fb_creds.get("access_token") if fb_creds else None,
            ig_user_id=ig_creds.get("ig_user_id") if ig_creds else None,
            ig_token=ig_creds.get("access_token") if ig_creds else None,
        )
        result = analytics_service.get_all_media(limit)
        return result
    except Exception as e:
        logger.error(f"Error in get_all_analytics: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


@router.get("/comments/{post_id}")
async def get_post_comments(
    post_id: str,
    platform: str = Query("facebook", regex="^(facebook|instagram)$"),
    user: dict = Depends(get_current_user)
):
    """
    Fetch comments for a specific post/media
    """
    try:
        fb_creds = get_platform_credentials(user["_id"], "facebook")
        ig_creds = get_platform_credentials(user["_id"], "instagram")
        analytics_service = AnalyticsService(
            fb_page_id=fb_creds.get("page_id") if fb_creds else None,
            fb_token=fb_creds.get("access_token") if fb_creds else None,
            ig_user_id=ig_creds.get("ig_user_id") if ig_creds else None,
            ig_token=ig_creds.get("access_token") if ig_creds else None,
        )
        result = analytics_service.get_post_comments(post_id, platform)
        return result
    except Exception as e:
        logger.error(f"Error in get_post_comments: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
