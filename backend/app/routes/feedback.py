from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from app.schemas.feedback_schema import FeedbackCreate, FeedbackListQuery
from app.services.database import feedback_collection
from app.services.dependencies import get_current_user
from app.services.feedback_service import FEATURE_OPTIONS, FeedbackService

router = APIRouter(prefix="/feedback", tags=["Feedback"])

# Simple in-memory anti-spam throttle: max 5 submissions in 10 minutes per user.
_FEEDBACK_WINDOW = timedelta(minutes=10)
_FEEDBACK_LIMIT = 5
_feedback_submit_log = defaultdict(deque)


def _enforce_feedback_rate_limit(user_id: str) -> None:
    now = datetime.now(timezone.utc)
    window_start = now - _FEEDBACK_WINDOW
    user_events = _feedback_submit_log[user_id]

    while user_events and user_events[0] < window_start:
        user_events.popleft()

    if len(user_events) >= _FEEDBACK_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many feedback submissions. Please wait a few minutes.",
        )

    user_events.append(now)


@router.get("/features")
def list_feedback_features(user: dict = Depends(get_current_user)):
    _ = user
    return {
        "status": "success",
        "data": [
            {"key": key, "label": label}
            for key, label in FEATURE_OPTIONS.items()
        ],
    }


@router.post("")
def submit_feedback(payload: FeedbackCreate, user: dict = Depends(get_current_user)):
    user_id = str(user.get("_id") or "")
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    _enforce_feedback_rate_limit(user_id)

    document = FeedbackService.build_document(payload.model_dump(), user_id)
    if not document["feedback_text"]:
        raise HTTPException(status_code=400, detail="Feedback text cannot be empty")

    inserted = feedback_collection.insert_one(document)
    saved = feedback_collection.find_one({"_id": inserted.inserted_id})

    return {
        "status": "success",
        "detail": "Feedback submitted successfully",
        "data": FeedbackService.to_public_document(saved),
    }


@router.get("")
def list_feedback(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    feature: str | None = Query(default=None),
    min_rating: int | None = Query(default=None, ge=1, le=5),
    max_rating: int | None = Query(default=None, ge=1, le=5),
    user: dict = Depends(get_current_user),
):
    _ = user

    query_model = FeedbackListQuery(
        page=page,
        limit=limit,
        feature=feature,
        min_rating=min_rating,
        max_rating=max_rating,
    )

    if (
        query_model.min_rating is not None
        and query_model.max_rating is not None
        and query_model.min_rating > query_model.max_rating
    ):
        raise HTTPException(status_code=400, detail="min_rating cannot be greater than max_rating")

    query = FeedbackService.build_list_query(
        query_model.feature,
        query_model.min_rating,
        query_model.max_rating,
    )
    skip = (query_model.page - 1) * query_model.limit

    cursor = (
        feedback_collection.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(query_model.limit)
    )
    items = [FeedbackService.to_public_document(doc) for doc in cursor]
    total = feedback_collection.count_documents(query)

    return {
        "status": "success",
        "data": {
            "items": items,
            "pagination": {
                "page": query_model.page,
                "limit": query_model.limit,
                "total": total,
                "has_next": (skip + len(items)) < total,
            },
        },
    }


@router.get("/summary")
def feedback_summary(
    feature: str | None = Query(default=None),
    min_rating: int | None = Query(default=None, ge=1, le=5),
    max_rating: int | None = Query(default=None, ge=1, le=5),
    user: dict = Depends(get_current_user),
):
    _ = user

    if min_rating is not None and max_rating is not None and min_rating > max_rating:
        raise HTTPException(status_code=400, detail="min_rating cannot be greater than max_rating")

    query = FeedbackService.build_list_query(feature, min_rating, max_rating)
    summary = FeedbackService.get_summary(query)

    return {"status": "success", "data": summary}
