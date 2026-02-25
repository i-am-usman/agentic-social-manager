from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class MediaItem(BaseModel):
    """Represents a single media item (image or video) in a post"""
    id: Optional[str] = None
    type: str  # "image" or "video"
    url: str  # Public URL from Cloudinary
    base64: Optional[str] = None  # Base64 data (for new uploads)
    thumbnail: Optional[str] = None  # Thumbnail URL (for videos)
    duration: Optional[int] = None  # Duration in seconds (for videos)
    order: int = 0  # Order in the post

class PostCreate(BaseModel):
    title: str
    content: str
    topic: str
    language: str = "english"
    user_id: Optional[str] = None  # added so incoming payloads can carry user

class PostPublic(BaseModel):
    id: str
    title: str
    content: str
    caption: str
    hashtags: List[str]
    image: Optional[str] = None  # Kept for backward compatibility
    media: Optional[List[MediaItem]] = None  # New: array of media items
    status: str
    created_at: datetime
    user_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    platforms: Optional[List[str]] = None


class PublishRequest(BaseModel):
    post_id: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image: Optional[str] = None  # Kept for backward compatibility
    media: Optional[List[MediaItem]] = None  # New: array of media items
    platforms: List[str]


class RescheduleRequest(BaseModel):
    scheduled_at: Optional[datetime] = None
    platforms: Optional[List[str]] = None


class EditPostRequest(BaseModel):
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image: Optional[str] = None  # Kept for backward compatibility
    media: Optional[List[MediaItem]] = None  # New: array of media items