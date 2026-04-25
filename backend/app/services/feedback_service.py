import re
from datetime import datetime, timezone
from typing import Any, Dict, Tuple

from app.services.database import feedback_collection

FEATURE_OPTIONS = {
    "dashboard": "Dashboard",
    "analytics": "Analytics",
    "automation": "Automation",
    "comment-analysis": "Comment Analysis",
    "generate": "AI Generate",
    "custom-post": "Custom Post",
    "saved-content": "Saved Content",
    "accounts": "Accounts",
    "profile": "Profile",
    "other": "Other",
}


class FeedbackService:
    @staticmethod
    def normalize_feature(feature_key: str | None, feature_custom: str | None) -> Tuple[str, str]:
        clean_key = (feature_key or "").strip().lower()
        clean_custom = (feature_custom or "").strip()

        if clean_key and clean_key in FEATURE_OPTIONS and clean_key != "other":
            return clean_key, FEATURE_OPTIONS[clean_key]

        if clean_key == "other" and clean_custom:
            normalized_custom = re.sub(r"\s+", " ", clean_custom)
            return "other", normalized_custom

        if clean_custom:
            normalized_custom = re.sub(r"\s+", " ", clean_custom)
            return "other", normalized_custom

        if clean_key and clean_key in FEATURE_OPTIONS:
            return clean_key, FEATURE_OPTIONS[clean_key]

        return "other", "Other"

    @staticmethod
    def normalize_text(value: str) -> str:
        return re.sub(r"\s+", " ", (value or "").strip())

    @staticmethod
    def normalize_tags(tags: list[str] | None) -> list[str]:
        if not tags:
            return []

        cleaned = []
        seen = set()
        for item in tags:
            tag = FeedbackService.normalize_text(str(item)).lower()
            if not tag:
                continue
            if len(tag) > 30:
                tag = tag[:30]
            if tag in seen:
                continue
            seen.add(tag)
            cleaned.append(tag)
            if len(cleaned) >= 8:
                break
        return cleaned

    @staticmethod
    def build_document(payload: dict[str, Any], user_id: str) -> Dict[str, Any]:
        feature_key, feature_label = FeedbackService.normalize_feature(
            payload.get("feature_key"), payload.get("feature_custom")
        )
        now_utc = datetime.now(timezone.utc)

        return {
            "feature_key": feature_key,
            "feature_label": feature_label,
            "rating": int(payload.get("rating") or 0),
            "feedback_text": FeedbackService.normalize_text(payload.get("feedback_text", "")),
            "tags": FeedbackService.normalize_tags(payload.get("tags") or []),
            "source": FeedbackService.normalize_text(payload.get("source") or "web")[:32] or "web",
            "created_at": now_utc,
            "created_by_user_id": str(user_id),
        }

    @staticmethod
    def build_list_query(feature: str | None, min_rating: int | None, max_rating: int | None) -> dict:
        query: Dict[str, Any] = {}

        if feature:
            clean_feature = feature.strip().lower()
            if clean_feature in FEATURE_OPTIONS:
                query["feature_key"] = clean_feature

        if min_rating is not None or max_rating is not None:
            query["rating"] = {}
            if min_rating is not None:
                query["rating"]["$gte"] = int(min_rating)
            if max_rating is not None:
                query["rating"]["$lte"] = int(max_rating)

        return query

    @staticmethod
    def to_public_document(doc: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(doc.get("_id")),
            "feature_key": doc.get("feature_key", "other"),
            "feature_label": doc.get("feature_label", "Other"),
            "rating": int(doc.get("rating") or 0),
            "feedback_text": doc.get("feedback_text", ""),
            "tags": doc.get("tags") or [],
            "created_at": doc.get("created_at"),
            "created_by_user_id": doc.get("created_by_user_id", ""),
            "source": doc.get("source", "web"),
        }

    @staticmethod
    def get_summary(query: dict[str, Any]) -> dict[str, Any]:
        pipeline = [
            {"$match": query},
            {
                "$group": {
                    "_id": "$feature_key",
                    "count": {"$sum": 1},
                    "avg_rating": {"$avg": "$rating"},
                }
            },
            {"$sort": {"count": -1}},
        ]

        feature_buckets = []
        total = 0
        weighted_total = 0.0

        for row in feedback_collection.aggregate(pipeline):
            count = int(row.get("count") or 0)
            avg_rating = float(row.get("avg_rating") or 0)
            feature_key = row.get("_id") or "other"
            feature_buckets.append(
                {
                    "feature_key": feature_key,
                    "feature_label": FEATURE_OPTIONS.get(feature_key, "Other"),
                    "count": count,
                    "average_rating": round(avg_rating, 2),
                }
            )
            total += count
            weighted_total += avg_rating * count

        return {
            "total_feedback": total,
            "overall_average_rating": round((weighted_total / total), 2) if total else 0.0,
            "by_feature": feature_buckets,
        }
