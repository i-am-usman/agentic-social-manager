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


class GeneratedContent(BaseModel):
    topic: str
    language: str = "english"
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image: Optional[str] = None
    status: Optional[str] = "draft"
    approval_status: Optional[str] = "pending"
    scheduled_at: Optional[datetime] = None
    platforms: Optional[List[str]] = None
    created_at: Optional[datetime] = None