import base64
import cloudinary
import cloudinary.uploader
from app.config import config
import logging

logger = logging.getLogger(__name__)


class ImageService:
    """Upload images and videos to Cloudinary to get public URLs"""
    
    @staticmethod
    def upload_base64_to_cloudinary(media_base64: str, media_type: str = "image") -> dict:
        """
        Upload a base64 encoded media to Cloudinary and return public URL
        
        Args:
            media_base64: Base64 encoded media (e.g., "data:image/jpeg;base64,...")
            media_type: "image" or "video"
            
        Returns:
            {"status": "success", "url": "public_url"} or {"status": "error", "detail": "..."}
        """
        try:
            logger.info(f"Starting Cloudinary {media_type} upload process")
            
            # Extract base64 data (remove "data:...;base64," prefix)
            if media_base64.startswith("data:"):
                media_base64 = media_base64.split(",")[1]
                logger.info("Extracted base64 data from data URI")
            
            logger.info(f"Base64 data length: {len(media_base64)}")
            
            # Convert base64 to bytes
            media_bytes = base64.b64decode(media_base64)
            
            # Determine resource type (image or video)
            resource_type = "video" if media_type.lower() == "video" else "image"
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                media_bytes,
                resource_type=resource_type,
                folder="agentic_social_manager"
            )
            
            logger.info(f"Media uploaded successfully to Cloudinary: {result['secure_url']}")
            return {
                "status": "success",
                "url": result["secure_url"],
                "public_id": result.get("public_id")
            }
            
        except Exception as err:
            logger.error(f"Error uploading to Cloudinary: {str(err)}")
            return {"status": "error", "detail": str(err)}
    
    @staticmethod
    def upload_base64_to_imgbb(image_base64: str) -> dict:
        """
        DEPRECATED: Use upload_base64_to_cloudinary instead.
        Kept for backward compatibility.
        """
        return ImageService.upload_base64_to_cloudinary(image_base64, "image")
    
    @staticmethod
    def is_base64(image: str) -> bool:
        """Check if image is base64 encoded"""
        return image.startswith("data:image")
