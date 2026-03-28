import logging
from datetime import datetime, timedelta
from typing import Optional

import requests
from bson import ObjectId
from pymongo.errors import PyMongoError

from app.config import config
from app.services.database import (
    automation_actions_collection,
    automation_events_collection,
    automation_settings_collection,
    dm_threads_collection,
)
from app.services.social_accounts import get_platform_credentials

logger = logging.getLogger(__name__)


class AutomationDispatchService:
    """Send pending automation actions to platform APIs and update status lifecycle."""

    def __init__(self):
        self.api_version = config.GRAPH_API_VERSION

    def process_pending_actions(self, batch_size: int = 100) -> dict:
        try:
            actions = list(
                automation_actions_collection.find({"status": "pending"})
                .sort("created_at", 1)
                .limit(batch_size)
            )
        except PyMongoError as exc:
            logger.warning("Mongo transient error in process_pending_actions: %s", exc)
            return {
                "seen": 0,
                "sent": 0,
                "failed": 0,
                "skipped": 0,
                "by_platform": {},
                "error_codes": {},
                "error": str(exc),
            }

        summary = {
            "seen": len(actions),
            "sent": 0,
            "failed": 0,
            "skipped": 0,
            "by_platform": {
                "facebook": {"sent": 0, "failed": 0, "skipped": 0},
                "instagram": {"sent": 0, "failed": 0, "skipped": 0},
            },
            "error_codes": {},
        }

        for action in actions:
            try:
                result = self._process_action(action)
                outcome = result.get("status", "failed")
                platform = action.get("platform") or "unknown"
                error_code = result.get("error_code")

                summary[outcome] += 1
                if platform in summary["by_platform"]:
                    summary["by_platform"][platform][outcome] += 1
                if error_code:
                    summary["error_codes"][error_code] = summary["error_codes"].get(error_code, 0) + 1
            except Exception as exc:
                logger.error("Dispatch failed for action %s: %s", action.get("_id"), exc, exc_info=True)
                self._mark_failed(action, "dispatch_exception", str(exc))
                summary["failed"] += 1
                platform = action.get("platform") or "unknown"
                if platform in summary["by_platform"]:
                    summary["by_platform"][platform]["failed"] += 1
                summary["error_codes"]["dispatch_exception"] = summary["error_codes"].get("dispatch_exception", 0) + 1

        return summary

    def enqueue_retryable_actions(self, batch_size: int = 200, max_retries: int = 5) -> dict:
        """Move failed actions back to pending when retry time has arrived."""
        now = datetime.utcnow()
        try:
            failed_actions = list(
                automation_actions_collection.find(
                    {
                        "status": "failed",
                        "next_retry_at": {"$lte": now},
                    }
                )
                .sort("next_retry_at", 1)
                .limit(batch_size)
            )
        except PyMongoError as exc:
            logger.warning("Mongo transient error in enqueue_retryable_actions: %s", exc)
            return {"seen": 0, "requeued": 0, "dead_lettered": 0, "error": str(exc)}

        summary = {"seen": len(failed_actions), "requeued": 0, "dead_lettered": 0}

        for action in failed_actions:
            retries = int(action.get("retry_count", 0))
            if retries >= max_retries:
                automation_actions_collection.update_one(
                    {"_id": action.get("_id")},
                    {
                        "$set": {
                            "status": "skipped",
                            "error_code": "max_retries_exceeded",
                            "error_message": f"Moved to dead-letter after {retries} retries",
                            "updated_at": now,
                        }
                    },
                )
                summary["dead_lettered"] += 1
                continue

            automation_actions_collection.update_one(
                {"_id": action.get("_id")},
                {
                    "$set": {
                        "status": "pending",
                        "updated_at": now,
                        "next_retry_at": None,
                    }
                },
            )
            summary["requeued"] += 1

        return summary

    def _process_action(self, action: dict) -> dict:
        user_id = action.get("user_id")
        platform = action.get("platform")

        event = self._load_event(action.get("event_id"))
        if not event:
            self._mark_failed(action, "event_not_found", "Related event does not exist")
            return {"status": "failed", "error_code": "event_not_found"}

        settings = automation_settings_collection.find_one(
            {"user_id": user_id, "platform": platform},
            {"delay_seconds": 1},
        ) or {}

        # Delay guard applies only to DM replies; comment replies should be near real-time.
        delay_seconds = int(settings.get("delay_seconds", 0))
        created_at = action.get("created_at") or datetime.utcnow()
        if action.get("action_type") == "dm_reply" and delay_seconds > 0 and datetime.utcnow() < (created_at + timedelta(seconds=delay_seconds)):
            return {"status": "skipped", "error_code": "delay_not_elapsed"}

        context = event.get("channel_context", {})

        # Final safety checks
        if event.get("event_type") == "dm_received":
            hours_old = self._hours_since_event(context)
            if hours_old is not None and hours_old > 24:
                self._mark_skipped(action, "outside_24h_window", "Failed: Outside 24h Window")
                return {"status": "skipped", "error_code": "outside_24h_window"}

            thread = dm_threads_collection.find_one(
                {
                    "user_id": user_id,
                    "platform": platform,
                    "conversation_id": context.get("thread_id"),
                },
                {"is_paused_by_human": 1},
            )
            if thread and thread.get("is_paused_by_human") and action.get("generated_text") != "I am transferring you to a human agent.":
                self._mark_skipped(action, "paused_by_human", "Thread paused by human handoff")
                return {"status": "skipped", "error_code": "paused_by_human"}

        creds = get_platform_credentials(user_id, platform)
        if not creds:
            self._mark_failed(action, "missing_credentials", f"No {platform} credentials for user")
            return {"status": "failed", "error_code": "missing_credentials"}

        send_result = self._send_action(action, event, creds)
        if send_result.get("status") == "success":
            self._mark_sent(action, send_result.get("platform_response_id"))
            return {"status": "sent"}

        fail_code = send_result.get("error_code", "send_failed")
        self._mark_failed(action, fail_code, send_result.get("detail", "Unknown send failure"))
        return {"status": "failed", "error_code": fail_code}

    def _hours_since_event(self, context: dict) -> Optional[float]:
        timestamp = context.get("timestamp")
        if timestamp is None:
            legacy_hours = context.get("hours_old")
            return float(legacy_hours) if legacy_hours is not None else None

        if isinstance(timestamp, datetime):
            event_time = timestamp
        else:
            raw = str(timestamp).strip()
            if raw.endswith("Z"):
                raw = raw[:-1] + "+00:00"
            elif len(raw) >= 5 and raw[-5] in {"+", "-"} and raw[-3] != ":":
                raw = raw[:-2] + ":" + raw[-2:]
            try:
                event_time = datetime.fromisoformat(raw)
            except ValueError:
                legacy_hours = context.get("hours_old")
                return float(legacy_hours) if legacy_hours is not None else None

        if event_time.tzinfo is not None:
            event_time = event_time.replace(tzinfo=None)

        return (datetime.utcnow() - event_time).total_seconds() / 3600

    def _load_event(self, event_id: str):
        try:
            return automation_events_collection.find_one({"_id": ObjectId(event_id)})
        except Exception:
            return None

    def _send_action(self, action: dict, event: dict, creds: dict) -> dict:
        platform = action.get("platform")
        action_type = action.get("action_type")
        text = action.get("generated_text") or ""
        context = event.get("channel_context", {})

        if action_type == "comment_reply":
            comment_id = context.get("object_id")
            if not comment_id:
                return {"status": "error", "error_code": "missing_comment_id", "detail": "Missing comment id in event context"}
            if platform == "facebook":
                return self._send_facebook_comment_reply(comment_id, text, creds)
            return self._send_instagram_comment_reply(comment_id, text, creds)

        # dm_reply
        recipient_id = context.get("creator_id")
        if not recipient_id:
            return {"status": "error", "error_code": "missing_recipient_id", "detail": "Missing recipient id in event context"}
        if platform == "facebook":
            return self._send_facebook_dm(recipient_id, text, creds)
        return self._send_instagram_dm(recipient_id, text, creds)

    def _post_graph(self, url: str, *, data: Optional[dict] = None, json_payload: Optional[dict] = None, timeout: int = 30) -> dict:
        """Execute Graph API POST with robust transport and response handling."""
        try:
            response = requests.post(url, data=data, json=json_payload, timeout=timeout)
            response.raise_for_status()
            payload = response.json()
            return {"status": "ok", "payload": payload}
        except requests.exceptions.Timeout:
            return {"status": "transport_error", "error_code": "graph_timeout", "detail": "Graph API timeout"}
        except requests.exceptions.ConnectionError as exc:
            return {"status": "transport_error", "error_code": "graph_connection_error", "detail": str(exc)}
        except requests.exceptions.HTTPError as exc:
            detail = "Graph API HTTP error"
            try:
                body = response.json()
                detail = body.get("error", {}).get("message") or detail
            except Exception:
                detail = str(exc)
            return {"status": "api_error", "error_code": "graph_http_error", "detail": detail}
        except ValueError:
            return {"status": "api_error", "error_code": "graph_invalid_json", "detail": "Graph API returned non-JSON response"}
        except requests.exceptions.RequestException as exc:
            return {"status": "transport_error", "error_code": "graph_request_error", "detail": str(exc)}

    def _send_facebook_comment_reply(self, comment_id: str, message: str, creds: dict) -> dict:
        token = creds.get("access_token")
        if not token:
            return {"status": "error", "error_code": "fb_missing_access_token", "detail": "Missing Facebook access token"}

        url = f"https://graph.facebook.com/{self.api_version}/{comment_id}/comments"
        payload = {"message": message, "access_token": token}
        result = self._post_graph(url, data=payload)
        if result.get("status") != "ok":
            code = result.get("error_code") or "fb_comment_reply_error"
            return {"status": "error", "error_code": f"fb_{code}", "detail": result.get("detail", "Facebook reply failed")}

        response = result.get("payload", {})
        if "error" in response:
            return {"status": "error", "error_code": "fb_comment_reply_error", "detail": response["error"].get("message", "Facebook reply failed")}
        return {"status": "success", "platform_response_id": response.get("id")}

    def _send_instagram_comment_reply(self, comment_id: str, message: str, creds: dict) -> dict:
        token = creds.get("access_token")
        if not token:
            return {"status": "error", "error_code": "ig_missing_access_token", "detail": "Missing Instagram access token"}

        url = f"https://graph.facebook.com/{self.api_version}/{comment_id}/replies"
        payload = {"message": message, "access_token": token}
        result = self._post_graph(url, data=payload)
        if result.get("status") != "ok":
            code = result.get("error_code") or "ig_comment_reply_error"
            return {"status": "error", "error_code": f"ig_{code}", "detail": result.get("detail", "Instagram reply failed")}

        response = result.get("payload", {})
        if "error" in response:
            return {"status": "error", "error_code": "ig_comment_reply_error", "detail": response["error"].get("message", "Instagram reply failed")}
        return {"status": "success", "platform_response_id": response.get("id")}

    def _send_facebook_dm(self, recipient_id: str, message: str, creds: dict) -> dict:
        page_id = creds.get("page_id")
        token = creds.get("access_token")
        if not page_id or not token:
            return {"status": "error", "error_code": "fb_missing_credentials", "detail": "Missing Facebook page_id or access token"}

        url = f"https://graph.facebook.com/{self.api_version}/{page_id}/messages"
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": message},
            "messaging_type": "RESPONSE",
            "access_token": token,
        }
        result = self._post_graph(url, json_payload=payload)
        if result.get("status") != "ok":
            code = result.get("error_code") or "fb_dm_send_error"
            return {"status": "error", "error_code": f"fb_{code}", "detail": result.get("detail", "Facebook DM send failed")}

        response = result.get("payload", {})
        if "error" in response:
            return {"status": "error", "error_code": "fb_dm_send_error", "detail": response["error"].get("message", "Facebook DM send failed")}
        return {"status": "success", "platform_response_id": response.get("message_id") or response.get("id")}

    def _send_instagram_dm(self, recipient_id: str, message: str, creds: dict) -> dict:
        ig_user_id = creds.get("ig_user_id")
        token = creds.get("access_token")
        if not ig_user_id or not token:
            return {"status": "error", "error_code": "ig_missing_credentials", "detail": "Missing Instagram ig_user_id or access token"}

        url = f"https://graph.facebook.com/{self.api_version}/{ig_user_id}/messages"
        payload = {
            "recipient": {"id": recipient_id},
            "message": {"text": message},
            "messaging_type": "RESPONSE",
            "access_token": token,
        }
        result = self._post_graph(url, json_payload=payload)
        if result.get("status") != "ok":
            code = result.get("error_code") or "ig_dm_send_error"
            return {"status": "error", "error_code": f"ig_{code}", "detail": result.get("detail", "Instagram DM send failed")}

        response = result.get("payload", {})
        if "error" in response:
            return {"status": "error", "error_code": "ig_dm_send_error", "detail": response["error"].get("message", "Instagram DM send failed")}
        return {"status": "success", "platform_response_id": response.get("message_id") or response.get("id")}

    def _mark_sent(self, action: dict, platform_response_id: str = None) -> None:
        automation_actions_collection.update_one(
            {"_id": action.get("_id")},
            {
                "$set": {
                    "status": "sent",
                    "sent_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                    "platform_response_id": platform_response_id,
                    "error_code": None,
                    "error_message": None,
                }
            },
        )

    def _mark_failed(self, action: dict, error_code: str, detail: str) -> None:
        retries = int(action.get("retry_count", 0)) + 1
        automation_actions_collection.update_one(
            {"_id": action.get("_id")},
            {
                "$set": {
                    "status": "failed",
                    "updated_at": datetime.utcnow(),
                    "error_code": error_code,
                    "error_message": detail,
                    "retry_count": retries,
                    "next_retry_at": datetime.utcnow() + timedelta(minutes=min(30, retries * 2)),
                }
            },
        )

    def _mark_skipped(self, action: dict, error_code: str, detail: str) -> None:
        automation_actions_collection.update_one(
            {"_id": action.get("_id")},
            {
                "$set": {
                    "status": "skipped",
                    "updated_at": datetime.utcnow(),
                    "error_code": error_code,
                    "error_message": detail,
                }
            },
        )
