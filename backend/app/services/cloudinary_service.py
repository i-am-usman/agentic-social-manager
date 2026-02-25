import cloudinary
import cloudinary.uploader
import cloudinary.api
import base64
import io
import logging
from app.config import config
from typing import Optional, Dict, List
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(
    cloud_name=config.CLOUDINARY_CLOUD_NAME,
    api_key=config.CLOUDINARY_API_KEY,
    api_secret=config.CLOUDINARY_API_SECRET
)


class CloudinaryService:
    """Cloudinary service for uploading and managing images and videos"""
    
    @staticmethod
    def upload_image(image_base64: str, folder: str = "posts/images") -> Dict:
        """
        Upload a base64 image to Cloudinary
        
        Args:
            image_base64: Base64 encoded image (with or without data URI prefix)
            folder: Cloudinary folder path
            
        Returns:
            {"status": "success", "url": "...", "public_id": "..."} or {"status": "error", "detail": "..."}
        """
        try:
            # Extract base64 data if it has data URI prefix
            if image_base64.startswith("data:"):
                image_base64 = image_base64.split(",")[1]
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                f"data:image/jpeg;base64,{image_base64}",
                folder=folder,
                resource_type="auto",
                quality="auto"
            )
            
            logger.info(f"Image uploaded to Cloudinary: {result.get('public_id')}")
            return {
                "status": "success",
                "url": result.get("secure_url"),
                "public_id": result.get("public_id")
            }
        except Exception as e:
            logger.error(f"Error uploading image to Cloudinary: {str(e)}")
            return {"status": "error", "detail": str(e)}
    
    @staticmethod
    def upload_video(video_base64: Optional[str] = None, video_file_path: Optional[str] = None, 
                    folder: str = "posts/videos") -> Dict:
        """
        Upload a video to Cloudinary
        
        Args:
            video_base64: Base64 encoded video data
            video_file_path: File path to video
            folder: Cloudinary folder path
            
        Returns:
            {"status": "success", "url": "...", "public_id": "...", "duration": duration, "thumbnail": "..."}
        """
        try:
            if not video_base64 and not video_file_path:
                return {"status": "error", "detail": "Either video_base64 or video_file_path must be provided"}
            
            # Upload to Cloudinary
            if video_base64:
                if video_base64.startswith("data:"):
                    video_base64 = video_base64.split(",")[1]
                
                result = cloudinary.uploader.upload(
                    f"data:video/mp4;base64,{video_base64}",
                    resource_type="video",
                    folder=folder,
                    max_bytes=500000000,  # 500MB max
                )
            else:
                result = cloudinary.uploader.upload(
                    video_file_path,
                    resource_type="video",
                    folder=folder,
                    max_bytes=500000000,  # 500MB max
                )
            
            # Get video metadata
            duration = result.get("duration")
            width = result.get("width")
            height = result.get("height")
            
            # Generate thumbnail
            thumbnail_url = cloudinary.utils.cloudinary_url(
                result.get("public_id"),
                resource_type="video",
                format="jpg",
                secure=True
            )[0]
            
            logger.info(f"Video uploaded to Cloudinary: {result.get('public_id')} (duration: {duration}s)")
            return {
                "status": "success",
                "url": result.get("secure_url"),
                "public_id": result.get("public_id"),
                "duration": duration,
                "width": width,
                "height": height,
                "thumbnail": thumbnail_url
            }
        except Exception as e:
            logger.error(f"Error uploading video to Cloudinary: {str(e)}")
            return {"status": "error", "detail": str(e)}
    
    @staticmethod
    def delete_media(public_id: str, resource_type: str = "image") -> Dict:
        """
        Delete media from Cloudinary
        
        Args:
            public_id: Cloudinary public ID
            resource_type: "image" or "video"
            
        Returns:
            {"status": "success"} or {"status": "error", "detail": "..."}
        """
        try:
            result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
            if result.get("result") == "ok":
                logger.info(f"Media deleted from Cloudinary: {public_id}")
                return {"status": "success"}
            else:
                logger.warning(f"Cloudinary delete result: {result}")
                return {"status": "error", "detail": f"Cloudinary returned: {result.get('result')}"}
        except Exception as e:
            logger.error(f"Error deleting media from Cloudinary: {str(e)}")
            return {"status": "error", "detail": str(e)}
    
    @staticmethod
    def get_media_metadata(public_id: str) -> Dict:
        """
        Get metadata for a media file
        
        Args:
            public_id: Cloudinary public ID
            
        Returns:
            {"status": "success", "data": metadata} or {"status": "error", "detail": "..."}
        """
        try:
            result = cloudinary.api.resource(public_id)
            return {"status": "success", "data": result}
        except Exception as e:
            logger.error(f"Error getting media metadata: {str(e)}")
            return {"status": "error", "detail": str(e)}
    
    @staticmethod
    def validate_file(file_size: int, file_type: str, file_name: str) -> Dict:
        """
        Validate a file before upload
        
        Args:
            file_size: File size in bytes
            file_type: MIME type (e.g., "image/jpeg", "video/mp4")
            file_name: Original file name
            
        Returns:
            {"status": "valid"} or {"status": "invalid", "detail": "..."}
        """
        # Get extension
        ext = file_name.split(".")[-1].lower()
        
        # Check if image
        if file_type.startswith("image/"):
            allowed_ext = ["jpg", "jpeg", "png", "webp", "gif"]
            max_size = 8 * 1024 * 1024  # 8MB
            
            if ext not in allowed_ext:
                return {"status": "invalid", "detail": f"Image format {ext} not supported. Use: {', '.join(allowed_ext)}"}
            if file_size > max_size:
                return {"status": "invalid", "detail": f"Image size {file_size / 1024 / 1024:.1f}MB exceeds max 8MB"}
            
            return {"status": "valid"}
        
        # Check if video
        elif file_type.startswith("video/"):
            allowed_ext = ["mp4", "mov", "webm", "avi", "mkv"]
            max_size = 500 * 1024 * 1024  # 500MB
            
            if ext not in allowed_ext:
                return {"status": "invalid", "detail": f"Video format {ext} not supported. Use: {', '.join(allowed_ext)}"}
            if file_size > max_size:
                return {"status": "invalid", "detail": f"Video size {file_size / 1024 / 1024:.1f}MB exceeds max 500MB"}
            
            return {"status": "valid"}
        
        else:
            return {"status": "invalid", "detail": f"File type {file_type} not supported"}
