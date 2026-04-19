import requests
from app.config import config
from app.services.ai_service import AIService
import logging
from collections import OrderedDict
import hashlib

logger = logging.getLogger(__name__)

COMMENT_ANALYSIS_CACHE = OrderedDict()
COMMENT_ANALYSIS_CACHE_LIMIT = 1000
COMMENT_ANALYSIS_MAX_BATCH_CHARS = 12000
COMMENT_ANALYSIS_MAX_BATCH_ITEMS = 30
COMMENT_ANALYSIS_PROMPT_VERSION = "v2-multilingual-urdu"


class AnalyticsService:
    """Fetch media and engagement metrics from Facebook and Instagram"""
    
    def __init__(
        self,
        fb_page_id: str | None,
        fb_token: str | None,
        ig_user_id: str | None,
        ig_token: str | None,
    ):
        self.fb_page_id = fb_page_id
        self.fb_token = fb_token
        self.ig_user_id = ig_user_id
        self.ig_token = ig_token
        self.api_version = config.GRAPH_API_VERSION
        self.groq_model = getattr(config, "GROQ_MODEL", "llama-3.3-70b-versatile")

    def _fetch_graph_collection(self, url, params):
        """Fetch all pages from a Graph API collection endpoint."""
        items = []
        next_url = url
        next_params = dict(params)

        while next_url:
            response = requests.get(next_url, params=next_params, timeout=30).json()

            if "error" in response:
                return {"status": "error", "detail": response["error"].get("message", "Unknown error")}

            items.extend(response.get("data", []))
            next_url = response.get("paging", {}).get("next")
            next_params = None

        return {"status": "success", "data": items}

    def _cache_key_for_comment(self, comment: dict) -> str:
        comment_id = str(comment.get("id") or "")
        message = str(comment.get("message") or "")
        raw_key = f"{COMMENT_ANALYSIS_PROMPT_VERSION}:{comment_id}:{message}".encode("utf-8")
        return hashlib.sha256(raw_key).hexdigest()

    def _get_cached_analysis(self, comment: dict):
        cache_key = self._cache_key_for_comment(comment)
        cached = COMMENT_ANALYSIS_CACHE.get(cache_key)
        if cached is not None:
            COMMENT_ANALYSIS_CACHE.move_to_end(cache_key)
        return cached

    def _store_cached_analysis(self, comment: dict, analysis: dict):
        summary = str((analysis or {}).get("summary") or "").lower()
        # Avoid persisting transient fallback responses in cache.
        if "not configured" in summary or "failed" in summary or "unavailable" in summary:
            return

        cache_key = self._cache_key_for_comment(comment)
        COMMENT_ANALYSIS_CACHE[cache_key] = analysis
        COMMENT_ANALYSIS_CACHE.move_to_end(cache_key)
        while len(COMMENT_ANALYSIS_CACHE) > COMMENT_ANALYSIS_CACHE_LIMIT:
            COMMENT_ANALYSIS_CACHE.popitem(last=False)

    def _analyze_comment_batch(self, comments: list) -> dict:
        """Analyze a group of comments in a single model call, then map results back to ids."""
        pending = []
        for comment in comments:
            if not isinstance(comment, dict):
                continue
            cached = self._get_cached_analysis(comment)
            if cached is not None:
                comment["analysis"] = cached
                continue
            pending.append(comment)

        if not pending:
            return {"status": "success", "analysis_model": self.groq_model, "analyzed": 0}

        chunks = []
        current_chunk = []
        current_size = 0
        for comment in pending:
            comment_size = len(str(comment.get("message") or "")) + len(str(comment.get("author") or "")) + 32
            should_split = current_chunk and (
                len(current_chunk) >= COMMENT_ANALYSIS_MAX_BATCH_ITEMS
                or current_size + comment_size > COMMENT_ANALYSIS_MAX_BATCH_CHARS
            )
            if should_split:
                chunks.append(current_chunk)
                current_chunk = []
                current_size = 0
            current_chunk.append(comment)
            current_size += comment_size

        if current_chunk:
            chunks.append(current_chunk)

        result_map = {}
        analysis_model = self.groq_model
        for chunk in chunks:
            batch_result = AIService.analyze_comment_batch(chunk, language="auto", model_name=self.groq_model)
            analysis_model = batch_result.get("model", analysis_model)
            for item in batch_result.get("results", []):
                item_id = str(item.get("id"))
                result_map[item_id] = item.get("analysis")

        analyzed_count = 0
        for comment in pending:
            comment_id = str(comment.get("id") or "")
            analysis = result_map.get(comment_id)
            if analysis is None:
                text = (comment.get("message") or "").strip()
                if not text:
                    analysis = {
                        "sentiment": "neutral",
                        "confidence": 0.0,
                        "emotions": [],
                        "summary": "No text provided for analysis.",
                        "model": self.groq_model,
                    }
                else:
                    analysis = {
                        "sentiment": "neutral",
                        "confidence": 0.0,
                        "emotions": [],
                        "summary": "Groq analysis unavailable for this comment.",
                        "model": self.groq_model,
                    }

            comment["analysis"] = analysis
            self._store_cached_analysis(comment, analysis)
            analyzed_count += 1

        return {"status": "success", "analysis_model": analysis_model, "analyzed": analyzed_count}

    def _apply_comment_analysis(self, comments: list, include_replies: bool = False) -> None:
        """Apply comment analysis to a list of comments and optionally recurse into replies."""
        self._analyze_comment_batch(comments)

        if not include_replies:
            return

        for comment in comments:
            replies = comment.get("replies")
            if isinstance(replies, list) and replies:
                self._apply_comment_analysis(replies, include_replies=True)

    def get_facebook_posts(self, limit=25):
        """
        Fetch recent Facebook posts with engagement metrics
        Returns: list of posts with id, message, created_time, likes, comments, shares
        """
        if not self.fb_page_id or not self.fb_token:
            return {"status": "error", "detail": "Facebook credentials not configured"}
        
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{self.fb_page_id}/posts"
            params = {
                "fields": "id,message,created_time,full_picture,permalink_url,reactions.summary(true),reactions.type(LIKE).limit(0).summary(total_count).as(reaction_like),reactions.type(LOVE).limit(0).summary(total_count).as(reaction_love),reactions.type(HAHA).limit(0).summary(total_count).as(reaction_haha),reactions.type(WOW).limit(0).summary(total_count).as(reaction_wow),reactions.type(SAD).limit(0).summary(total_count).as(reaction_sad),reactions.type(ANGRY).limit(0).summary(total_count).as(reaction_angry),comments.summary(true),shares",
                "limit": limit,
                "access_token": self.fb_token
            }
            
            response = requests.get(url, params=params, timeout=30).json()
            
            if "error" in response:
                logger.error(f"Facebook API error: {response['error']}")
                return {"status": "error", "detail": response["error"].get("message", "Unknown error")}
            
            posts = []
            for post in response.get("data", []):
                reaction_counts = {
                    "LIKE": post.get("reaction_like", {}).get("summary", {}).get("total_count", 0),
                    "LOVE": post.get("reaction_love", {}).get("summary", {}).get("total_count", 0),
                    "HAHA": post.get("reaction_haha", {}).get("summary", {}).get("total_count", 0),
                    "WOW": post.get("reaction_wow", {}).get("summary", {}).get("total_count", 0),
                    "SAD": post.get("reaction_sad", {}).get("summary", {}).get("total_count", 0),
                    "ANGRY": post.get("reaction_angry", {}).get("summary", {}).get("total_count", 0),
                }
                posts.append({
                    "id": post.get("id"),
                    "platform": "facebook",
                    "message": post.get("message", ""),
                    "created_time": post.get("created_time"),
                    "image": post.get("full_picture"),
                    "permalink": post.get("permalink_url"),
                    # Keep `likes` for backwards compatibility with existing UI code.
                    "likes": post.get("reactions", {}).get("summary", {}).get("total_count", 0),
                    "reactions_total": post.get("reactions", {}).get("summary", {}).get("total_count", 0),
                    "reaction_counts": reaction_counts,
                    "comments": post.get("comments", {}).get("summary", {}).get("total_count", 0),
                    "shares": post.get("shares", {}).get("count", 0)
                })
            
            return {"status": "success", "posts": posts}
            
        except requests.exceptions.Timeout:
            logger.error("Facebook API timeout")
            return {"status": "error", "detail": "Request timeout"}
        except Exception as e:
            logger.error(f"Error fetching Facebook posts: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    def get_instagram_media(self, limit=25):
        """
        Fetch recent Instagram media with engagement metrics
        Returns: list of media with id, caption, timestamp, media_type, media_url, likes, comments
        """
        if not self.ig_user_id or not self.ig_token:
            return {"status": "error", "detail": "Instagram credentials not configured"}
        
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media"
            params = {
                "fields": "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count",
                "limit": limit,
                "access_token": self.ig_token
            }
            
            response = requests.get(url, params=params, timeout=30).json()
            
            if "error" in response:
                logger.error(f"Instagram API error: {response['error']}")
                return {"status": "error", "detail": response["error"].get("message", "Unknown error")}
            
            media = []
            for item in response.get("data", []):
                media.append({
                    "id": item.get("id"),
                    "platform": "instagram",
                    "caption": item.get("caption", ""),
                    "created_time": item.get("timestamp"),
                    "media_type": item.get("media_type"),
                    "image": item.get("media_url") or item.get("thumbnail_url"),
                    "permalink": item.get("permalink"),
                    "likes": item.get("like_count", 0),
                    "comments": item.get("comments_count", 0),
                    "shares": 0  # Instagram Graph API doesn't provide shares count
                })
            
            return {"status": "success", "posts": media}
            
        except requests.exceptions.Timeout:
            logger.error("Instagram API timeout")
            return {"status": "error", "detail": "Request timeout"}
        except Exception as e:
            logger.error(f"Error fetching Instagram media: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    def get_all_media(self, limit=25):
        """
        Fetch media from both Facebook and Instagram
        Returns: combined list sorted by creation time
        """
        fb_result = self.get_facebook_posts(limit)
        ig_result = self.get_instagram_media(limit)
        
        all_posts = []
        errors = []
        
        if fb_result["status"] == "success":
            all_posts.extend(fb_result["posts"])
        else:
            errors.append(f"Facebook: {fb_result['detail']}")
        
        if ig_result["status"] == "success":
            all_posts.extend(ig_result["posts"])
        else:
            errors.append(f"Instagram: {ig_result['detail']}")
        
        # Sort by created_time (most recent first)
        all_posts.sort(key=lambda x: x.get("created_time", ""), reverse=True)
        
        return {
            "status": "success" if all_posts else "error",
            "posts": all_posts,
            "errors": errors if errors else None
        }

    def get_post_comments(self, post_id, platform="facebook", include_analysis: bool = False, include_replies: bool = False):
        """
        Fetch comments for a specific post
        """
        if platform == "facebook":
            return self._get_facebook_comments(post_id, include_analysis=include_analysis, include_replies=include_replies)
        elif platform == "instagram":
            return self._get_instagram_comments(post_id, include_analysis=include_analysis, include_replies=include_replies)
        else:
            return {"status": "error", "detail": "Invalid platform"}

    def get_comment_replies(self, comment_id, platform="facebook"):
        """Fetch replies for a specific comment on demand."""
        if platform == "facebook":
            replies = self._get_facebook_comment_replies(comment_id)
            return {"status": "success", "replies": replies}
        if platform == "instagram":
            replies = self._get_instagram_comment_replies(comment_id)
            return {"status": "success", "replies": replies}
        return {"status": "error", "detail": "Invalid platform"}

    def get_post_likes(self, post_id, platform="facebook"):
        """Fetch people who reacted to a post/media when the platform API supports it."""
        if platform == "facebook":
            return self._get_facebook_post_likes(post_id)
        if platform == "instagram":
            return {
                "status": "error",
                "detail": "Instagram Graph API does not provide a liker identity list for media.",
            }
        if platform == "linkedin":
            return {
                "status": "error",
                "detail": "LinkedIn liker identity list is not available in this analytics flow.",
            }
        return {"status": "error", "detail": "Invalid platform"}

    def _get_facebook_post_likes(self, post_id):
        """Fetch Facebook reactions (user + reaction type) for a post."""
        if not self.fb_token:
            return {"status": "error", "detail": "Facebook credentials not configured"}

        try:
            url = f"https://graph.facebook.com/{self.api_version}/{post_id}/reactions"
            params = {
                "fields": "id,name,type",
                "limit": 100,
                "access_token": self.fb_token,
            }

            collection = self._fetch_graph_collection(url, params)
            if collection["status"] != "success":
                return collection

            likers = []
            for reaction in collection.get("data", []):
                likers.append({
                    "id": reaction.get("id"),
                    "name": reaction.get("name") or "Facebook User",
                    "reaction": reaction.get("type") or "LIKE",
                })

            return {
                "status": "success",
                "likers": likers,
                "total": len(likers),
            }
        except Exception as e:
            logger.error(f"Error fetching Facebook reactions for post {post_id}: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    def _get_facebook_comments(self, post_id, include_analysis: bool = False, include_replies: bool = False):
        """Fetch comments for a Facebook post"""
        if not self.fb_token:
            return {"status": "error", "detail": "Facebook credentials not configured"}
        
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{post_id}/comments"
            params = {
                "fields": "id,from,message,created_time,like_count",
                "access_token": self.fb_token
            }

            collection = self._fetch_graph_collection(url, params)
            if collection["status"] != "success":
                return collection
            
            comments = []
            for comment in collection.get("data", []):
                author_info = comment.get("from") or {}
                author_name = author_info.get("name") or author_info.get("id") or "Facebook User"
                replies = self._get_facebook_comment_replies(comment.get("id")) if include_replies else []
                comments.append({
                    "id": comment.get("id"),
                    "author": author_name,
                    "message": comment.get("message", ""),
                    "created_time": comment.get("created_time"),
                    "likes": comment.get("like_count", 0),
                    "replies": replies
                })

            if include_analysis:
                self._apply_comment_analysis(comments, include_replies=include_replies)
            
            return {"status": "success", "comments": comments}
            
        except Exception as e:
            logger.error(f"Error fetching Facebook comments: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    def _get_instagram_comments(self, media_id, include_analysis: bool = False, include_replies: bool = False):
        """Fetch comments for an Instagram media"""
        if not self.ig_token:
            return {"status": "error", "detail": "Instagram credentials not configured"}
        
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{media_id}/comments"
            params = {
                "fields": "id,username,text,timestamp,like_count",
                "access_token": self.ig_token
            }

            collection = self._fetch_graph_collection(url, params)
            if collection["status"] != "success":
                return collection
            
            comments = []
            for comment in collection.get("data", []):
                replies = self._get_instagram_comment_replies(comment.get("id")) if include_replies else []
                comments.append({
                    "id": comment.get("id"),
                    "author": comment.get("username", "Unknown"),
                    "message": comment.get("text", ""),
                    "created_time": comment.get("timestamp"),
                    "likes": comment.get("like_count", 0),
                    "replies": replies
                })

            if include_analysis:
                self._apply_comment_analysis(comments, include_replies=include_replies)
            
            return {"status": "success", "comments": comments}
            
        except Exception as e:
            logger.error(f"Error fetching Instagram comments: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    def _get_facebook_comment_replies(self, comment_id):
        """Fetch replies for a Facebook comment"""
        if not comment_id or not self.fb_token:
            return []

        try:
            url = f"https://graph.facebook.com/{self.api_version}/{comment_id}/comments"
            params = {
                "fields": "id,from,message,created_time,like_count",
                "access_token": self.fb_token,
            }

            collection = self._fetch_graph_collection(url, params)
            if collection["status"] != "success":
                logger.warning(f"Facebook replies fetch error for {comment_id}: {collection.get('detail')}")
                return []

            replies = []
            for reply in collection.get("data", []):
                author_info = reply.get("from") or {}
                author_name = author_info.get("name") or author_info.get("id") or "Facebook User"
                replies.append({
                    "id": reply.get("id"),
                    "author": author_name,
                    "message": reply.get("message", ""),
                    "created_time": reply.get("created_time"),
                    "likes": reply.get("like_count", 0),
                })

            return replies
        except Exception as e:
            logger.warning(f"Error fetching Facebook comment replies for {comment_id}: {e}")
            return []

    def _enrich_comment_analysis(self, comments):
        """Backward-compatible alias for comment analysis enrichment."""
        self._apply_comment_analysis(comments, include_replies=True)

    def _get_instagram_comment_replies(self, comment_id):
        """Fetch replies for an Instagram comment"""
        if not comment_id or not self.ig_token:
            return []

        try:
            url = f"https://graph.facebook.com/{self.api_version}/{comment_id}/replies"
            params = {
                "fields": "id,username,text,timestamp,like_count",
                "access_token": self.ig_token,
            }

            collection = self._fetch_graph_collection(url, params)
            if collection["status"] != "success":
                logger.warning(f"Instagram replies fetch error for {comment_id}: {collection.get('detail')}")
                return []

            replies = []
            for reply in collection.get("data", []):
                replies.append({
                    "id": reply.get("id"),
                    "author": reply.get("username", "Unknown"),
                    "message": reply.get("text", ""),
                    "created_time": reply.get("timestamp"),
                    "likes": reply.get("like_count", 0),
                })

            return replies
        except Exception as e:
            logger.warning(f"Error fetching Instagram comment replies for {comment_id}: {e}")
            return []

    def reply_to_comment(self, comment_id, message, platform="facebook"):
        """Reply to a Facebook or Instagram comment"""
        if platform == "facebook":
            return self._reply_facebook_comment(comment_id, message)
        elif platform == "instagram":
            return self._reply_instagram_comment(comment_id, message)
        return {"status": "error", "detail": "Invalid platform"}

    def _reply_facebook_comment(self, comment_id, message):
        if not self.fb_token:
            return {"status": "error", "detail": "Facebook credentials not configured"}

        try:
            url = f"https://graph.facebook.com/{self.api_version}/{comment_id}/comments"
            payload = {
                "message": message,
                "access_token": self.fb_token,
            }
            response = requests.post(url, data=payload, timeout=30).json()

            if "error" in response:
                return {"status": "error", "detail": response["error"].get("message", "Failed to reply")}

            return {"status": "success", "reply_id": response.get("id"), "message": "Reply posted"}
        except Exception as e:
            logger.error(f"Error replying to Facebook comment: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    def _reply_instagram_comment(self, comment_id, message):
        if not self.ig_token:
            return {"status": "error", "detail": "Instagram credentials not configured"}

        try:
            url = f"https://graph.facebook.com/{self.api_version}/{comment_id}/replies"
            payload = {
                "message": message,
                "access_token": self.ig_token,
            }
            response = requests.post(url, data=payload, timeout=30).json()

            if "error" in response:
                return {"status": "error", "detail": response["error"].get("message", "Failed to reply")}

            return {"status": "success", "reply_id": response.get("id"), "message": "Reply posted"}
        except Exception as e:
            logger.error(f"Error replying to Instagram comment: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}
