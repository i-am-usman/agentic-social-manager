from fastapi import APIRouter, Depends, HTTPException
import logging
import requests
from app.config import config
from app.schemas.social_accounts import ConnectAccountRequest
from app.services.dependencies import get_current_user
from app.services.social_accounts import (
    get_user_social_accounts,
    remove_platform_credentials,
    set_platform_credentials,
    mask_token,
)

router = APIRouter(prefix="/accounts", tags=["Accounts"])
logger = logging.getLogger(__name__)


def _validate_facebook_credentials(page_id: str, access_token: str) -> tuple[bool, str | None]:
    url = f"https://graph.facebook.com/{config.GRAPH_API_VERSION}/{page_id}"
    params = {"fields": "id", "access_token": access_token}
    try:
        response = requests.get(url, params=params, timeout=15).json()
        if "error" in response:
            return False, response["error"].get("message", "Invalid Facebook credentials")
        if response.get("id") != page_id:
            return False, "Facebook Page ID does not match token"
        return True, None
    except requests.exceptions.Timeout:
        return False, "Facebook validation timed out"
    except Exception as exc:
        logger.error("Facebook validation failed: %s", exc, exc_info=True)
        return False, "Failed to validate Facebook credentials"


def _validate_instagram_credentials(ig_user_id: str, access_token: str) -> tuple[bool, str | None]:
    url = f"https://graph.facebook.com/{config.GRAPH_API_VERSION}/{ig_user_id}"
    params = {"fields": "id,username", "access_token": access_token}
    try:
        response = requests.get(url, params=params, timeout=15).json()
        if "error" in response:
            return False, response["error"].get("message", "Invalid Instagram credentials")
        if response.get("id") != ig_user_id:
            return False, "Instagram User ID does not match token"
        return True, None
    except requests.exceptions.Timeout:
        return False, "Instagram validation timed out"
    except Exception as exc:
        logger.error("Instagram validation failed: %s", exc, exc_info=True)
        return False, "Failed to validate Instagram credentials"


@router.get("/me")
def get_my_accounts(user: dict = Depends(get_current_user)):
    accounts = get_user_social_accounts(user["_id"])
    response = {}

    fb = accounts.get("facebook")
    if fb:
        response["facebook"] = {
            "connected": True,
            "page_id": fb.get("page_id"),
            "token": mask_token(fb.get("access_token")),
        }
    else:
        response["facebook"] = {"connected": False}

    ig = accounts.get("instagram")
    if ig:
        response["instagram"] = {
            "connected": True,
            "ig_user_id": ig.get("ig_user_id"),
            "token": mask_token(ig.get("access_token")),
        }
    else:
        response["instagram"] = {"connected": False}

    return {"status": "success", "accounts": response}


@router.post("/connect")
def connect_account(payload: ConnectAccountRequest, user: dict = Depends(get_current_user)):
    platform = payload.platform.strip().lower()

    if platform == "facebook":
        if not payload.page_id:
            raise HTTPException(status_code=400, detail="page_id is required for Facebook")
        ok, error = _validate_facebook_credentials(payload.page_id, payload.access_token)
        if not ok:
            raise HTTPException(status_code=400, detail=error or "Invalid Facebook credentials")
        set_platform_credentials(
            user["_id"],
            "facebook",
            {
                "page_id": payload.page_id,
                "access_token": payload.access_token,
            },
        )
        return {"status": "success", "platform": "facebook"}

    if platform == "instagram":
        if not payload.ig_user_id:
            raise HTTPException(status_code=400, detail="ig_user_id is required for Instagram")
        ok, error = _validate_instagram_credentials(payload.ig_user_id, payload.access_token)
        if not ok:
            raise HTTPException(status_code=400, detail=error or "Invalid Instagram credentials")
        set_platform_credentials(
            user["_id"],
            "instagram",
            {
                "ig_user_id": payload.ig_user_id,
                "access_token": payload.access_token,
            },
        )
        return {"status": "success", "platform": "instagram"}

    raise HTTPException(status_code=400, detail="Unsupported platform")


@router.delete("/{platform}")
def disconnect_account(platform: str, user: dict = Depends(get_current_user)):
    normalized = (platform or "").strip().lower()
    if normalized not in {"facebook", "instagram"}:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    remove_platform_credentials(user["_id"], normalized)
    return {"status": "success", "platform": normalized}
