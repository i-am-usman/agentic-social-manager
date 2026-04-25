from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class FeedbackCreate(BaseModel):
    feature_key: Optional[str] = None
    feature_custom: Optional[str] = Field(default=None, max_length=80)
    rating: int = Field(ge=1, le=5)
    feedback_text: str = Field(min_length=5, max_length=2000)
    tags: List[str] = Field(default_factory=list)
    source: Optional[str] = Field(default="web", max_length=32)

    @model_validator(mode="after")
    def validate_feature_fields(self):
        has_feature_key = bool((self.feature_key or "").strip())
        has_feature_custom = bool((self.feature_custom or "").strip())
        if not has_feature_key and not has_feature_custom:
            raise ValueError("Either feature_key or feature_custom is required")
        return self


class FeedbackListQuery(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=50)
    feature: Optional[str] = None
    min_rating: Optional[int] = Field(default=None, ge=1, le=5)
    max_rating: Optional[int] = Field(default=None, ge=1, le=5)


class FeedbackPublic(BaseModel):
    id: str
    feature_key: str
    feature_label: str
    rating: int
    feedback_text: str
    tags: List[str]
    created_at: datetime
    created_by_user_id: str
    source: Optional[str] = "web"
