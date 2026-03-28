import requests
import logging
from datetime import datetime, timedelta
from typing import Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from hashlib import md5
from app.config import config
from app.services.database import (
    automation_events_collection,
    poll_cursor_state_collection,
    dm_threads_collection,
)
from app.services.automation_models import (
    automation_event_document,
    poll_cursor_state_document,
    dm_thread_document,
)

logger = logging.getLogger(__name__)


class AutomationService:
    """Handle polling for comments and DMs from Facebook and Instagram with dynamic backoff"""
    
    def __init__(self, fb_page_id: str = None, fb_token: str = None, 
                 ig_user_id: str = None, ig_token: str = None):
        self.fb_page_id = fb_page_id
        self.fb_token = fb_token
        self.ig_user_id = ig_user_id
        self.ig_token = ig_token
        self.api_version = config.GRAPH_API_VERSION
    
    def _generate_idempotency_key(self, user_id: str, object_id: str, platform: str) -> str:
        """Generate unique key for deduplication (MD5 hash of user+object+platform)"""
        key_parts = f"{user_id}:{object_id}:{platform}"
        return md5(key_parts.encode()).hexdigest()

    def _parse_graph_timestamp(self, raw_value: str) -> datetime:
        """Parse Graph API datetime strings like Z, +00:00, or +0000 into naive UTC datetime."""
        if not raw_value:
            raise ValueError("Missing timestamp")

        value = str(raw_value).strip()
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        elif len(value) >= 5 and value[-5] in {"+", "-"} and value[-3] != ":":
            # Convert trailing timezone offset from +0000 to +00:00.
            value = value[:-2] + ":" + value[-2:]

        return datetime.fromisoformat(value).replace(tzinfo=None)

    def _extract_sender(self, payload: dict) -> tuple[Optional[str], Optional[str]]:
        """Safely extract sender id/name from Graph payloads where `from` can be missing."""
        sender = (payload or {}).get("from") or {}
        sender_id = sender.get("id")
        if not sender_id:
            return None, None
        sender_name = sender.get("name") or sender.get("username")
        return str(sender_id), sender_name

    def _fetch_json(self, url: str, params: dict, timeout: int = 30) -> dict:
        """Perform a GET request and return parsed JSON response."""
        return requests.get(url, params=params, timeout=timeout).json()

    def _fetch_instagram_media_comments(self, media_id: str) -> tuple[str, dict]:
        """Fetch comments payload for a single Instagram media object."""
        comments_url = f"https://graph.facebook.com/{self.api_version}/{media_id}/comments"
        comments_params = {
            "fields": "id,text,from,hidden,timestamp",
            "limit": 25,
            "access_token": self.ig_token,
        }
        return media_id, self._fetch_json(comments_url, comments_params, timeout=30)
    
    def _get_cursor_state(self, user_id: str, platform: str, event_type: str) -> dict:
        """Get or create cursor state for polling"""
        state = poll_cursor_state_collection.find_one({
            "user_id": user_id,
            "platform": platform,
            "channel_type": event_type,
        })
        
        if not state:
            # Create new cursor state
            state = poll_cursor_state_document(
                user_id=user_id,
                platform=platform,
                channel_type=event_type,
            )
            poll_cursor_state_collection.insert_one(state)
        
        return state
    
    def _update_cursor_state(
        self, user_id: str, platform: str, event_type: str,
        next_cursor: Optional[str] = None, message_count: int = 0,
        last_error_code: Optional[str] = None,
        last_error_message: Optional[str] = None,
    ) -> None:
        """Update cursor state with dynamic backoff logic"""
        state = self._get_cursor_state(user_id, platform, event_type)

        # Comments should be polled more aggressively than DMs.
        if event_type == "comment_created":
            base_interval = 30
            backoff_interval = 45
            max_interval = 60
        else:
            base_interval = 60
            backoff_interval = 90
            max_interval = 120
        
        # Dynamic backoff: 0 msg → 2min, 0 msg again → 3min, 0 msg 2+ times → 5min
        consecutive_empty = state.get("consecutive_empty_polls", 0)
        new_consecutive_empty = 0 if message_count > 0 else consecutive_empty + 1
        
        if new_consecutive_empty == 0:
            next_interval = base_interval
        elif new_consecutive_empty == 1:
            next_interval = backoff_interval
        else:
            next_interval = max_interval
        
        update_dict = {
            "last_cursor": next_cursor or state.get("last_cursor"),
            "last_poll_timestamp": datetime.utcnow(),
            "next_poll_at": datetime.utcnow() + timedelta(seconds=next_interval),
            "consecutive_empty_polls": new_consecutive_empty,
            "polling_interval_seconds": next_interval,
            "updated_at": datetime.utcnow(),
            "last_error_code": last_error_code,
            "last_error_message": last_error_message,
        }
        
        poll_cursor_state_collection.update_one(
            {
                "user_id": user_id,
                "platform": platform,
                "channel_type": event_type,
            },
            {"$set": update_dict}
        )
        
        logger.info(
            f"Updated cursor state: {platform}/{event_type} - "
            f"next_interval={next_interval}s, consecutive_empty={new_consecutive_empty}"
        )
    
    def _store_automation_event(self, user_id: str, event_type: str, platform: str, 
                              channel_context: dict, poll_timestamp: datetime) -> bool:
        """Store normalized event with deduplication"""
        idempotency_key = self._generate_idempotency_key(user_id, channel_context["object_id"], platform)
        
        # Check for duplicate
        existing = automation_events_collection.find_one({"idempotency_key": idempotency_key})
        if existing:
            logger.debug(f"Duplicate event detected: {idempotency_key}, skipping")
            return False
        
        event = automation_event_document(
            user_id=user_id,
            event_type=event_type,
            platform=platform,
            channel_context=channel_context,
            poll_timestamp=poll_timestamp,
        )
        event["idempotency_key"] = idempotency_key
        
        result = automation_events_collection.insert_one(event)
        logger.info(f"Stored automation event: {result.inserted_id}")
        return True
    
    # ========== FACEBOOK COMMENTS ==========
    
    def fetch_facebook_comments(self, user_id: str) -> int:
        """Fetch recent comments on Facebook page posts"""
        if not self.fb_page_id or not self.fb_token:
            logger.warning(f"Facebook credentials missing for user {user_id}, skipping")
            return 0
        
        try:
            self._get_cursor_state(user_id, "facebook", "comment_created")
            
            # Fetch posts with comments
            url = f"https://graph.facebook.com/{self.api_version}/{self.fb_page_id}/posts"
            params = {
                # Keep query simple and rely on idempotency to avoid duplicate processing.
                "fields": "id,message,created_time,comments.limit(25).fields(id,message,from,created_time)",
                "limit": 10,
                "access_token": self.fb_token,
            }
            
            response = self._fetch_json(url, params, timeout=30)
            
            if "error" in response:
                error = response["error"]
                logger.error(f"Facebook API error: {error}")
                self._update_cursor_state(
                    user_id,
                    "facebook",
                    "comment_created",
                    message_count=0,
                    last_error_code=f"graph_{error.get('code')}",
                    last_error_message=error.get("message"),
                )
                return 0
            
            stored_count = 0
            next_cursor = None
            
            for post in response.get("data", []):
                post_id = post.get("id")
                comments = post.get("comments", {}).get("data", [])
                
                # Get pagination cursor for next poll
                paging = post.get("comments", {}).get("paging", {})
                if "next" in paging:
                    next_cursor = paging["cursors"].get("after")
                
                for comment in comments:
                    sender_id, sender_name = self._extract_sender(comment)
                    if not sender_id:
                        logger.debug("Skipping Facebook comment without sender: %s", comment.get("id"))
                        continue

                    # Ignore comments authored by the page itself to avoid self-reply loops.
                    if str(sender_id) == str(self.fb_page_id):
                        continue

                    comment_time = self._parse_graph_timestamp(comment.get("created_time"))
                    channel_context = {
                        "object_id": comment["id"],
                        "thread_id": post_id,
                        "creator_id": sender_id,
                        "creator_name": sender_name,
                        "timestamp": comment_time,
                        "text": comment.get("message", ""),
                        "platform": "facebook",
                        "event_type": "comment_created",
                    }
                    
                    if self._store_automation_event(
                        user_id, "comment_created", "facebook", channel_context, datetime.utcnow()
                    ):
                        stored_count += 1
            
            self._update_cursor_state(
                user_id, "facebook", "comment_created",
                next_cursor=next_cursor, message_count=stored_count
            )
            
            logger.info(f"Fetched {stored_count} Facebook comments for user {user_id}")
            return stored_count
            
        except requests.exceptions.Timeout:
            logger.error(f"Facebook API timeout for user {user_id}")
            self._update_cursor_state(user_id, "facebook", "comment_created", message_count=0)
            return 0
        except requests.exceptions.RequestException as e:
            logger.warning(f"Facebook API request error for user {user_id}: {e}")
            self._update_cursor_state(user_id, "facebook", "comment_created", message_count=0)
            return 0
        except Exception as e:
            logger.error(f"Error fetching Facebook comments: {e}", exc_info=True)
            self._update_cursor_state(user_id, "facebook", "comment_created", message_count=0)
            return 0
    
    # ========== INSTAGRAM COMMENTS ==========
    
    def fetch_instagram_comments(self, user_id: str) -> int:
        """Fetch recent comments on Instagram media"""
        if not self.ig_user_id or not self.ig_token:
            logger.warning(f"Instagram credentials missing for user {user_id}, skipping")
            return 0
        
        try:
            self._get_cursor_state(user_id, "instagram", "comment_created")
            
            # First fetch recent media
            url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media"
            params = {
                "fields": "id,caption,media_type,timestamp",
                "limit": 10,
                "access_token": self.ig_token,
            }
            
            response = self._fetch_json(url, params, timeout=30)
            
            if "error" in response:
                error = response["error"]
                logger.error(f"Instagram API error: {error}")
                self._update_cursor_state(
                    user_id,
                    "instagram",
                    "comment_created",
                    message_count=0,
                    last_error_code=f"graph_{error.get('code')}",
                    last_error_message=error.get("message"),
                )
                return 0
            
            stored_count = 0
            media_items = response.get("data", [])

            # Fetch comments for recent media in parallel to reduce polling cycle latency.
            comment_payloads: list[tuple[str, dict]] = []
            if media_items:
                max_workers = min(8, len(media_items))
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    future_to_media_id = {
                        executor.submit(self._fetch_instagram_media_comments, media["id"]): media["id"]
                        for media in media_items
                    }
                    for future in as_completed(future_to_media_id):
                        media_id = future_to_media_id[future]
                        try:
                            comment_payloads.append(future.result())
                        except requests.exceptions.RequestException as req_error:
                            logger.warning(
                                "Could not fetch comments for media %s: %s",
                                media_id,
                                req_error,
                            )
                        except Exception as fetch_error:
                            logger.warning(
                                "Unexpected error fetching comments for media %s: %s",
                                media_id,
                                fetch_error,
                            )

            for media_id, comments_response in comment_payloads:
                if "error" in comments_response:
                    logger.warning(f"Could not fetch comments for media {media_id}: {comments_response['error']}")
                    continue

                for comment in comments_response.get("data", []):
                    # Skip hidden comments
                    if comment.get("hidden"):
                        continue

                    sender_id, sender_name = self._extract_sender(comment)
                    if not sender_id:
                        logger.debug("Skipping Instagram comment without sender: %s", comment.get("id"))
                        continue

                    # Ignore comments authored by the IG business account itself.
                    if str(sender_id) == str(self.ig_user_id):
                        continue

                    comment_time = self._parse_graph_timestamp(comment.get("timestamp"))
                    
                    channel_context = {
                        "object_id": comment["id"],
                        "thread_id": media_id,
                        "creator_id": sender_id,
                        "creator_name": sender_name,
                        "timestamp": comment_time,
                        "text": comment.get("text", ""),
                        "platform": "instagram",
                        "event_type": "comment_created",
                    }
                    
                    if self._store_automation_event(
                        user_id, "comment_created", "instagram", channel_context, datetime.utcnow()
                    ):
                        stored_count += 1
            
            self._update_cursor_state(
                user_id, "instagram", "comment_created",
                message_count=stored_count
            )
            
            logger.info(f"Fetched {stored_count} Instagram comments for user {user_id}")
            return stored_count
            
        except requests.exceptions.Timeout:
            logger.error(f"Instagram API timeout for user {user_id}")
            self._update_cursor_state(user_id, "instagram", "comment_created", message_count=0)
            return 0
        except requests.exceptions.RequestException as e:
            logger.warning(f"Instagram API request error for user {user_id}: {e}")
            self._update_cursor_state(user_id, "instagram", "comment_created", message_count=0)
            return 0
        except Exception as e:
            logger.error(f"Error fetching Instagram comments: {e}", exc_info=True)
            self._update_cursor_state(user_id, "instagram", "comment_created", message_count=0)
            return 0
    
    # ========== FACEBOOK DMs ==========
    
    def fetch_facebook_dms(self, user_id: str) -> int:
        """Fetch recent messages from Facebook DM conversations"""
        if not self.fb_page_id or not self.fb_token:
            logger.warning(f"Facebook credentials missing for user {user_id}, skipping")
            return 0
        
        try:
            state = self._get_cursor_state(user_id, "facebook", "dm_received")
            last_poll = state.get("last_poll_timestamp") or datetime.utcnow() - timedelta(hours=1)
            
            # Fetch recent conversations
            url = f"https://graph.facebook.com/{self.api_version}/{self.fb_page_id}/conversations"
            params = {
                "fields": "id,updated_time,participants,messages.limit(25).fields(id,message,from,created_time)",
                "limit": 10,
                "access_token": self.fb_token,
            }
            
            response = self._fetch_json(url, params, timeout=30)
            
            if "error" in response:
                error = response["error"]
                logger.error(f"Facebook API error: {error}")
                self._update_cursor_state(
                    user_id,
                    "facebook",
                    "dm_received",
                    message_count=0,
                    last_error_code=f"graph_{error.get('code')}",
                    last_error_message=error.get("message"),
                )
                return 0
            
            stored_count = 0
            
            for conversation in response.get("data", []):
                conversation_id = conversation["id"]
                messages = conversation.get("messages", {}).get("data", [])
                participants = conversation.get("participants", {}).get("data", [])
                
                # Find non-page participant (the customer)
                customer = None
                for p in participants:
                    if p["id"] != self.fb_page_id:
                        customer = p
                        break
                
                if not customer:
                    continue
                
                for message in messages:
                    sender_id, sender_name = self._extract_sender(message)
                    if not sender_id:
                        logger.debug("Skipping Facebook DM without sender: %s", message.get("id"))
                        continue

                    # Only process messages from customers (not from page/bot)
                    if sender_id == self.fb_page_id:
                        continue
                    
                    msg_time_naive = self._parse_graph_timestamp(message.get("created_time"))
                    
                    # Only store messages newer than last poll (avoid duplicates)
                    if msg_time_naive <= last_poll:
                        continue
                    
                    # Check 24-hour window for DM reply eligibility
                    hours_old = (datetime.utcnow() - msg_time_naive).total_seconds() / 3600
                    
                    channel_context = {
                        "object_id": message["id"],
                        "thread_id": conversation_id,
                        "creator_id": sender_id,
                        "creator_name": customer.get("name") or sender_name,
                        "timestamp": msg_time_naive,
                        "text": message.get("message", ""),
                        "platform": "facebook",
                        "event_type": "dm_received",
                        "hours_old": hours_old,  # For 24h window check
                    }
                    
                    if self._store_automation_event(
                        user_id, "dm_received", "facebook", channel_context, datetime.utcnow()
                    ):
                        # Upsert dm_thread document
                        dm_threads_collection.update_one(
                            {
                                "user_id": user_id,
                                "platform": "facebook",
                                "conversation_id": conversation_id,
                            },
                            {
                                "$set": {
                                    "last_message_at": msg_time_naive,
                                    "updated_at": datetime.utcnow(),
                                },
                                "$setOnInsert": dm_thread_document(
                                    user_id=user_id,
                                    platform="facebook",
                                    conversation_id=conversation_id,
                                    participant_id=sender_id,
                                    participant_name=customer.get("name") or sender_name,
                                    last_message_at=msg_time_naive,
                                ),
                            },
                            upsert=True,
                        )
                        stored_count += 1
            
            self._update_cursor_state(
                user_id, "facebook", "dm_received",
                message_count=stored_count
            )
            
            logger.info(f"Fetched {stored_count} Facebook DMs for user {user_id}")
            return stored_count
            
        except requests.exceptions.Timeout:
            logger.error(f"Facebook API timeout for user {user_id}")
            self._update_cursor_state(user_id, "facebook", "dm_received", message_count=0)
            return 0
        except requests.exceptions.RequestException as e:
            logger.warning(f"Facebook DM API request error for user {user_id}: {e}")
            self._update_cursor_state(user_id, "facebook", "dm_received", message_count=0)
            return 0
        except Exception as e:
            logger.error(f"Error fetching Facebook DMs: {e}", exc_info=True)
            self._update_cursor_state(user_id, "facebook", "dm_received", message_count=0)
            return 0
    
    # ========== INSTAGRAM DMs ==========
    
    def fetch_instagram_dms(self, user_id: str) -> int:
        """Fetch recent messages from Instagram DM conversations"""
        if not self.ig_user_id or not self.ig_token:
            logger.warning(f"Instagram credentials missing for user {user_id}, skipping")
            return 0
        
        try:
            state = self._get_cursor_state(user_id, "instagram", "dm_received")
            last_poll = state.get("last_poll_timestamp") or datetime.utcnow() - timedelta(hours=1)
            
            # Fetch recent conversations
            url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/conversations"
            params = {
                "fields": "id,updated_time,participants,messages.limit(25).fields(id,message,from,created_time,type)",
                "limit": 10,
                "access_token": self.ig_token,
            }
            
            response = self._fetch_json(url, params, timeout=30)
            
            if "error" in response:
                error = response["error"]
                logger.error(f"Instagram API error: {error}")
                self._update_cursor_state(
                    user_id,
                    "instagram",
                    "dm_received",
                    message_count=0,
                    last_error_code=f"graph_{error.get('code')}",
                    last_error_message=error.get("message"),
                )
                return 0
            
            stored_count = 0
            
            for conversation in response.get("data", []):
                conversation_id = conversation["id"]
                messages = conversation.get("messages", {}).get("data", [])
                participants = conversation.get("participants", {}).get("data", [])
                
                # Find non-business participant (the customer)
                customer = None
                for p in participants:
                    if p["id"] != self.ig_user_id:
                        customer = p
                        break
                
                if not customer:
                    continue
                
                for message in messages:
                    sender_id, sender_name = self._extract_sender(message)
                    if not sender_id:
                        logger.debug("Skipping Instagram DM without sender: %s", message.get("id"))
                        continue

                    # Only process customer messages; keep non-text excluded when type is explicit.
                    if sender_id == self.ig_user_id:
                        continue

                    msg_type = message.get("type")
                    if msg_type and msg_type != "text":
                        continue
                    
                    if "message" not in message:
                        continue
                    
                    msg_time_naive = self._parse_graph_timestamp(message.get("created_time"))
                    
                    # Only store messages newer than last poll
                    if msg_time_naive <= last_poll:
                        continue
                    
                    # Check 24-hour window
                    hours_old = (datetime.utcnow() - msg_time_naive).total_seconds() / 3600
                    
                    channel_context = {
                        "object_id": message["id"],
                        "thread_id": conversation_id,
                        "creator_id": sender_id,
                        "creator_name": customer.get("username") or sender_name,
                        "timestamp": msg_time_naive,
                        "text": message["message"],
                        "platform": "instagram",
                        "event_type": "dm_received",
                        "hours_old": hours_old,
                    }
                    
                    if self._store_automation_event(
                        user_id, "dm_received", "instagram", channel_context, datetime.utcnow()
                    ):
                        # Upsert dm_thread document
                        dm_threads_collection.update_one(
                            {
                                "user_id": user_id,
                                "platform": "instagram",
                                "conversation_id": conversation_id,
                            },
                            {
                                "$set": {
                                    "last_message_at": msg_time_naive,
                                    "updated_at": datetime.utcnow(),
                                },
                                "$setOnInsert": dm_thread_document(
                                    user_id=user_id,
                                    platform="instagram",
                                    conversation_id=conversation_id,
                                    participant_id=sender_id,
                                    participant_name=customer.get("username") or sender_name,
                                    last_message_at=msg_time_naive,
                                ),
                            },
                            upsert=True,
                        )
                        stored_count += 1
            
            self._update_cursor_state(
                user_id, "instagram", "dm_received",
                message_count=stored_count
            )
            
            logger.info(f"Fetched {stored_count} Instagram DMs for user {user_id}")
            return stored_count
            
        except requests.exceptions.Timeout:
            logger.error(f"Instagram API timeout for user {user_id}")
            self._update_cursor_state(user_id, "instagram", "dm_received", message_count=0)
            return 0
        except requests.exceptions.RequestException as e:
            logger.warning(f"Instagram DM API request error for user {user_id}: {e}")
            self._update_cursor_state(user_id, "instagram", "dm_received", message_count=0)
            return 0
        except Exception as e:
            logger.error(f"Error fetching Instagram DMs: {e}", exc_info=True)
            self._update_cursor_state(user_id, "instagram", "dm_received", message_count=0)
            return 0
