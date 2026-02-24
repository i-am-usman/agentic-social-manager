from pydantic import BaseModel, Field
from typing import Optional


class ConnectAccountRequest(BaseModel):
    platform: str = Field(min_length=3, max_length=20)
    access_token: str = Field(min_length=5, max_length=512)
    page_id: Optional[str] = Field(default=None, min_length=2, max_length=64)
    ig_user_id: Optional[str] = Field(default=None, min_length=2, max_length=64)
