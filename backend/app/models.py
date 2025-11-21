from pydantic import BaseModel, EmailStr
from typing import Optional, List

class UserRegister(BaseModel):
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PostCreate(BaseModel):
    topic: str

class UserProfileData(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str] = None



from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# class GeneratedContent(BaseModel):
#     topic: str
#     language: str
#     caption: Optional[str] = None
#     hashtags: Optional[str] = None
#     image: Optional[str] = None
#     status: Optional[str] = "draft"
#     scheduled_at: Optional[datetime] = None
#     created_at: Optional[datetime] = None

class GeneratedContent(BaseModel):
    user_id: str
    topic: str
    language: str = "english"
    caption: Optional[str] = None
    hashtags: Optional[List[str]] = None
    image: Optional[str] = None
    status: Optional[str] = "draft"
    approval_status: Optional[str] = "pending"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None