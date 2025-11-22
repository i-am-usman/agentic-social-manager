from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# Request schemas
class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# Response schemas
class UserPublic(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    status: str = "success"
    token: str
    user: UserPublic