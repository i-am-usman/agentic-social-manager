from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

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
    image: str
    status: str
    created_at: datetime
    user_id: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    platforms: Optional[List[str]] = None


class PublishRequest(BaseModel):
    post_id: Optional[str] = None
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image: Optional[str] = None
    platforms: List[str]


class RescheduleRequest(BaseModel):
    scheduled_at: Optional[datetime] = None
    platforms: Optional[List[str]] = None


class EditPostRequest(BaseModel):
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image: Optional[str] = None