from datetime import datetime, timedelta
from typing import Optional, List

def automation_settings_document(
    user_id: str,
    platform: str,
    enabled: bool = False,
    reply_mode: str = "template",
    tone: str = "professional",
    delay_seconds: int = 0,
    max_replies_per_hour: int = 10,
    max_replies_per_day: int = 50,
    quiet_hours: Optional[dict] = None,
    keyword_blacklist: List[str] = None,
    template_reply: str = "Thank you for reaching out! We'll get back to you soon.",
    polling_interval_seconds: int = 120,
    dm_enabled: Optional[bool] = None,
    dm_reply_mode: Optional[str] = None,
    dm_reply_tone: Optional[str] = None,
    dm_reply_delay_minutes: Optional[int] = None,
):
    return {
        "user_id": user_id,
        "platform": platform,
        "enabled": enabled,
        "reply_mode": reply_mode,
        "tone": tone,
        "delay_seconds": delay_seconds,
        "max_replies_per_hour": max_replies_per_hour,
        "max_replies_per_day": max_replies_per_day,
        "quiet_hours": quiet_hours or {
            "enabled": False,
            "start_hour": 0,
            "end_hour": 8,
            "timezone": "UTC+5"
        },
        "keyword_blacklist": keyword_blacklist or [],
        "template_reply": template_reply,
        "polling_interval_seconds": polling_interval_seconds,
        # Optional DM-specific overrides; when None, comment settings are reused.
        "dm_enabled": dm_enabled,
        "dm_reply_mode": dm_reply_mode,
        "dm_reply_tone": dm_reply_tone,
        "dm_reply_delay_minutes": dm_reply_delay_minutes,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

def automation_event_document(
    user_id: str,
    event_type: str,
    platform: str,
    channel_context: dict,
    poll_timestamp: datetime,
    cursor_position: Optional[str] = None,
):
    return {
        "user_id": user_id,
        "event_type": event_type,
        "platform": platform,
        "channel_context": channel_context,
        "poll_timestamp": poll_timestamp,
        "cursor_position": cursor_position,
        "created_at": datetime.utcnow(),
        "processed_at": None,
    }

def automation_action_document(
    user_id: str,
    event_id: str,
    platform: str,
    action_type: str,
    reply_mode_used: str,
    generated_text: str,
    idempotency_key: str,
    system_prompt: Optional[str] = None,
):
    return {
        "user_id": user_id,
        "event_id": event_id,
        "platform": platform,
        "action_type": action_type,
        "reply_mode_used": reply_mode_used,
        "generated_text": generated_text,
        "idempotency_key": idempotency_key,
        "system_prompt": system_prompt,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "sent_at": None,
        "platform_response_id": None,
        "error_code": None,
        "error_message": None,
        "retry_count": 0,
        "next_retry_at": None,
    }

def dm_thread_document(
    user_id: str,
    platform: str,
    conversation_id: str,
    participant_id: str,
    participant_name: Optional[str] = None,
    last_message_at: datetime = None,
):
    return {
        "user_id": user_id,
        "platform": platform,
        "conversation_id": conversation_id,
        "participant_id": participant_id,
        "participant_name": participant_name,
        "is_paused_by_human": False,
        "paused_at": None,
        "last_message_at": last_message_at or datetime.utcnow(),
        "last_automated_reply_at": None,
        "total_automated_replies": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

def poll_cursor_state_document(
    user_id: str,
    platform: str,
    channel_type: str,
    last_cursor: Optional[str] = None,
    last_poll_timestamp: datetime = None,
    polling_interval_seconds: int = 120,
):
    now = datetime.utcnow()
    return {
        "user_id": user_id,
        "platform": platform,
        "channel_type": channel_type,
        "last_cursor": last_cursor,
        "last_poll_timestamp": last_poll_timestamp or (now - timedelta(hours=1)),
        "next_poll_at": now,
        "consecutive_empty_polls": 0,
        "polling_interval_seconds": polling_interval_seconds,
        "updated_at": now,
    }
