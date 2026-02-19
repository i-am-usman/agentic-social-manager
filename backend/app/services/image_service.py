import base64
import requests
from app.config import config
import logging

logger = logging.getLogger(__name__)


class ImageService:
    """Upload images to imgbb to get public URLs for Instagram"""
    
    @staticmethod
    def upload_base64_to_imgbb(image_base64: str) -> dict:
        """
        Upload a base64 image to imgbb and return public URL
        
        Args:
            image_base64: Base64 encoded image (e.g., "data:image/jpeg;base64,...")
            
        Returns:
            {"status": "success", "url": "public_url"} or {"status": "error", "detail": "..."}
        """
        if not config.IMGBB_API_KEY:
            logger.error("imgbb API key not configured")
            return {"status": "error", "detail": "imgbb API key not configured"}
        
        try:
            logger.info("Starting imgbb upload process")
            # Extract base64 data (remove "data:image/...;base64," prefix)
            if image_base64.startswith("data:"):
                image_base64 = image_base64.split(",")[1]
                logger.info("Extracted base64 data from data URI")
            
            logger.info(f"Base64 data length: {len(image_base64)}")
            
            # Upload to imgbb
            url = "https://api.imgbb.com/1/upload"
            data = {
                "image": image_base64,
                "key": config.IMGBB_API_KEY,
                "expiration": 2592000,  # 30 days
            }
            
            logger.info(f"Sending request to {url}")
            response = requests.post(url, data=data, timeout=30).json()
            logger.info(f"imgbb response status: {response.get('success')}")
            
            if response.get("success"):
                image_url = response["data"]["url"]
                logger.info(f"Image uploaded successfully to imgbb: {image_url}")
                return {"status": "success", "url": image_url}
            else:
                error_msg = response.get("error", {}).get("message", "Upload failed")
                logger.error(f"imgbb upload failed: {error_msg}, response: {response}")
                return {"status": "error", "detail": error_msg}
        
        except requests.exceptions.Timeout:
            logger.error("imgbb upload timed out")
            return {"status": "error", "detail": "Upload timeout - imgbb service took too long"}
        except requests.exceptions.ConnectionError as e:
            logger.error(f"imgbb connection error: {e}")
            return {"status": "error", "detail": f"Connection error: {str(e)}"}
        except Exception as e:
            logger.error(f"imgbb upload failed: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}
    
    @staticmethod
    def is_base64(image: str) -> bool:
        """Check if image is base64 encoded"""
        return image.startswith("data:image")
