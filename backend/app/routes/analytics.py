from fastapi import APIRouter, Depends, Query
from app.services.dependencies import get_current_user
from app.services.analytics_service import AnalyticsService
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/facebook")
async def get_facebook_analytics(
    limit: int = Query(25, ge=1, le=100),
    user: dict = Depends(get_current_user)
):
    """
    Fetch Facebook posts with engagement metrics (likes, comments, shares)
    """
    try:
        analytics_service = AnalyticsService()
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
        analytics_service = AnalyticsService()
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
        analytics_service = AnalyticsService()
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
        analytics_service = AnalyticsService()
        result = analytics_service.get_post_comments(post_id, platform)
        return result
    except Exception as e:
        logger.error(f"Error in get_post_comments: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
