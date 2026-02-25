import requests
import time
from app.config import config
from typing import List, Dict, Optional


class InstaService:
    def __init__(self, ig_user_id: str | None, access_token: str | None, job_tracker=None, job_id: str = None):
        self.ig_user_id = ig_user_id
        self.token = access_token
        self.api_version = config.GRAPH_API_VERSION
        self.job_tracker = job_tracker
        self.job_id = job_id

    def publish_photo(self, image_url: str, caption: str):
        if not self.ig_user_id or not self.token:
            return {"status": "error", "detail": "Instagram credentials not configured"}

        if not image_url:
            return {"status": "error", "detail": "Image URL is required"}

        if image_url.startswith("data:image"):
            return {"status": "error", "detail": "Instagram requires a public image URL"}

        # Step 1: Create container
        url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media"
        payload = {
            "image_url": image_url,
            "caption": caption,
            "access_token": self.token,
        }
        r1 = requests.post(url, data=payload, timeout=60).json()

        if "id" not in r1:
            return {"status": "error", "detail": r1}

        # Step 2: Publish container
        publish_url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media_publish"
        r2 = requests.post(
            publish_url,
            data={"creation_id": r1["id"], "access_token": self.token},
            timeout=60,
        ).json()

        if "id" not in r2:
            return {"status": "error", "detail": r2}

        return {"status": "success", "data": r2}
    
    def publish_carousel(self, media_items: List[Dict], caption: str):
        """
        Publish a carousel (multiple images/videos mixed) to Instagram
        
        Args:
            media_items: List of {"url": "...", "type": "image"|"video", "order": 0}
            caption: Caption for the carousel
        """
        if not self.ig_user_id or not self.token:
            return {"status": "error", "detail": "Instagram credentials not configured"}
        
        if not media_items or len(media_items) < 2:
            return {"status": "error", "detail": "Carousel requires at least 2 media items"}
        
        if len(media_items) > 10:
            return {"status": "error", "detail": "Carousel supports maximum 10 media items"}
        
        # Sort by order
        media_items = sorted(media_items, key=lambda x: x.get("order", 0))
        
        try:
            # Step 1: Create individual containers for each media item with is_carousel_item flag
            item_ids = []
            for idx, media_item in enumerate(media_items):
                url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media"
                media_url = media_item.get("url")
                media_type = media_item.get("type", "image")
                
                # Key: is_carousel_item allows videos in carousel
                if media_type == "video":
                    payload = {
                        "video_url": media_url,
                        "media_type": "VIDEO",
                        "is_carousel_item": "true",  # Critical for carousel support
                        "access_token": self.token,
                    }
                else:
                    payload = {
                        "image_url": media_url,
                        "is_carousel_item": "true",  # Critical for carousel support
                        "access_token": self.token,
                    }
                
                response = requests.post(url, data=payload, timeout=60).json()
                
                if "id" not in response:
                    return {"status": "error", "detail": f"Failed to create carousel item {idx + 1}: {response}"}
                
                media_id = response["id"]
                item_ids.append({"id": media_id, "type": media_type})
                
                # Wait and check status - use smart polling to avoid rate limits
                # Videos need MORE time in carousels, images are usually instant
                if media_type == "video":
                    if self.job_tracker and self.job_id:
                        self.job_tracker.update_job(
                            self.job_id,
                            message=f"Processing carousel video {idx + 1}/{len(media_items)} (this may take time)..."
                        )
                    
                    # Use progressive backoff for videos
                    max_attempts = 10
                    wait_time = 8  # Start with 8 seconds for carousel videos
                    
                    for attempt in range(max_attempts):
                        # Wait FIRST
                        time.sleep(wait_time)
                        
                        status_url = f"https://graph.facebook.com/{self.api_version}/{media_id}"
                        status_response = requests.get(
                            status_url,
                            params={"fields": "status_code,status", "access_token": self.token},
                            timeout=30
                        ).json()
                        
                        # Handle errors including rate limits
                        if "error" in status_response:
                            error_detail = status_response.get("error", {})
                            error_code = error_detail.get("code") if isinstance(error_detail, dict) else None
                            
                            # If rate limited, back off significantly
                            if error_code == 4:
                                if self.job_tracker and self.job_id:
                                    self.job_tracker.update_job(
                                        self.job_id,
                                        message="Rate limit reached, waiting longer..."
                                    )
                                wait_time += 15
                                continue
                            # Other errors
                            return {"status": "error", "detail": f"Error checking video status for item {idx + 1}: {error_detail}"}
                        
                        # Check status
                        status = status_response.get("status_code") or status_response.get("status")
                        
                        if status in ["VIDEO_READY", "FINISHED"]:
                            break
                        elif status in ["VIDEO_FAILED", "FAILED", "ERROR"]:
                            return {"status": "error", "detail": f"Video processing failed for item {idx + 1}: {status}"}
                        
                        # Still processing - increase wait time
                        wait_time += 4  # Progressive backoff
                else:
                    # Images process quickly, just do a quick check
                    time.sleep(2)
                    status_url = f"https://graph.facebook.com/{self.api_version}/{media_id}"
                    status_response = requests.get(
                        status_url,
                        params={"fields": "status", "access_token": self.token},
                        timeout=30
                    ).json()
                    
                    status = status_response.get("status")
                    if status == "FAILED":
                        return {"status": "error", "detail": f"Image processing failed for item {idx + 1}"}
            
            # Wait extra time before creating carousel to ensure all items are truly ready
            time.sleep(3)
            
            # Step 2: Create carousel container using just the IDs
            carousel_url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media"
            
            # Use comma-separated string of IDs for children
            child_ids = ",".join([item["id"] for item in item_ids])
            carousel_payload = {
                "media_type": "CAROUSEL",
                "caption": caption,
                "children": child_ids,
                "access_token": self.token,
            }
            
            carousel_response = requests.post(carousel_url, data=carousel_payload, timeout=60).json()
            
            # Handle carousel creation errors
            if "id" not in carousel_response:
                error_detail = carousel_response.get("error", {}).get("message", str(carousel_response))
                error_code = carousel_response.get("error", {}).get("code")
                
                # If it's a transient error (code 2), retry once
                if error_code == 2:
                    import time as time_module
                    time_module.sleep(3)  # Wait 3 seconds and retry
                    carousel_response = requests.post(carousel_url, data=carousel_payload, timeout=60).json()
                    
                    if "id" not in carousel_response:
                        # Retry also failed - use fallback
                        return self._fallback_publish_media_items(media_items, caption, "carousel_failed_transient")
                else:
                    # Not a transient error, try fallback
                    return self._fallback_publish_media_items(media_items, caption, error_detail)
            
            # At this point, we have a carousel ID
            carousel_id = carousel_response["id"]
            
            # Step 3: Publish carousel
            publish_url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media_publish"
            publish_response = requests.post(
                publish_url,
                data={"creation_id": carousel_id, "access_token": self.token},
                timeout=60,
            ).json()
            
            if "id" not in publish_response:
                return {"status": "error", "detail": f"Failed to publish carousel: {publish_response}"}
            
            return {"status": "success", "data": publish_response}
        
        except Exception as e:
            return {"status": "error", "detail": str(e)}
    
    def publish_reel(self, video_url: str, caption: str):
        """
        Publish a video to Instagram as a Reel
        
        Args:
            video_url: URL of the video (must be publicly accessible)
            caption: Caption for the reel
        """
        if not self.ig_user_id or not self.token:
            return {"status": "error", "detail": "Instagram credentials not configured"}
        
        if not video_url:
            return {"status": "error", "detail": "Video URL is required"}
        
        if video_url.startswith("data:"):
            return {"status": "error", "detail": "Instagram requires a public video URL"}
        
        try:
            # Step 1: Create container for video
            url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media"
            payload = {
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "access_token": self.token,
            }
            
            response = requests.post(url, data=payload, timeout=60).json()
            
            if "id" not in response:
                return {"status": "error", "detail": f"Failed to create media container: {response}"}
            
            media_id = response["id"]
            
            # Step 2: Smart Polling with Linear Backoff to avoid rate limits
            # Videos need significant processing time - be patient!
            max_attempts = 8
            wait_time = 10  # Start with 10 seconds (reels need time to process)
            
            for attempt in range(max_attempts):
                # WAIT FIRST before checking status (don't spam the API)
                if self.job_tracker and self.job_id:
                    elapsed_time = wait_time * (attempt + 1)
                    self.job_tracker.update_job(
                        self.job_id,
                        message=f"Processing Instagram reel... (attempt {attempt + 1}/{max_attempts}, ~{elapsed_time}s elapsed)"
                    )
                
                time.sleep(wait_time)
                
                status_url = f"https://graph.facebook.com/{self.api_version}/{media_id}"
                status_response = requests.get(
                    status_url,
                    params={"fields": "status_code,status", "access_token": self.token},  # Query both fields
                    timeout=30
                ).json()
                
                # Handle API errors including rate limits
                if "error" in status_response:
                    error_detail = status_response.get("error", {})
                    error_code = error_detail.get("code") if isinstance(error_detail, dict) else None
                    error_msg = error_detail.get("message", str(error_detail)) if isinstance(error_detail, dict) else str(error_detail)
                    
                    # If rate limited (error code 4), back off significantly
                    if error_code == 4 or "request limit" in error_msg.lower():
                        if self.job_tracker and self.job_id:
                            self.job_tracker.update_job(
                                self.job_id,
                                message="Instagram rate limit reached, waiting longer..."
                            )
                        wait_time += 15  # Increase wait by 15 seconds
                        continue
                    
                    # Other errors - return immediately
                    return {"status": "error", "detail": f"Error checking media status: {error_msg}"}
                
                # Check status_code first (for reels), then fall back to status
                status = status_response.get("status_code") or status_response.get("status")
                
                # Success states
                if status == "FINISHED" or status == "VIDEO_READY":
                    if self.job_tracker and self.job_id:
                        self.job_tracker.update_job(
                            self.job_id,
                            message="Instagram reel processed, publishing to feed..."
                        )
                    break
                
                # Failure states
                if status == "ERROR" or status == "VIDEO_FAILED" or status == "FAILED":
                    return {"status": "error", "detail": f"Video processing failed with status {status}"}
                
                # Still processing - increase wait time for next attempt (linear backoff)
                wait_time += 5  # Add 5 seconds each time
            
            # After loop ends, proceed to publish (assume ready even if status check timed out)
            
            # Step 3: Publish the reel
            publish_url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media_publish"
            publish_payload = {
                "creation_id": media_id,
                "access_token": self.token
            }
            
            publish_response = requests.post(
                publish_url,
                data=publish_payload,
                timeout=60
            ).json()
            
            if "id" not in publish_response:
                return {"status": "error", "detail": f"Failed to publish reel: {publish_response}"}
            
            return {"status": "success", "data": publish_response}
        
        except Exception as e:
            return {"status": "error", "detail": f"Exception in publish_reel: {str(e)}"}
    
    def _fallback_publish_media_items(self, media_items: List[Dict], caption: str, reason: str):
        """
        Fallback method: publish media items separately if carousel fails
        Posts the most important item (usually first), or returns error with instructions
        """
        if not media_items:
            return {"status": "error", "detail": f"Carousel failed ({reason}): No media items available"}
        
        # Try to publish at least the first item
        first_item = media_items[0]
        first_type = first_item.get("type", "image")
        first_url = first_item.get("url")
        
        # Add note about the issue
        fallback_caption = f"{caption}\n\n(Note: Posted as individual item due to carousel creation issue)"
        
        if first_type == "video":
            result = self.publish_reel(first_url, fallback_caption)
        else:
            result = self.publish_photo(first_url, fallback_caption)
        
        if result.get("status") == "success":
            return {
                "status": "partial",
                "detail": f"Carousel failed ({reason}). Published as individual item instead.",
                "data": result.get("data"),
                "items_skipped": len(media_items) - 1
            }
        else:
            return {"status": "error", "detail": f"Carousel failed and fallback also failed: {reason}. Please try again."}