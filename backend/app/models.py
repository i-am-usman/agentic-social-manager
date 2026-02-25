from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileData(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None


class MediaItem(BaseModel):
    """Represents a single media item (image or video) in a post"""
    id: Optional[str] = None
    type: str  # "image" or "video"
    url: str  # Public URL from Cloudinary
    base64: Optional[str] = None  # Base64 data (for new uploads)
    thumbnail: Optional[str] = None  # Thumbnail URL (for videos)
    duration: Optional[int] = None  # Duration in seconds (for videos)
    order: int = 0  # Order in the post


class GeneratedContent(BaseModel):
    topic: str
    language: str = "english"
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image: Optional[str] = None  # Kept for backward compatibility
    media: Optional[List[MediaItem]] = None  # New: array of media items
    status: Optional[str] = "draft"
    scheduled_at: Optional[datetime] = None
    platforms: Optional[List[str]] = None
    created_at: Optional[datetime] = None