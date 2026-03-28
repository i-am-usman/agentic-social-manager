import logging
from datetime import datetime, timedelta
from hashlib import md5
from typing import Optional

import google.generativeai as genai

from app.config.config import GEMINI_API_KEY, GEMINI_MODEL
from app.services.automation_models import automation_action_document
from app.services.database import (
    automation_actions_collection,
    automation_events_collection,
    automation_settings_collection,
    dm_threads_collection,
)

logger = logging.getLogger(__name__)

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class DecisionEngineService:
    """Apply automation guardrails and generate reply actions from ingested events."""

    _model_cache_ready = False
    _cached_model = None
    _cached_model_name = GEMINI_MODEL

    def __init__(self):
        if DecisionEngineService._model_cache_ready:
            self.model = DecisionEngineService._cached_model
            self.model_name = DecisionEngineService._cached_model_name
            return

        self.model_name = GEMINI_MODEL
        self.model = None
        if GEMINI_API_KEY:
            candidate_models = [
                self.model_name,
                "gemini-2.5-flash",
                "gemini-2.0-flash",
                "gemini-pro-latest",
            ]
            seen = set()
            for candidate in candidate_models:
                if candidate in seen:
                    continue
                seen.add(candidate)
                try:
                    self.model = genai.GenerativeModel(candidate)
                    self.model_name = candidate
                    logger.info("Gemini model initialized: %s", candidate)
                    break
                except Exception as exc:
                    self.model = None
                    logger.warning("Gemini model unavailable (%s): %s", candidate, exc)

            if not self.model:
                logger.error("No usable Gemini model found. AI replies will fall back to template mode.")

        DecisionEngineService._cached_model = self.model
        DecisionEngineService._cached_model_name = self.model_name
        DecisionEngineService._model_cache_ready = True

    def process_pending_events(self, batch_size: int = 100) -> dict:
        """Process unhandled automation events and create actions."""
        events = list(
            automation_events_collection.find({"processed_at": None})
            .sort("created_at", 1)
            .limit(batch_size)
        )

        summary = {
            "events_seen": len(events),
            "actions_pending": 0,
            "actions_skipped": 0,
            "actions_failed": 0,
            "skip_reasons": {},
            "ai_fallback_reasons": {},
        }

        for event in events:
            try:
                result = self._process_single_event(event)
                status = result.get("status")

                if status == "pending":
                    summary["actions_pending"] += 1
                    fallback_reason = result.get("ai_fallback_reason")
                    if fallback_reason:
                        summary["ai_fallback_reasons"][fallback_reason] = (
                            summary["ai_fallback_reasons"].get(fallback_reason, 0) + 1
                        )
                elif status == "skipped":
                    summary["actions_skipped"] += 1
                    reason = result.get("reason") or "unknown"
                    summary["skip_reasons"][reason] = summary["skip_reasons"].get(reason, 0) + 1
                elif status == "failed":
                    summary["actions_failed"] += 1
            except Exception as exc:
                logger.error("Decision engine failed for event %s: %s", event.get("_id"), exc, exc_info=True)
                summary["actions_failed"] += 1
                self._mark_event_processed(event["_id"])

        return summary

    def _process_single_event(self, event: dict) -> dict:
        user_id = event.get("user_id")
        platform = event.get("platform")
        event_type = event.get("event_type")
        context = event.get("channel_context", {})
        text = (context.get("text") or "").strip()

        settings = automation_settings_collection.find_one({
            "user_id": user_id,
            "platform": platform,
            "enabled": True,
        })

        if not settings:
            self._create_skipped_action(event, "settings_disabled", "Automation disabled for platform")
            self._mark_event_processed(event["_id"])
            return {"status": "skipped", "reason": "settings_disabled"}

        skip_reason = self._evaluate_guardrails(event, settings)
        if skip_reason:
            self._create_skipped_action(event, skip_reason["code"], skip_reason["message"])
            self._mark_event_processed(event["_id"])
            return {"status": "skipped", "reason": skip_reason["code"]}

        # Human handoff request detection for DMs
        if event_type == "dm_received" and self._asks_for_human(text):
            reply_text = "I am transferring you to a human agent."
            self._pause_thread(event)
            self._create_pending_action(event, settings, reply_text)
            self._mark_event_processed(event["_id"])
            return {"status": "pending"}

        reply_mode = settings.get("reply_mode", "template")
        generation = self._generate_reply(
            event=event,
            mode=reply_mode,
            tone=settings.get("tone", "professional"),
            template=settings.get("template_reply") or "Thank you for reaching out! We'll get back to you soon.",
        )
        reply_text = generation.get("text") or ""
        reply_mode = generation.get("reply_mode_used") or reply_mode
        fallback_reason = generation.get("ai_fallback_reason")
        fallback_detail = generation.get("ai_fallback_detail")

        if not reply_text:
            fallback = settings.get("template_reply") or "Thank you for reaching out! We'll get back to you soon."
            reply_text = fallback
            reply_mode = "template"
            if settings.get("reply_mode") == "ai" and not fallback_reason:
                fallback_reason = "empty_response"
                fallback_detail = "AI returned no text"

        self._create_pending_action(
            event,
            settings,
            reply_text,
            reply_mode_override=reply_mode,
            ai_fallback_reason=fallback_reason,
            ai_fallback_detail=fallback_detail,
        )
        self._mark_event_processed(event["_id"])
        return {"status": "pending", "ai_fallback_reason": fallback_reason}

    def _evaluate_guardrails(self, event: dict, settings: dict) -> Optional[dict]:
        user_id = event.get("user_id")
        platform = event.get("platform")
        event_type = event.get("event_type")
        context = event.get("channel_context", {})

        # 24-hour DM window enforcement
        if event_type == "dm_received":
            hours_old = self._hours_since_event(context)
            if hours_old is not None and hours_old > 24:
                return {"code": "outside_24h_window", "message": "Failed: Outside 24h Window"}

        # Human paused thread check
        if event_type == "dm_received":
            thread = dm_threads_collection.find_one({
                "user_id": user_id,
                "platform": platform,
                "conversation_id": context.get("thread_id"),
            })
            if thread and thread.get("is_paused_by_human"):
                return {"code": "paused_by_human", "message": "Thread paused by human handoff"}

        # Quiet hours check
        if self._is_in_quiet_hours(settings.get("quiet_hours")):
            return {"code": "quiet_hours", "message": "Skipped during quiet hours"}

        # Blacklist check
        text = (context.get("text") or "").lower()
        for token in settings.get("keyword_blacklist", []):
            if token and token.lower() in text:
                return {"code": "blacklist", "message": f"Skipped due to blacklisted keyword: {token}"}

        # Rate limit checks
        if not self._is_within_rate_limits(user_id, platform, settings):
            return {"code": "rate_limit", "message": "Skipped due to rate limit"}

        return None

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

    def _is_in_quiet_hours(self, quiet_hours: Optional[dict]) -> bool:
        if not quiet_hours or not quiet_hours.get("enabled"):
            return False

        now_hour = datetime.utcnow().hour
        start = int(quiet_hours.get("start_hour", 0))
        end = int(quiet_hours.get("end_hour", 8))

        # Supports overnight window, e.g., 22 -> 6
        if start <= end:
            return start <= now_hour < end
        return now_hour >= start or now_hour < end

    def _is_within_rate_limits(self, user_id: str, platform: str, settings: dict) -> bool:
        now = datetime.utcnow()
        hour_ago = now - timedelta(hours=1)
        day_ago = now - timedelta(days=1)

        per_hour_limit = int(settings.get("max_replies_per_hour", 10))
        per_day_limit = int(settings.get("max_replies_per_day", 50))

        sent_last_hour = automation_actions_collection.count_documents({
            "user_id": user_id,
            "platform": platform,
            "status": "sent",
            "created_at": {"$gte": hour_ago},
        })
        sent_last_day = automation_actions_collection.count_documents({
            "user_id": user_id,
            "platform": platform,
            "status": "sent",
            "created_at": {"$gte": day_ago},
        })

        return sent_last_hour < per_hour_limit and sent_last_day < per_day_limit

    def _generate_reply(self, event: dict, mode: str, tone: str, template: str) -> dict:
        if mode == "template":
            return {
                "text": template,
                "reply_mode_used": "template",
                "ai_fallback_reason": None,
                "ai_fallback_detail": None,
            }

        if not self.model:
            logger.warning("AI mode requested but no Gemini model is available; using template fallback")
            return {
                "text": template,
                "reply_mode_used": "template",
                "ai_fallback_reason": "model_unavailable",
                "ai_fallback_detail": "No Gemini model initialized",
            }

        context = event.get("channel_context", {})
        message = context.get("text") or ""
        platform = event.get("platform")
        event_type = event.get("event_type")

        tone_guide = {
            "professional": "Respond in a professional and concise style.",
            "friendly": "Respond warmly and helpfully.",
            "concise": "Respond briefly in one short paragraph.",
            "empathetic": "Acknowledge feelings and respond empathetically.",
        }.get(tone, "Respond professionally.")

        prompt = (
            "You are ASMA, an assistant replying to social media interactions.\n"
            f"Platform: {platform}\n"
            f"Event Type: {event_type}\n"
            f"Incoming Message: {message}\n\n"
            "Rules:\n"
            f"- {tone_guide}\n"
            "- Keep response under 60 words.\n"
            "- Do not use hashtags.\n"
            "- If user asks for human support, reply exactly: 'I am transferring you to a human agent.'\n"
            "- Avoid making promises you cannot verify.\n"
        )

        try:
            response = self.model.generate_content(prompt)
            if response and getattr(response, "text", None):
                return {
                    "text": response.text.strip(),
                    "reply_mode_used": "ai",
                    "ai_fallback_reason": None,
                    "ai_fallback_detail": None,
                }

            return {
                "text": template,
                "reply_mode_used": "template",
                "ai_fallback_reason": "empty_response",
                "ai_fallback_detail": "Gemini returned no text",
            }
        except Exception as exc:
            error_detail = str(exc)
            fallback_reason = "generation_error"
            if "quota" in error_detail.lower() or "resourceexhausted" in error_detail.lower() or "429" in error_detail:
                fallback_reason = "quota_exceeded"

            logger.error(
                "Gemini generation failed (model=%s, event_id=%s, platform=%s): %s",
                self.model_name,
                event.get("_id"),
                platform,
                exc,
                exc_info=True,
            )
            return {
                "text": template,
                "reply_mode_used": "template",
                "ai_fallback_reason": fallback_reason,
                "ai_fallback_detail": error_detail,
            }

    def _create_pending_action(
        self,
        event: dict,
        settings: dict,
        reply_text: str,
        reply_mode_override: Optional[str] = None,
        ai_fallback_reason: Optional[str] = None,
        ai_fallback_detail: Optional[str] = None,
    ) -> None:
        user_id = event.get("user_id")
        platform = event.get("platform")
        event_id = str(event.get("_id"))
        event_type = event.get("event_type")

        action_type = "dm_reply" if event_type == "dm_received" else "comment_reply"
        reply_mode = reply_mode_override or settings.get("reply_mode", "template")

        idempotency_key = md5(f"action:{user_id}:{platform}:{event_id}".encode()).hexdigest()

        existing = automation_actions_collection.find_one({
            "user_id": user_id,
            "idempotency_key": idempotency_key,
        })
        if existing:
            return

        action_doc = automation_action_document(
            user_id=user_id,
            event_id=event_id,
            platform=platform,
            action_type=action_type,
            reply_mode_used=reply_mode,
            generated_text=reply_text,
            idempotency_key=idempotency_key,
            system_prompt="decision_engine_v1",
        )

        if ai_fallback_reason:
            action_doc["ai_fallback_reason"] = ai_fallback_reason
        if ai_fallback_detail:
            action_doc["ai_fallback_detail"] = ai_fallback_detail

        automation_actions_collection.insert_one(action_doc)

    def _create_skipped_action(self, event: dict, error_code: str, error_message: str) -> None:
        user_id = event.get("user_id")
        platform = event.get("platform")
        event_id = str(event.get("_id"))
        event_type = event.get("event_type")

        action_type = "dm_reply" if event_type == "dm_received" else "comment_reply"
        idempotency_key = md5(f"skip:{user_id}:{platform}:{event_id}".encode()).hexdigest()

        existing = automation_actions_collection.find_one({
            "user_id": user_id,
            "idempotency_key": idempotency_key,
        })
        if existing:
            return

        action_doc = automation_action_document(
            user_id=user_id,
            event_id=event_id,
            platform=platform,
            action_type=action_type,
            reply_mode_used="template",
            generated_text="",
            idempotency_key=idempotency_key,
            system_prompt="decision_engine_skip",
        )
        action_doc["status"] = "skipped"
        action_doc["error_code"] = error_code
        action_doc["error_message"] = error_message

        automation_actions_collection.insert_one(action_doc)

    def _mark_event_processed(self, event_id) -> None:
        automation_events_collection.update_one(
            {"_id": event_id},
            {"$set": {"processed_at": datetime.utcnow()}},
        )

    def _asks_for_human(self, text: str) -> bool:
        if not text:
            return False

        lower = text.lower()
        triggers = [
            "human",
            "real person",
            "agent",
            "representative",
            "someone from support",
            "talk to support",
            "customer service",
        ]
        return any(token in lower for token in triggers)

    def _pause_thread(self, event: dict) -> None:
        context = event.get("channel_context", {})
        dm_threads_collection.update_one(
            {
                "user_id": event.get("user_id"),
                "platform": event.get("platform"),
                "conversation_id": context.get("thread_id"),
            },
            {
                "$set": {
                    "is_paused_by_human": True,
                    "paused_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
            },
            upsert=False,
        )
