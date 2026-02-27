from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, Any
import logging
from datetime import datetime
from app.services.dependencies import get_current_user
from app.services.social_accounts import get_platform_credentials
from app.services.linkedin_service import LinkedInService
from app.services.comment_reply_service import CommentReplyService
from app.services.database import db
from pydantic import BaseModel

router = APIRouter(prefix="/analytics/linkedin", tags=["LinkedIn Analytics"])
logger = logging.getLogger(__name__)

linkedin_posts_collection = db["linkedin_posts"]


class AutoReplyToggle(BaseModel):
    enabled: bool


class AutoReplySettings(BaseModel):
    reply_tone: str = "professional"
    reply_delay_minutes: int = 5


@router.get("/posts")
def get_linkedin_posts(user: dict = Depends(get_current_user)):
    """
    Fetch recent LinkedIn posts with analytics
    Requires: Community Management API + r_ugc permission
    """
    try:
        user_id = str(user["_id"])
        li_creds = get_platform_credentials(user_id, "linkedin")
        
        if not li_creds:
            raise HTTPException(status_code=400, detail="LinkedIn not connected")
        
        linkedin_service = LinkedInService(
            user_id=li_creds.get("linkedin_user_id"),
            access_token=li_creds.get("access_token"),
            organization_id=li_creds.get("linkedin_organization_id")
        )
        
        # Fetch posts
        result = linkedin_service.fetch_posts(limit=20)
        
        if result.get("status") != "success":
            return {
                "status": "error",
                "detail": result.get("detail", "Failed to fetch posts"),
                "posts": []
            }
        
        posts = result.get("posts", [])
        
        # Fetch analytics for Company Page posts
        if li_creds.get("linkedin_organization_id"):
            for post in posts:
                post_id = post.get("post_id")
                analytics_result = linkedin_service.fetch_post_analytics(post_id)
                
                if analytics_result.get("status") == "success":
                    post["analytics"] = {
                        "impressions": analytics_result.get("impressions", 0),
                        "clicks": analytics_result.get("clicks", 0),
                        "likes": analytics_result.get("likes", 0),
                        "comments": analytics_result.get("comments", 0),
                        "shares": analytics_result.get("shares", 0),
                        "engagement_rate": analytics_result.get("engagement_rate", 0),
                    }
                else:
                    post["analytics"] = None
        
        # Store/update posts in database
        for post in posts:
            linkedin_posts_collection.update_one(
                {
                    "user_id": user_id,
                    "post_id": post.get("post_id")
                },
                {
                    "$set": {
                        "text": post.get("text"),
                        "created_at": post.get("created_at"),
                        "media_category": post.get("media_category"),
                        "analytics": post.get("analytics"),
                        "synced_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
        
        return {
            "status": "success",
            "posts": posts,
            "count": len(posts)
        }
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to fetch LinkedIn posts: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/overview")
def get_linkedin_overview(user: dict = Depends(get_current_user)):
    """
    Get overview analytics (total posts, impressions, engagement)
    """
    try:
        user_id = str(user["_id"])
        
        # Aggregate from cached posts
        posts = list(linkedin_posts_collection.find({"user_id": user_id}))
        
        total_posts = len(posts)
        total_impressions = sum(p.get("analytics", {}).get("impressions", 0) for p in posts if p.get("analytics"))
        total_clicks = sum(p.get("analytics", {}).get("clicks", 0) for p in posts if p.get("analytics"))
        total_likes = sum(p.get("analytics", {}).get("likes", 0) for p in posts if p.get("analytics"))
        total_comments = sum(p.get("analytics", {}).get("comments", 0) for p in posts if p.get("analytics"))
        total_shares = sum(p.get("analytics", {}).get("shares", 0) for p in posts if p.get("analytics"))
        
        # Calculate average engagement rate
        engagement_rates = [p.get("analytics", {}).get("engagement_rate", 0) for p in posts if p.get("analytics")]
        avg_engagement = sum(engagement_rates) / len(engagement_rates) if engagement_rates else 0
        
        # Get auto-reply stats
        reply_service = CommentReplyService(user_id)
        reply_history = reply_service.get_reply_history(limit=1000)
        auto_replies_sent = reply_history.get("count", 0) if reply_history.get("status") == "success" else 0
        
        return {
            "status": "success",
            "overview": {
                "total_posts": total_posts,
                "total_impressions": total_impressions,
                "total_clicks": total_clicks,
                "total_likes": total_likes,
                "total_comments": total_comments,
                "total_shares": total_shares,
                "avg_engagement_rate": round(avg_engagement, 2),
                "auto_replies_sent": auto_replies_sent,
            }
        }
        
    except Exception as exc:
        logger.error(f"Failed to get overview: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/comments")
def get_reply_history(user: dict = Depends(get_current_user)):
    """Get auto-reply activity log"""
    try:
        user_id = str(user["_id"])
        reply_service = CommentReplyService(user_id)
        
        result = reply_service.get_reply_history(limit=50)
        
        if result.get("status") == "success":
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("detail", "Failed to fetch reply history"))
            
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to get reply history: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/sync")
def sync_posts_and_analytics(background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """Manually trigger sync of posts and analytics"""
    try:
        # This will run in background
        background_tasks.add_task(_sync_posts_task, str(user["_id"]))
        
        return {
            "status": "success",
            "message": "Sync started in background"
        }
        
    except Exception as exc:
        logger.error(f"Failed to start sync: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


def _sync_posts_task(user_id: str):
    """Background task to sync posts"""
    try:
        li_creds = get_platform_credentials(user_id, "linkedin")
        
        if not li_creds:
            logger.warning(f"User {user_id} has no LinkedIn credentials")
            return
        
        linkedin_service = LinkedInService(
            user_id=li_creds.get("linkedin_user_id"),
            access_token=li_creds.get("access_token"),
            organization_id=li_creds.get("linkedin_organization_id")
        )
        
        result = linkedin_service.fetch_posts(limit=50)
        
        if result.get("status") == "success":
            logger.info(f"Synced {len(result.get('posts', []))} posts for user {user_id}")
        else:
            logger.warning(f"Failed to sync posts for user {user_id}: {result.get('detail')}")
            
    except Exception as exc:
        logger.error(f"Sync task failed for user {user_id}: {exc}", exc_info=True)


@router.post("/auto-reply/toggle")
def toggle_auto_reply(payload: AutoReplyToggle, user: dict = Depends(get_current_user)):
    """Enable or disable auto-reply"""
    try:
        user_id = str(user["_id"])
        reply_service = CommentReplyService(user_id)
        
        result = reply_service.update_user_settings({
            "auto_reply_enabled": payload.enabled
        })
        
        if result.get("status") == "success":
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("detail", "Failed to update settings"))
            
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to toggle auto-reply: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/auto-reply/settings")
def update_auto_reply_settings(payload: AutoReplySettings, user: dict = Depends(get_current_user)):
    """Update auto-reply settings (tone, delay)"""
    try:
        user_id = str(user["_id"])
        reply_service = CommentReplyService(user_id)
        
        result = reply_service.update_user_settings({
            "reply_tone": payload.reply_tone,
            "reply_delay_minutes": payload.reply_delay_minutes
        })
        
        if result.get("status") == "success":
            return result
        else:
            raise HTTPException(status_code=500, detail=result.get("detail", "Failed to update settings"))
            
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to update settings: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/auto-reply/settings")
def get_auto_reply_settings(user: dict = Depends(get_current_user)):
    """Get current auto-reply settings"""
    try:
        user_id = str(user["_id"])
        reply_service = CommentReplyService(user_id)
        
        settings = reply_service.get_user_settings()
        
        return {
            "status": "success",
            "settings": settings
        }
        
    except Exception as exc:
        logger.error(f"Failed to get settings: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/process-comments/{post_urn:path}")
def process_post_comments(post_urn: str, user: dict = Depends(get_current_user)):
    """
    Manually trigger comment processing for a specific post
    """
    try:
        user_id = str(user["_id"])
        li_creds = get_platform_credentials(user_id, "linkedin")
        
        if not li_creds:
            raise HTTPException(status_code=400, detail="LinkedIn not connected")
        
        linkedin_service = LinkedInService(
            user_id=li_creds.get("linkedin_user_id"),
            access_token=li_creds.get("access_token"),
            organization_id=li_creds.get("linkedin_organization_id")
        )
        
        reply_service = CommentReplyService(user_id)
        
        result = reply_service.process_pending_comments(
            linkedin_service=linkedin_service,
            post_urn=post_urn,
            post_title=""
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Failed to process comments: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

