from datetime import datetime
from typing import Optional
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
import logging
from app.services.dependencies import get_current_user
from app.services.database import db
from pydantic import BaseModel, Field

router = APIRouter(prefix="/analytics/facebook", tags=["Facebook Analytics"])
logger = logging.getLogger(__name__)

automation_settings_collection = db["automation_settings"]


class AutoReplyToggle(BaseModel):
    enabled: bool


class AutoReplySettings(BaseModel):
    reply_tone: Literal["professional", "friendly", "casual"] = "professional"
    reply_delay_minutes: int = Field(default=0, ge=0, le=30)
    reply_mode: Literal["ai", "template"] = "ai"
    dm_enabled: Optional[bool] = None
    dm_reply_tone: Optional[Literal["professional", "friendly", "casual"]] = None
    dm_reply_delay_minutes: Optional[int] = Field(default=None, ge=0, le=30)
    dm_reply_mode: Optional[Literal["ai", "template"]] = None


@router.post("/auto-reply/toggle")
def toggle_auto_reply(payload: AutoReplyToggle, user: dict = Depends(get_current_user)):
    """Enable or disable auto-reply for Facebook comments"""
    try:
        user_id = str(user["_id"])
        
        automation_settings_collection.update_one(
            {"user_id": user_id, "platform": "facebook"},
            {
                "$set": {
                    "enabled": payload.enabled,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "status": "success",
            "message": "Facebook auto-reply setting updated"
        }
            
    except Exception as exc:
        logger.error(f"Failed to toggle Facebook auto-reply: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/auto-reply/settings")
def update_auto_reply_settings(payload: AutoReplySettings, user: dict = Depends(get_current_user)):
    """Update auto-reply settings for Facebook (tone, delay)"""
    try:
        user_id = str(user["_id"])
        
        automation_settings_collection.update_one(
            {"user_id": user_id, "platform": "facebook"},
            {
                "$set": {
                    "reply_tone": payload.reply_tone,
                    "reply_delay_minutes": payload.reply_delay_minutes,
                    "delay_seconds": payload.reply_delay_minutes * 60,
                    "reply_mode": payload.reply_mode,
                    "dm_enabled": payload.dm_enabled,
                    "dm_reply_tone": payload.dm_reply_tone,
                    "dm_reply_delay_minutes": payload.dm_reply_delay_minutes,
                    "dm_reply_mode": payload.dm_reply_mode,
                    "tone": payload.reply_tone,
                    "updated_at": datetime.utcnow()
                }
            },
            upsert=True
        )
        
        return {
            "status": "success",
            "message": "Facebook auto-reply settings updated"
        }
            
    except Exception as exc:
        logger.error(f"Failed to update Facebook auto-reply settings: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/auto-reply/settings")
def get_auto_reply_settings(user: dict = Depends(get_current_user)):
    """Get current auto-reply settings for Facebook"""
    try:
        user_id = str(user["_id"])
        
        settings = automation_settings_collection.find_one({
            "user_id": user_id,
            "platform": "facebook"
        })
        
        if not settings:
            # Return defaults
            default_settings = {
                "auto_reply_enabled": False,
                "reply_tone": "professional",
                "reply_delay_minutes": 0,
                "reply_mode": "ai",
                "dm_enabled": False,
                "dm_reply_tone": "professional",
                "dm_reply_delay_minutes": 0,
                "dm_reply_mode": "ai",
            }
            return {
                "status": "success",
                "settings": default_settings
            }
        
        return {
            "status": "success",
            "settings": {
                "auto_reply_enabled": settings.get("enabled", False),
                "reply_tone": settings.get("reply_tone", "professional"),
                "reply_delay_minutes": settings.get("reply_delay_minutes", 0),
                "reply_mode": settings.get("reply_mode", "ai"),
                "dm_enabled": settings.get("dm_enabled", settings.get("enabled", False)),
                "dm_reply_tone": settings.get("dm_reply_tone") or settings.get("reply_tone", "professional"),
                "dm_reply_delay_minutes": settings.get("dm_reply_delay_minutes", settings.get("reply_delay_minutes", 0)),
                "dm_reply_mode": settings.get("dm_reply_mode") or settings.get("reply_mode", "ai"),
            }
        }
        
    except Exception as exc:
        logger.error(f"Failed to get Facebook auto-reply settings: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))
