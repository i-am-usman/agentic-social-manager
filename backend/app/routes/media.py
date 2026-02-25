from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from typing import List, Optional
from app.services.cloudinary_service import CloudinaryService
from app.services.database import posts_collection
from app.services.dependencies import get_current_user
from app.schemas.post_schema import MediaItem
from bson import ObjectId
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/media", tags=["Media"])


@router.post("/upload")
async def upload_media(
    files: List[UploadFile] = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Upload single or multiple media files (images or videos)
    
    Returns:
        {"status": "success", "media": [MediaItem, ...]}
    """
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        if len(files) > 10:
            raise HTTPException(status_code=400, detail="Maximum 10 files per upload")
        
        media_list = []
        
        for idx, file in enumerate(files):
            # Read file content
            content = await file.read()
            file_size = len(content)
            
            # Validate file
            validation = CloudinaryService.validate_file(
                file_size=file_size,
                file_type=file.content_type,
                file_name=file.filename
            )
            
            if validation["status"] != "valid":
                raise HTTPException(status_code=400, detail=validation["detail"])
            
            # Determine file type
            if file.content_type.startswith("image/"):
                # Convert image to base64
                import base64
                image_base64 = base64.b64encode(content).decode("utf-8")
                
                # Upload to Cloudinary
                result = CloudinaryService.upload_image(
                    f"data:{file.content_type};base64,{image_base64}"
                )
                
                if result["status"] != "success":
                    raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}: {result.get('detail')}")
                
                media_item = MediaItem(
                    id=result.get("public_id"),
                    type="image",
                    url=result.get("url"),
                    order=idx
                )
            
            elif file.content_type.startswith("video/"):
                # For videos, we need to handle them differently
                # Save to temp and upload as file path
                import tempfile
                import os
                
                temp_dir = tempfile.gettempdir()
                temp_path = os.path.join(temp_dir, file.filename)
                
                with open(temp_path, "wb") as temp_file:
                    temp_file.write(content)
                
                # Upload to Cloudinary
                result = CloudinaryService.upload_video(video_file_path=temp_path)
                
                # Clean up temp file
                os.remove(temp_path)
                
                if result["status"] != "success":
                    raise HTTPException(status_code=500, detail=f"Failed to upload {file.filename}: {result.get('detail')}")
                
                media_item = MediaItem(
                    id=result.get("public_id"),
                    type="video",
                    url=result.get("url"),
                    thumbnail=result.get("thumbnail"),
                    duration=result.get("duration"),
                    order=idx
                )
            
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")
            
            media_list.append(media_item)
            logger.info(f"Uploaded {file.filename} ({file.content_type})")
        
        return {
            "status": "success",
            "media": [m.dict() for m in media_list]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading media: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading media: {str(e)}")


@router.post("/validate")
async def validate_media(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Validate a media file before upload (check type, size, etc.)
    
    Returns:
        {"status": "valid"} or {"status": "invalid", "detail": "..."}
    """
    try:
        content = await file.read()
        file_size = len(content)
        
        validation = CloudinaryService.validate_file(
            file_size=file_size,
            file_type=file.content_type,
            file_name=file.filename
        )
        
        return validation
    
    except Exception as e:
        logger.error(f"Error validating media: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating media: {str(e)}")


@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    user: dict = Depends(get_current_user)
):
    """
    Delete a media file from Cloudinary
    
    Args:
        media_id: Cloudinary public ID
    """
    try:
        # Determine if image or video by checking Cloudinary
        metadata = CloudinaryService.get_media_metadata(media_id)
        
        if metadata["status"] != "success":
            raise HTTPException(status_code=404, detail=f"Media not found: {media_id}")
        
        resource_type = metadata["data"].get("resource_type", "image")
        
        # Delete from Cloudinary
        result = CloudinaryService.delete_media(media_id, resource_type)
        
        if result["status"] != "success":
            raise HTTPException(status_code=500, detail=result.get("detail"))
        
        return {"status": "success", "message": f"Media {media_id} deleted"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting media: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting media: {str(e)}")


@router.patch("/posts/{post_id}/reorder")
async def reorder_media(
    post_id: str,
    media_order: List[dict],  # List of {"id": public_id, "order": index}
    user: dict = Depends(get_current_user)
):
    """
    Reorder media items in a post
    
    Args:
        post_id: Post ID
        media_order: List of {id, order} objects
    """
    try:
        # Verify post exists and belongs to user
        post = posts_collection.find_one({"_id": ObjectId(post_id)})
        
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        
        if str(post["user_id"]) != str(user["_id"]):
            raise HTTPException(status_code=403, detail="You don't have permission to edit this post")
        
        # Update media order
        if "media" in post:
            for item in post["media"]:
                for order_item in media_order:
                    if item.get("id") == order_item.get("id"):
                        item["order"] = order_item.get("order", 0)
            
            posts_collection.update_one(
                {"_id": ObjectId(post_id)},
                {"$set": {"media": post["media"]}}
            )
        
        return {"status": "success", "message": "Media order updated"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reordering media: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error reordering media: {str(e)}")
