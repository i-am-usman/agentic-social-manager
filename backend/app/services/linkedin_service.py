import requests
import time
import logging
from typing import List, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class LinkedInService:
    """Service for publishing content to LinkedIn Personal Profile"""
    
    def __init__(self, user_id: str, access_token: str, job_tracker=None, job_id=None):
        """
        Initialize LinkedIn service
        
        Args:
            user_id: LinkedIn user ID (e.g., "17841477977449512" without "urn:li:person:")
            access_token: LinkedIn access token with w_member_social scope
            job_tracker: Optional job tracker for progress updates
            job_id: Optional job ID for this publishing operation
        """
        self.user_id = user_id
        self.token = access_token
        self.job_tracker = job_tracker
        self.job_id = job_id
        self.api_version = "v2"
        self.base_url = "https://api.linkedin.com/v2"
    
    def _update_progress(self, status: str, progress: int, message: str, platform_status: Dict[str, str] = None):
        """Update job progress if job_tracker is available"""
        if self.job_tracker and self.job_id:
            self.job_tracker.update_job(
                self.job_id,
                status=status,
                progress=progress,
                message=message,
                platform_status=platform_status
            )
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None, files: Dict = None, timeout: int = 30) -> Dict[str, Any]:
        """Make authenticated request to LinkedIn API"""
        url = f"{self.base_url}{endpoint}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json" if not files else None,
            "LinkedIn-Version": "202401",
            "X-Restli-Protocol-Version": "2.0.0"
        }
        headers = {k: v for k, v in headers.items() if v is not None}
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == "POST":
                response = requests.post(url, json=data, files=files, headers=headers, timeout=timeout)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=timeout)
            else:
                return {"status": "error", "detail": f"Unsupported HTTP method: {method}"}
            
            response.raise_for_status()
            return response.json() if response.text else {"status": "success"}
        except requests.exceptions.Timeout:
            return {"status": "error", "detail": "LinkedIn API request timed out"}
        except requests.exceptions.HTTPError as exc:
            try:
                error_data = exc.response.json()
                return {"status": "error", "detail": error_data.get("message", str(exc))}
            except:
                return {"status": "error", "detail": f"HTTP {exc.response.status_code}: {exc.response.text}"}
        except Exception as exc:
            logger.error(f"LinkedIn API error: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}
    
    def _register_upload(self, file_size: int) -> str:
        """Register file upload and get upload URL"""
        endpoint = "/assets?action=registerUpload"
        payload = {
            "registerUploadRequest": {
                "owner": f"urn:li:person:{self.user_id}",
                "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                "serviceRelationships": [
                    {
                        "relationshipType": "OWNER",
                        "identifier": "urn:li:userGeneratedContent"
                    }
                ],
                "supportedUploadMechanism": ["SYNCHRONOUS_UPLOAD"],
                "fileSize": file_size,
            }
        }
        
        response = self._make_request("POST", endpoint, data=payload)
        
        if "value" in response and "uploadMechanism" in response["value"]:
            upload_url = response["value"]["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
            asset_id = response["value"].get("asset")
            return asset_id, upload_url
        
        logger.error(f"Upload registration failed: {response}")
        return None, None
    
    def _upload_file(self, file_url: str, upload_url: str, file_data: bytes) -> bool:
        """Upload file to LinkedIn's storage"""
        try:
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/octet-stream",
                "media-type-family": "STILLIMAGE"
            }
            response = requests.put(upload_url, data=file_data, headers=headers, timeout=60)
            response.raise_for_status()
            return True
        except Exception as exc:
            logger.error(f"File upload failed: {exc}")
            return False
    
    def _download_file_bytes(self, url: str) -> bytes:
        """Download file from URL as bytes"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.content
        except Exception as exc:
            logger.error(f"File download failed: {exc}")
            return None
    
    def publish_text(self, text: str) -> Dict[str, Any]:
        """
        Publish text-only post to LinkedIn
        
        Args:
            text: Post content (text + hashtags)
        
        Returns:
            Dictionary with status and response data
        """
        if not text or not text.strip():
            return {"status": "error", "detail": "Text content cannot be empty"}
        
        self._update_progress("publishing", 20, "Publishing text post to LinkedIn...", {"linkedin": "publishing"})
        
        endpoint = "/ugcPosts"
        payload = {
            "author": f"urn:li:person:{self.user_id}",
            "lifecycleState": "PUBLISHED",
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareMediaCategory": "NONE",
                    "shareCommentary": {
                        "text": text
                    }
                }
            }
        }
        
        try:
            response = self._make_request("POST", endpoint, data=payload)
            
            if "value" in response or "id" in response:
                post_id = response.get("value") or response.get("id")
                self._update_progress("publishing", 90, f"Text post published: {post_id}", {"linkedin": "completed"})
                return {
                    "status": "success",
                    "data": {
                        "post_id": post_id,
                        "type": "text",
                        "message": f"Successfully published text post"
                    }
                }
            else:
                error_msg = response.get("detail", "Unknown error")
                self._update_progress("publishing", 50, f"Failed: {error_msg}", {"linkedin": "failed"})
                return {"status": "error", "detail": error_msg}
        except Exception as exc:
            error_msg = str(exc)
            self._update_progress("publishing", 50, f"Error: {error_msg}", {"linkedin": "failed"})
            logger.error(f"Text publishing failed: {exc}", exc_info=True)
            return {"status": "error", "detail": error_msg}
    
    def publish_photo(self, image_urls: List[str], caption: str) -> Dict[str, Any]:
        """
        Publish photo(s) to LinkedIn
        
        Args:
            image_urls: List of image URLs (URLs will be downloaded and uploaded)
            caption: Post caption
        
        Returns:
            Dictionary with status and response data
        """
        if not image_urls:
            return {"status": "error", "detail": "No images provided"}
        
        if not caption or not caption.strip():
            return {"status": "error", "detail": "Caption cannot be empty"}
        
        self._update_progress("publishing", 20, "Registering images for upload...", {"linkedin": "publishing"})
        
        # Limit to 9 images per LinkedIn post
        image_urls = image_urls[:9]
        assets = []
        
        for idx, image_url in enumerate(image_urls):
            progress = 20 + int(40 * idx / len(image_urls))
            self._update_progress("publishing", progress, f"Processing image {idx + 1}/{len(image_urls)}...", {"linkedin": "publishing"})
            
            try:
                # Download file
                file_data = self._download_file_bytes(image_url)
                if not file_data:
                    logger.warning(f"Failed to download image: {image_url}")
                    continue
                
                # Register upload
                asset_id, upload_url = self._register_upload(len(file_data))
                if not asset_id or not upload_url:
                    logger.warning(f"Failed to register upload for: {image_url}")
                    continue
                
                # Upload file
                if self._upload_file(image_url, upload_url, file_data):
                    assets.append(asset_id)
                    logger.info(f"Image uploaded: {asset_id}")
                else:
                    logger.warning(f"Failed to upload image: {image_url}")
            except Exception as exc:
                logger.error(f"Image processing failed for {image_url}: {exc}")
                continue
        
        if not assets:
            error_msg = "Failed to upload all images"
            self._update_progress("publishing", 50, error_msg, {"linkedin": "failed"})
            return {"status": "error", "detail": error_msg}
        
        self._update_progress("publishing", 70, f"Creating post with {len(assets)} image(s)...", {"linkedin": "publishing"})
        
        # Create post with images
        endpoint = "/ugcPosts"
        media = [{"status": "READY", "media": asset} for asset in assets]
        
        payload = {
            "author": f"urn:li:person:{self.user_id}",
            "lifecycleState": "PUBLISHED",
            "visibility": {
                "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
            },
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareMediaCategory": "IMAGE",
                    "media": media,
                    "shareCommentary": {
                        "text": caption
                    }
                }
            }
        }
        
        try:
            response = self._make_request("POST", endpoint, data=payload)
            
            if "value" in response or "id" in response:
                post_id = response.get("value") or response.get("id")
                self._update_progress("publishing", 100, f"Photo post published: {post_id}", {"linkedin": "completed"})
                return {
                    "status": "success",
                    "data": {
                        "post_id": post_id,
                        "type": "photo",
                        "image_count": len(assets),
                        "message": f"Successfully published photo post with {len(assets)} image(s)"
                    }
                }
            else:
                error_msg = response.get("detail", "Unknown error")
                self._update_progress("publishing", 75, f"Failed: {error_msg}", {"linkedin": "failed"})
                return {"status": "error", "detail": error_msg}
        except Exception as exc:
            error_msg = str(exc)
            self._update_progress("publishing", 75, f"Error: {error_msg}", {"linkedin": "failed"})
            logger.error(f"Photo posting failed: {exc}", exc_info=True)
            return {"status": "error", "detail": error_msg}
    
    def publish_video(self, video_url: str, caption: str) -> Dict[str, Any]:
        """
        Publish video to LinkedIn
        
        Args:
            video_url: Video URL
            caption: Post caption
        
        Returns:
            Dictionary with status and response data
        """
        if not video_url or not video_url.strip():
            return {"status": "error", "detail": "Video URL cannot be empty"}
        
        if not caption or not caption.strip():
            return {"status": "error", "detail": "Caption cannot be empty"}
        
        self._update_progress("publishing", 20, "Registering video for upload...", {"linkedin": "publishing"})
        
        try:
            # Download video file
            file_data = self._download_file_bytes(video_url)
            if not file_data:
                error_msg = "Failed to download video"
                self._update_progress("publishing", 30, error_msg, {"linkedin": "failed"})
                return {"status": "error", "detail": error_msg}
            
            # Register upload
            asset_id, upload_url = self._register_upload(len(file_data))
            if not asset_id or not upload_url:
                error_msg = "Failed to register video upload"
                self._update_progress("publishing", 40, error_msg, {"linkedin": "failed"})
                return {"status": "error", "detail": error_msg}
            
            self._update_progress("publishing", 50, "Uploading video file...", {"linkedin": "publishing"})
            
            # Upload video
            if not self._upload_file(video_url, upload_url, file_data):
                error_msg = "Failed to upload video file"
                self._update_progress("publishing", 60, error_msg, {"linkedin": "failed"})
                return {"status": "error", "detail": error_msg}
            
            self._update_progress("publishing", 75, "Creating post with video...", {"linkedin": "publishing"})
            
            # Create post with video
            endpoint = "/ugcPosts"
            payload = {
                "author": f"urn:li:person:{self.user_id}",
                "lifecycleState": "PUBLISHED",
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                },
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareMediaCategory": "VIDEO",
                        "media": [{
                            "status": "READY",
                            "media": asset_id
                        }],
                        "shareCommentary": {
                            "text": caption
                        }
                    }
                }
            }
            
            response = self._make_request("POST", endpoint, data=payload)
            
            if "value" in response or "id" in response:
                post_id = response.get("value") or response.get("id")
                self._update_progress("publishing", 100, f"Video post published: {post_id}", {"linkedin": "completed"})
                return {
                    "status": "success",
                    "data": {
                        "post_id": post_id,
                        "type": "video",
                        "message": f"Successfully published video post"
                    }
                }
            else:
                error_msg = response.get("detail", "Unknown error")
                self._update_progress("publishing", 80, f"Failed: {error_msg}", {"linkedin": "failed"})
                return {"status": "error", "detail": error_msg}
        except Exception as exc:
            error_msg = str(exc)
            self._update_progress("publishing", 80, f"Error: {error_msg}", {"linkedin": "failed"})
            logger.error(f"Video posting failed: {exc}", exc_info=True)
            return {"status": "error", "detail": error_msg}
    
    def publish_mixed(self, media_items: List[Dict], caption: str) -> Dict[str, Any]:
        """
        Publish mixed media (text + images OR text + video, not both)
        
        LinkedIn doesn't support mixing image and video in same post
        This method routes to the appropriate handler based on media types
        
        Args:
            media_items: List of media objects with 'type' and 'url'
            caption: Post caption
        
        Returns:
            Dictionary with status and response data
        """
        if not media_items:
            return self.publish_text(caption)
        
        # Separate media types
        images = [m for m in media_items if m.get("type") == "image"]
        videos = [m for m in media_items if m.get("type") == "video"]
        
        # LinkedIn doesn't support mixing images and videos
        # Route to primary type (prefer images if mixed)
        if images and videos:
            warning_msg = "LinkedIn doesn't support mixing images and videos in a single post. Publishing images only."
            logger.warning(warning_msg)
            image_urls = [m.get("url") for m in images if m.get("url")]
            result = self.publish_photo(image_urls, caption)
            if result.get("status") == "success":
                result["data"]["warning"] = warning_msg
            return result
        elif images:
            image_urls = [m.get("url") for m in images if m.get("url")]
            return self.publish_photo(image_urls, caption)
        elif videos:
            video_url = videos[0].get("url")
            return self.publish_video(video_url, caption)
        else:
            return self.publish_text(caption)    
    # ============================================================================
    # Analytics & Engagement Methods (requires Community Management API)
    # ============================================================================
    
    def fetch_posts(self, limit: int = 10) -> Dict[str, Any]:
        """
        Fetch recent posts (Personal Profile or Company Page)
        Requires: r_ugc permission
        
        Args:
            limit: Number of posts to retrieve (default 10)
            
        Returns:
            Dictionary with status and list of posts
        """
        try:
            author_urn = self._build_author_urn()
            endpoint = f"/ugcPosts?q=authors&authors=List({author_urn})&count={limit}&sortBy=LAST_MODIFIED"
            
            response = self._make_request("GET", endpoint)
            
            if "elements" in response:
                posts = []
                for post in response["elements"]:
                    post_id = post.get("id")
                    specific_content = post.get("specificContent", {}).get("com.linkedin.ugc.share.UgcShare", {})
                    share_content = specific_content.get("shareContent", {})
                    commentary = share_content.get("shareCommentary", {})
                    
                    posts.append({
                        "post_id": post_id,
                        "text": commentary.get("text", ""),
                        "created_at": post.get("created", {}).get("time", 0),
                        "media_category": share_content.get("shareMediaCategory", "NONE"),
                        "lifecycle": post.get("lifecycleState", ""),
                    })
                
                return {"status": "success", "posts": posts, "count": len(posts)}
            else:
                return {"status": "error", "detail": "No posts found or invalid response format"}
                
        except Exception as exc:
            logger.error(f"Failed to fetch LinkedIn posts: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}
    
    def fetch_post_analytics(self, post_urn: str) -> Dict[str, Any]:
        """
        Fetch analytics for a specific post (Company Page only)
        Requires: r_organization_social permission + Community Management API
        
        Args:
            post_urn: URN of the post (e.g., "urn:li:share:1234567890")
            
        Returns:
            Dictionary with impressions, clicks, engagement metrics
        """
        try:
            if not self.organization_id:
                return {"status": "error", "detail": "Analytics only available for Company Pages"}
            
            # Convert ugcPost URN to share URN format if needed
            share_urn = post_urn.replace("urn:li:ugcPost:", "urn:li:share:")
            
            # Fetch share statistics
            endpoint = f"/organizationalEntityShareStatistics?q=organizationalEntity"
            endpoint += f"&organizationalEntity=urn:li:organization:{self.organization_id}"
            endpoint += f"&shares=List({share_urn})"
            
            response = self._make_request("GET", endpoint)
            
            if "elements" in response and len(response["elements"]) > 0:
                stats = response["elements"][0]
                total_stats = stats.get("totalShareStatistics", {})
                
                return {
                    "status": "success",
                    "post_urn": post_urn,
                    "impressions": total_stats.get("impressionCount", 0),
                    "clicks": total_stats.get("clickCount", 0),
                    "likes": total_stats.get("likeCount", 0),
                    "comments": total_stats.get("commentCount", 0),
                    "shares": total_stats.get("shareCount", 0),
                    "engagement_rate": total_stats.get("engagement", 0),
                }
            else:
                return {"status": "error", "detail": "No analytics data found for this post"}
                
        except Exception as exc:
            logger.error(f"Failed to fetch post analytics: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}
    
    def fetch_comments(self, post_urn: str, limit: int = 50) -> Dict[str, Any]:
        """
        Fetch comments on a post
        Requires: r_organization_social permission + Social Actions API
        
        Args:
            post_urn: URN of the post
            limit: Maximum comments to retrieve
            
        Returns:
            Dictionary with status and list of comments
        """
        try:
            # Convert to social actions format
            endpoint = f"/socialActions/{post_urn}/comments?count={limit}"
            
            response = self._make_request("GET", endpoint)
            
            if "elements" in response:
                comments = []
                for comment in response["elements"]:
                    comments.append({
                        "comment_id": comment.get("id"),
                        "comment_urn": comment.get("$URN"),
                        "actor_urn": comment.get("actor"),
                        "text": comment.get("message", {}).get("text", ""),
                        "created_at": comment.get("created", {}).get("time", 0),
                        "like_count": comment.get("likesSummary", {}).get("totalLikes", 0),
                    })
                
                return {"status": "success", "comments": comments, "count": len(comments)}
            else:
                return {"status": "error", "detail": "No comments found or invalid response format"}
                
        except Exception as exc:
            logger.error(f"Failed to fetch comments: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}
    
    def reply_to_comment(self, post_urn: str, parent_comment_urn: str, reply_text: str) -> Dict[str, Any]:
        """
        Reply to a comment on a post
        Requires: w_organization_social permission + Social Actions API
        
        Args:
            post_urn: URN of the post
            parent_comment_urn: URN of the comment to reply to
            reply_text: Reply message text
            
        Returns:
            Dictionary with status and reply details
        """
        try:
            if not reply_text or not reply_text.strip():
                return {"status": "error", "detail": "Reply text cannot be empty"}
            
            endpoint = f"/socialActions/{post_urn}/comments"
            
            payload = {
                "actor": self._build_author_urn(),
                "message": {
                    "text": reply_text
                },
                "parentComment": parent_comment_urn
            }
            
            response = self._make_request("POST", endpoint, data=payload)
            
            if "id" in response or "$URN" in response:
                return {
                    "status": "success",
                    "comment_id": response.get("id"),
                    "comment_urn": response.get("$URN"),
                    "message": "Reply posted successfully"
                }
            else:
                return {"status": "error", "detail": "Failed to post reply"}
                
        except Exception as exc:
            logger.error(f"Failed to reply to comment: {exc}", exc_info=True)
            return {"status": "error", "detail": str(exc)}