import logging
from typing import Dict, Any, List
from datetime import datetime
import google.generativeai as genai
from app.config.config import GEMINI_API_KEY
from app.services.database import db

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# MongoDB collections
linkedin_settings_collection = db["linkedin_settings"]
linkedin_comments_collection = db["linkedin_comments"]


class CommentReplyService:
    """Service for AI-powered comment auto-replies on LinkedIn posts"""
    
    def __init__(self, user_id: str):
        """
        Initialize comment reply service
        
        Args:
            user_id: User ID from MongoDB
        """
        self.user_id = user_id
    
    def get_user_settings(self) -> Dict[str, Any]:
        """Get user's auto-reply settings from database"""
        settings = linkedin_settings_collection.find_one({"user_id": self.user_id})
        
        if not settings:
            # Return default settings
            return {
                "auto_reply_enabled": False,
                "reply_tone": "professional",
                "reply_delay_minutes": 5,
            }
        
        return {
            "auto_reply_enabled": settings.get("auto_reply_enabled", False),
            "reply_tone": settings.get("reply_tone", "professional"),
            "reply_delay_minutes": settings.get("reply_delay_minutes", 5),
        }
    
    def update_user_settings(self, settings: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user's auto-reply settings
        
        Args:
            settings: Dictionary with settings to update
            
        Returns:
            Dictionary with status
        """
        try:
            linkedin_settings_collection.update_one(
                {"user_id": self.user_id},
                {"$set": {
                    **settings,
                    "updated_at": datetime.utcnow()
                }},
                upsert=True
            )
            return {"status": "success", "message": "Settings updated successfully"}
        except Exception as exc:
            logger.error(f"Failed to update settings: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}
    
    def is_comment_replied(self, comment_id: str) -> bool:
        """
        Check if comment has already been replied to
        
        Args:
            comment_id: LinkedIn comment ID or URN
            
        Returns:
            True if already replied, False otherwise
        """
        existing = linkedin_comments_collection.find_one({
            "user_id": self.user_id,
            "comment_id": comment_id,
            "status": "replied"
        })
        return existing is not None
    
    def mark_comment_replied(self, comment_id: str, comment_text: str, reply_text: str, post_id: str = None) -> None:
        """
        Mark comment as replied in database
        
        Args:
            comment_id: LinkedIn comment ID
            comment_text: Original comment text
            reply_text: AI-generated reply text
            post_id: Associated post ID (optional)
        """
        try:
            linkedin_comments_collection.update_one(
                {
                    "user_id": self.user_id,
                    "comment_id": comment_id
                },
                {
                    "$set": {
                        "comment_text": comment_text,
                        "reply_text": reply_text,
                        "post_id": post_id,
                        "replied_at": datetime.utcnow(),
                        "status": "replied"
                    }
                },
                upsert=True
            )
        except Exception as exc:
            logger.error(f"Failed to mark comment as replied: {exc}", exc_info=True)
    
    def generate_ai_reply(self, comment_text: str, post_context: str = "", tone: str = "professional") -> Dict[str, Any]:
        """
        Generate AI-powered reply using Gemini
        
        Args:
            comment_text: The comment to reply to
            post_context: Optional context about the post (title, caption)
            tone: Reply tone (professional, friendly, casual)
            
        Returns:
            Dictionary with status and generated reply text
        """
        try:
            # Build prompt based on tone
            tone_instructions = {
                "professional": "Respond in a professional, courteous business tone. Keep it concise and respectful.",
                "friendly": "Respond in a warm, friendly, and approachable tone. Be enthusiastic but not overly casual.",
                "casual": "Respond in a casual, conversational tone. Be authentic and relatable."
            }
            
            tone_instruction = tone_instructions.get(tone, tone_instructions["professional"])
            
            prompt = f"""You are a social media manager responding to a comment on a LinkedIn post.

Post Context: {post_context if post_context else "General business post"}

Comment from user: "{comment_text}"

Instructions:
- {tone_instruction}
- Keep reply under 100 words
- Be helpful and engaging
- Thank them if appropriate
- Don't use hashtags
- Don't be overly salesy or promotional

Generate a reply:"""
            
            model = genai.GenerativeModel("gemini-2.0-flash-exp")
            response = model.generate_content(prompt)
            
            if response and response.text:
                reply_text = response.text.strip()
                return {
                    "status": "success",
                    "reply": reply_text
                }
            else:
                return {"status": "error", "detail": "AI failed to generate reply"}
                
        except Exception as exc:
            logger.error(f"Failed to generate AI reply: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}
    
    def process_pending_comments(
        self, 
        linkedin_service, 
        post_urn: str,
        post_title: str = ""
    ) -> Dict[str, Any]:
        """
        Process all pending comments on a post and generate auto-replies
        
        Args:
            linkedin_service: Instance of LinkedInService
            post_urn: URN of the post to check
            post_title: Title/caption of the post for context
            
        Returns:
            Dictionary with processing summary
        """
        try:
            settings = self.get_user_settings()
            
            if not settings["auto_reply_enabled"]:
                return {
                    "status": "skipped",
                    "message": "Auto-reply is disabled"
                }
            
            # Fetch comments on the post
            comments_result = linkedin_service.fetch_comments(post_urn, limit=50)
            
            if comments_result.get("status") != "success":
                return {
                    "status": "error",
                    "detail": f"Failed to fetch comments: {comments_result.get('detail')}"
                }
            
            comments = comments_result.get("comments", [])
            replied_count = 0
            skipped_count = 0
            failed_count = 0
            
            for comment in comments:
                comment_id = comment.get("comment_id")
                comment_urn = comment.get("comment_urn")
                comment_text = comment.get("text", "")
                
                # Skip if already replied
                if self.is_comment_replied(comment_id):
                    skipped_count += 1
                    continue
                
                # Skip empty comments
                if not comment_text.strip():
                    skipped_count += 1
                    continue
                
                # Generate AI reply
                reply_result = self.generate_ai_reply(
                    comment_text=comment_text,
                    post_context=post_title,
                    tone=settings["reply_tone"]
                )
                
                if reply_result.get("status") != "success":
                    logger.warning(f"Failed to generate reply for comment {comment_id}")
                    failed_count += 1
                    continue
                
                reply_text = reply_result["reply"]
                
                # Post reply to LinkedIn
                post_result = linkedin_service.reply_to_comment(
                    post_urn=post_urn,
                    parent_comment_urn=comment_urn,
                    reply_text=reply_text
                )
                
                if post_result.get("status") == "success":
                    # Mark as replied in database
                    self.mark_comment_replied(
                        comment_id=comment_id,
                        comment_text=comment_text,
                        reply_text=reply_text,
                        post_id=post_urn
                    )
                    replied_count += 1
                    logger.info(f"Successfully replied to comment {comment_id}")
                else:
                    failed_count += 1
                    logger.warning(f"Failed to post reply to comment {comment_id}: {post_result.get('detail')}")
            
            return {
                "status": "success",
                "replied": replied_count,
                "skipped": skipped_count,
                "failed": failed_count,
                "total_comments": len(comments)
            }
            
        except Exception as exc:
            logger.error(f"Failed to process comments: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}
    
    def get_reply_history(self, limit: int = 50) -> Dict[str, Any]:
        """
        Get history of auto-replied comments
        
        Args:
            limit: Maximum number of records to return
            
        Returns:
            Dictionary with list of replied comments
        """
        try:
            replies = list(
                linkedin_comments_collection.find(
                    {"user_id": self.user_id, "status": "replied"}
                )
                .sort("replied_at", -1)
                .limit(limit)
            )
            
            # Convert ObjectId to string for JSON serialization
            for reply in replies:
                reply["_id"] = str(reply["_id"])
            
            return {
                "status": "success",
                "replies": replies,
                "count": len(replies)
            }
            
        except Exception as exc:
            logger.error(f"Failed to get reply history: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}

