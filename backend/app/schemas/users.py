from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserRegister(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordConfirm(BaseModel):
    email: EmailStr
    reset_token: str = Field(min_length=6, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)

class UserPublic(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str
    created_at: datetime