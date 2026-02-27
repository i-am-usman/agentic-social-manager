from datetime import datetime
from bson import ObjectId
from app.services.database import users_collection


SUPPORTED_PLATFORMS = {"facebook", "instagram", "linkedin", "linkedin-personal", "linkedin-company"}


def _ensure_platform(platform: str) -> str:
    normalized = (platform or "").strip().lower()
    if normalized not in SUPPORTED_PLATFORMS:
        raise ValueError("Unsupported platform")
    return normalized


def get_user_social_accounts(user_id: str) -> dict:
    user = users_collection.find_one({"_id": ObjectId(user_id)})
    return (user or {}).get("social_accounts", {})


def get_platform_credentials(user_id: str, platform: str) -> dict | None:
    normalized = _ensure_platform(platform)
    accounts = get_user_social_accounts(user_id)
    return accounts.get(normalized)


def set_platform_credentials(user_id: str, platform: str, credentials: dict) -> None:
    normalized = _ensure_platform(platform)
    update = {
        f"social_accounts.{normalized}": {
            **credentials,
            "connected_at": datetime.utcnow(),
        }
    }
    users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update})


def remove_platform_credentials(user_id: str, platform: str) -> None:
    normalized = _ensure_platform(platform)
    users_collection.update_one(
        {"_id": ObjectId(user_id)},
        {"$unset": {f"social_accounts.{normalized}": ""}},
    )


def mask_token(token: str | None) -> str | None:
    if not token:
        return None
    if len(token) <= 4:
        return "****"
    return f"****{token[-4:]}"
