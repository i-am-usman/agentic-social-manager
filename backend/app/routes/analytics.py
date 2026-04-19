from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from app.services.dependencies import get_current_user
from app.services.analytics_service import AnalyticsService
from app.services.social_accounts import get_platform_credentials
from app.services.database import automation_actions_collection, automation_events_collection
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


def _normalize_datetime(value):
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value

    raw = str(value).strip()
    if not raw:
        return None
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    elif len(raw) >= 5 and raw[-5] in {"+", "-"} and raw[-3] != ":":
        raw = raw[:-2] + ":" + raw[-2:]

    try:
        parsed = datetime.fromisoformat(raw)
        return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed
    except ValueError:
        return None


def _compute_text_sentiment(text: str) -> str:
    sample = (text or "").lower()
    positive_tokens = {
        "good", "great", "nice", "love", "awesome", "excellent", "thanks", "thank you", "amazing"
    }
    negative_tokens = {
        "bad", "worst", "hate", "poor", "terrible", "awful", "issue", "problem", "angry"
    }

    if any(token in sample for token in positive_tokens):
        return "positive"
    if any(token in sample for token in negative_tokens):
        return "negative"
    return "neutral"


def _date_bucket_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def _hour_label(hour: int) -> str:
    suffix = "AM" if hour < 12 else "PM"
    normalized = hour % 12
    normalized = 12 if normalized == 0 else normalized
    return f"{normalized}:00 {suffix}"


@router.get("/dashboard")
async def get_dashboard_summary(
    range_days: int = Query(7, ge=1, le=90),
    user: dict = Depends(get_current_user),
):
    """Unified engagement dashboard payload focused on Facebook and Instagram."""
    try:
        user_id = str(user["_id"])
        window_start = datetime.utcnow() - timedelta(days=range_days)
        platforms = ["facebook", "instagram"]

        fb_creds = get_platform_credentials(user_id, "facebook")
        ig_creds = get_platform_credentials(user_id, "instagram")
        analytics_service = AnalyticsService(
            fb_page_id=fb_creds.get("page_id") if fb_creds else None,
            fb_token=fb_creds.get("access_token") if fb_creds else None,
            ig_user_id=ig_creds.get("ig_user_id") if ig_creds else None,
            ig_token=ig_creds.get("access_token") if ig_creds else None,
        )

        media_result = analytics_service.get_all_media(limit=50)
        posts = media_result.get("posts", []) if media_result.get("status") == "success" else []

        actions = list(
            automation_actions_collection.find(
                {
                    "user_id": user_id,
                    "platform": {"$in": platforms},
                    "created_at": {"$gte": window_start},
                }
            )
            .sort("created_at", -1)
            .limit(200)
        )

        events = list(
            automation_events_collection.find(
                {
                    "user_id": user_id,
                    "platform": {"$in": platforms},
                    "created_at": {"$gte": window_start},
                }
            )
            .sort("created_at", -1)
            .limit(300)
        )

        event_by_id = {str(event.get("_id")): event for event in events}

        platform_split = {"facebook": 0, "instagram": 0}
        channel_split = {"comments": 0, "dms": 0}
        sentiment_counts = {"positive": 0, "neutral": 0, "negative": 0}

        date_keys = []
        trend_comments = {}
        trend_dms = {}
        trend_replies_sent = {}
        for offset in range(range_days):
            day = (window_start + timedelta(days=offset)).date()
            key = day.strftime("%Y-%m-%d")
            date_keys.append(key)
            trend_comments[key] = 0
            trend_dms[key] = 0
            trend_replies_sent[key] = 0

        for event in events:
            platform = event.get("platform")
            event_type = event.get("event_type")
            if platform in platform_split:
                platform_split[platform] += 1
            if event_type == "comment_created":
                channel_split["comments"] += 1
                event_dt = _normalize_datetime(event.get("created_at"))
                if event_dt:
                    key = _date_bucket_key(event_dt)
                    if key in trend_comments:
                        trend_comments[key] += 1
            elif event_type == "dm_received":
                channel_split["dms"] += 1
                event_dt = _normalize_datetime(event.get("created_at"))
                if event_dt:
                    key = _date_bucket_key(event_dt)
                    if key in trend_dms:
                        trend_dms[key] += 1

            sentiment = _compute_text_sentiment((event.get("channel_context") or {}).get("text", ""))
            sentiment_counts[sentiment] += 1

        sent_actions = [a for a in actions if a.get("status") == "sent"]
        failed_actions = [a for a in actions if a.get("status") == "failed"]
        skipped_actions = [a for a in actions if a.get("status") == "skipped"]
        pending_actions = [a for a in actions if a.get("status") == "pending"]

        latency_seconds = []
        recent_actions = []
        for action in actions[:25]:
            event_id = str(action.get("event_id") or "")
            event = event_by_id.get(event_id)
            context = (event or {}).get("channel_context") or {}

            created_at = _normalize_datetime(action.get("created_at"))
            sent_at = _normalize_datetime(action.get("sent_at"))
            if sent_at and created_at:
                latency_seconds.append(max(0, (sent_at - created_at).total_seconds()))

            recent_actions.append(
                {
                    "platform": action.get("platform"),
                    "channel_type": "dm" if action.get("action_type") == "dm_reply" else "comment",
                    "status": action.get("status"),
                    "user_said": (context.get("text") or "")[:140],
                    "ai_replied": (action.get("generated_text") or "")[:180],
                    "ai_fallback_reason": action.get("ai_fallback_reason"),
                    "created_at": action.get("created_at"),
                }
            )

        for action in sent_actions:
            action_dt = _normalize_datetime(action.get("created_at"))
            if not action_dt:
                continue
            key = _date_bucket_key(action_dt)
            if key in trend_replies_sent:
                trend_replies_sent[key] += 1

        top_posts = []
        hour_buckets = {hour: {"engagement": 0, "posts": 0} for hour in range(24)}
        for post in posts:
            likes = int(post.get("likes", 0) or 0)
            comments = int(post.get("comments", 0) or 0)
            shares = int(post.get("shares", 0) or 0)
            score = likes + (comments * 2) + (shares * 3)

            created_time = _normalize_datetime(post.get("created_time"))
            if created_time:
                hour_buckets[created_time.hour]["engagement"] += score
                hour_buckets[created_time.hour]["posts"] += 1

            top_posts.append(
                {
                    "id": post.get("id"),
                    "platform": post.get("platform"),
                    "message": (post.get("message") or post.get("caption") or "")[:120],
                    "likes": likes,
                    "comments": comments,
                    "shares": shares,
                    "score": score,
                    "permalink": post.get("permalink"),
                }
            )
        top_posts.sort(key=lambda item: item["score"], reverse=True)

        best_hour_candidates = []
        for hour, bucket in hour_buckets.items():
            post_count = bucket["posts"]
            if post_count <= 0:
                continue
            avg_score = bucket["engagement"] / post_count
            # Slightly reward hours with more sample size without fully overriding average quality.
            confidence_weighted_score = avg_score * (1 + min(post_count, 6) / 20)
            best_hour_candidates.append(
                {
                    "hour": hour,
                    "label": _hour_label(hour),
                    "posts": post_count,
                    "average_engagement_score": round(avg_score, 2),
                    "confidence_score": round(confidence_weighted_score, 2),
                }
            )

        best_hour_candidates.sort(
            key=lambda item: (item["confidence_score"], item["posts"]),
            reverse=True,
        )

        best_time_prediction = {
            "status": "insufficient_data",
            "recommended_hour": None,
            "recommended_label": None,
            "top_windows": [],
            "coverage_posts": len(posts),
            "message": "Need more post history to estimate best posting time.",
        }
        if best_hour_candidates:
            best = best_hour_candidates[0]
            best_time_prediction = {
                "status": "ready",
                "recommended_hour": best["hour"],
                "recommended_label": best["label"],
                "top_windows": best_hour_candidates[:3],
                "coverage_posts": len(posts),
                "message": f"ASMA predicts highest engagement around {best['label']}.",
            }

        daily_engagement = [trend_comments[key] + trend_dms[key] for key in date_keys]
        anomaly_alert = {
            "status": "insufficient_data",
            "is_spike": False,
            "severity": "none",
            "latest_window": date_keys[-1] if date_keys else None,
            "latest_engagement": daily_engagement[-1] if daily_engagement else 0,
            "baseline_engagement": None,
            "delta_percent": None,
            "spike_ratio": None,
            "message": "Need more baseline data to detect anomalies.",
        }

        if len(daily_engagement) >= 3:
            current_value = daily_engagement[-1]
            baseline_values = daily_engagement[:-1]
            baseline_avg = (sum(baseline_values) / len(baseline_values)) if baseline_values else 0

            spike_ratio = (current_value / baseline_avg) if baseline_avg > 0 else None
            delta_percent = (
                round(((current_value - baseline_avg) / baseline_avg) * 100, 2)
                if baseline_avg > 0
                else None
            )

            is_spike = bool(spike_ratio and spike_ratio >= 3 and current_value >= 5)
            severity = "none"
            if is_spike:
                severity = "high" if spike_ratio >= 5 else "medium"

            message = "Engagement is stable compared to recent baseline."
            if is_spike:
                message = (
                    f"Traffic spike detected: engagement is {round(spike_ratio, 2)}x above recent baseline."
                )

            anomaly_alert = {
                "status": "ready",
                "is_spike": is_spike,
                "severity": severity,
                "latest_window": date_keys[-1],
                "latest_engagement": current_value,
                "baseline_engagement": round(baseline_avg, 2),
                "delta_percent": delta_percent,
                "spike_ratio": round(spike_ratio, 2) if spike_ratio is not None else None,
                "message": message,
            }

        total_ai_replies = len(sent_actions)
        time_saved_minutes = total_ai_replies * 2
        avg_latency = round(sum(latency_seconds) / len(latency_seconds), 2) if latency_seconds else None

        return {
            "status": "success",
            "summary": {
                "range_days": range_days,
                "platform_scope": platforms,
                "totals": {
                    "incoming_comments": channel_split["comments"],
                    "incoming_dms": channel_split["dms"],
                    "ai_auto_replies_sent": total_ai_replies,
                    "hours_saved_estimate": round(time_saved_minutes / 60, 2),
                    "average_ai_response_seconds": avg_latency,
                },
                "automation_health": {
                    "pending": len(pending_actions),
                    "failed": len(failed_actions),
                    "skipped": len(skipped_actions),
                    "sent": total_ai_replies,
                },
                "platform_split": platform_split,
                "channel_split": channel_split,
                "sentiment": sentiment_counts,
            },
            "top_posts": top_posts[:5],
            "recent_ai_actions": recent_actions[:10],
            "best_time_to_post": best_time_prediction,
            "anomaly_alert": anomaly_alert,
            "trends": {
                "labels": date_keys,
                "incoming_comments": [trend_comments[key] for key in date_keys],
                "incoming_dms": [trend_dms[key] for key in date_keys],
                "ai_replies_sent": [trend_replies_sent[key] for key in date_keys],
            },
            "meta": {
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "partial_data": bool(media_result.get("errors")),
                "errors_by_platform": media_result.get("errors") or [],
                "timezone": "UTC",
            },
        }
    except Exception as e:
        logger.error(f"Error in get_dashboard_summary: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


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
    include_analysis: bool = Query(False),
    include_replies: bool = Query(False),
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
        result = analytics_service.get_post_comments(
            post_id,
            platform,
            include_analysis=include_analysis,
            include_replies=include_replies,
        )
        return result
    except Exception as e:
        logger.error(f"Error in get_post_comments: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


@router.get("/comments/{comment_id}/replies")
async def get_comment_replies(
    comment_id: str,
    platform: str = Query("facebook", regex="^(facebook|instagram)$"),
    user: dict = Depends(get_current_user)
):
    """Fetch replies for a specific comment on Facebook or Instagram."""
    try:
        fb_creds = get_platform_credentials(user["_id"], "facebook")
        ig_creds = get_platform_credentials(user["_id"], "instagram")
        analytics_service = AnalyticsService(
            fb_page_id=fb_creds.get("page_id") if fb_creds else None,
            fb_token=fb_creds.get("access_token") if fb_creds else None,
            ig_user_id=ig_creds.get("ig_user_id") if ig_creds else None,
            ig_token=ig_creds.get("access_token") if ig_creds else None,
        )
        return analytics_service.get_comment_replies(comment_id, platform)
    except Exception as e:
        logger.error(f"Error in get_comment_replies: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}


@router.get("/likes/{post_id}")
async def get_post_likes(
    post_id: str,
    platform: str = Query("facebook", regex="^(facebook|instagram|linkedin)$"),
    user: dict = Depends(get_current_user)
):
    """Fetch users who liked/reacted to a post when supported by the platform API."""
    try:
        fb_creds = get_platform_credentials(user["_id"], "facebook")
        ig_creds = get_platform_credentials(user["_id"], "instagram")
        analytics_service = AnalyticsService(
            fb_page_id=fb_creds.get("page_id") if fb_creds else None,
            fb_token=fb_creds.get("access_token") if fb_creds else None,
            ig_user_id=ig_creds.get("ig_user_id") if ig_creds else None,
            ig_token=ig_creds.get("access_token") if ig_creds else None,
        )
        return analytics_service.get_post_likes(post_id, platform)
    except Exception as e:
        logger.error(f"Error in get_post_likes: {e}", exc_info=True)
        return {"status": "error", "detail": str(e)}
