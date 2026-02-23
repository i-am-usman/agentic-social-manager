import requests
from app.config import config
import logging

logger = logging.getLogger(__name__)


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
                "fields": "id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares",
                "limit": limit,
                "access_token": self.fb_token
            }
            
            response = requests.get(url, params=params, timeout=30).json()
            
            if "error" in response:
                logger.error(f"Facebook API error: {response['error']}")
                return {"status": "error", "detail": response["error"].get("message", "Unknown error")}
            
            posts = []
            for post in response.get("data", []):
                posts.append({
                    "id": post.get("id"),
                    "platform": "facebook",
                    "message": post.get("message", ""),
                    "created_time": post.get("created_time"),
                    "image": post.get("full_picture"),
                    "permalink": post.get("permalink_url"),
                    "likes": post.get("likes", {}).get("summary", {}).get("total_count", 0),
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

    def get_post_comments(self, post_id, platform="facebook"):
        """
        Fetch comments for a specific post
        """
        if platform == "facebook":
            return self._get_facebook_comments(post_id)
        elif platform == "instagram":
            return self._get_instagram_comments(post_id)
        else:
            return {"status": "error", "detail": "Invalid platform"}

    def _get_facebook_comments(self, post_id):
        """Fetch comments for a Facebook post"""
        if not self.fb_token:
            return {"status": "error", "detail": "Facebook credentials not configured"}
        
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{post_id}/comments"
            params = {
                "fields": "id,from,message,created_time,like_count",
                "access_token": self.fb_token
            }
            
            response = requests.get(url, params=params, timeout=30).json()
            
            if "error" in response:
                return {"status": "error", "detail": response["error"].get("message")}
            
            comments = []
            for comment in response.get("data", []):
                comments.append({
                    "id": comment.get("id"),
                    "author": comment.get("from", {}).get("name", "Unknown"),
                    "message": comment.get("message", ""),
                    "created_time": comment.get("created_time"),
                    "likes": comment.get("like_count", 0),
                    "replies": self._get_facebook_comment_replies(comment.get("id"))
                })
            
            return {"status": "success", "comments": comments}
            
        except Exception as e:
            logger.error(f"Error fetching Facebook comments: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}

    def _get_instagram_comments(self, media_id):
        """Fetch comments for an Instagram media"""
        if not self.ig_token:
            return {"status": "error", "detail": "Instagram credentials not configured"}
        
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{media_id}/comments"
            params = {
                "fields": "id,username,text,timestamp,like_count",
                "access_token": self.ig_token
            }
            
            response = requests.get(url, params=params, timeout=30).json()
            
            if "error" in response:
                return {"status": "error", "detail": response["error"].get("message")}
            
            comments = []
            for comment in response.get("data", []):
                comments.append({
                    "id": comment.get("id"),
                    "author": comment.get("username", "Unknown"),
                    "message": comment.get("text", ""),
                    "created_time": comment.get("timestamp"),
                    "likes": comment.get("like_count", 0),
                    "replies": self._get_instagram_comment_replies(comment.get("id"))
                })
            
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
            response = requests.get(url, params=params, timeout=30).json()

            if "error" in response:
                logger.warning(f"Facebook replies fetch error for {comment_id}: {response['error']}")
                return []

            replies = []
            for reply in response.get("data", []):
                replies.append({
                    "id": reply.get("id"),
                    "author": reply.get("from", {}).get("name", "Unknown"),
                    "message": reply.get("message", ""),
                    "created_time": reply.get("created_time"),
                    "likes": reply.get("like_count", 0),
                })

            return replies
        except Exception as e:
            logger.warning(f"Error fetching Facebook comment replies for {comment_id}: {e}")
            return []

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
            response = requests.get(url, params=params, timeout=30).json()

            if "error" in response:
                logger.warning(f"Instagram replies fetch error for {comment_id}: {response['error']}")
                return []

            replies = []
            for reply in response.get("data", []):
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
