from datetime import datetime

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config.config import ADMIN_REGISTRATION_SECRET
from app.schemas.users import AdminRegister
from app.services.database import feedback_collection, users_collection
from app.services.dependencies import get_current_admin_user
from app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post("/register")
def register_admin(payload: AdminRegister):
    if not ADMIN_REGISTRATION_SECRET:
        raise HTTPException(status_code=503, detail="Admin registration is disabled")

    if payload.invite_code != ADMIN_REGISTRATION_SECRET:
        raise HTTPException(status_code=403, detail="Invalid admin invite code")

    normalized_email = payload.email.strip().lower()
    existing = users_collection.find_one({"email": normalized_email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt())
    users_collection.insert_one(
        {
            "username": payload.username,
            "email": normalized_email,
            "password": hashed_password,
            "role": "admin",
            "created_at": datetime.utcnow(),
        }
    )
    return {"status": "success", "message": "Admin registered successfully"}


@router.get("/feedback")
def admin_feedback_list(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    feature: str | None = Query(default=None),
    min_rating: int | None = Query(default=None, ge=1, le=5),
    max_rating: int | None = Query(default=None, ge=1, le=5),
    admin_user: dict = Depends(get_current_admin_user),
):
    _ = admin_user

    if min_rating is not None and max_rating is not None and min_rating > max_rating:
        raise HTTPException(status_code=400, detail="min_rating cannot be greater than max_rating")

    query = FeedbackService.build_list_query(feature, min_rating, max_rating)
    skip = (page - 1) * limit

    items = [
        FeedbackService.to_public_document(doc)
        for doc in feedback_collection.find(query).sort("created_at", -1).skip(skip).limit(limit)
    ]
    total = feedback_collection.count_documents(query)
    summary = FeedbackService.get_summary(query)

    return {
        "status": "success",
        "data": {
            "items": items,
            "summary": summary,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "has_next": (skip + len(items)) < total,
            },
        },
    }