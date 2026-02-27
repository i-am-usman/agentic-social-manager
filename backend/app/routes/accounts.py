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


def _validate_linkedin_credentials(user_id: str, access_token: str) -> tuple[bool, str | None]:
    """Validate LinkedIn access token by fetching user profile"""
    url = "https://api.linkedin.com/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    try:
        response = requests.get(url, headers=headers, timeout=15).json()
        if "error" in response:
            return False, f"Invalid token: {response.get('error_description', 'Unknown error')}"
        if "sub" not in response:
            return False, "Failed to retrieve LinkedIn user info"
        # Verify the token matches the provided user_id (optional - depends on your needs)
        return True, None
    except requests.exceptions.Timeout:
        return False, "LinkedIn validation timed out"
    except Exception as exc:
        logger.error("LinkedIn validation failed: %s", exc, exc_info=True)
        return False, "Failed to validate LinkedIn credentials"


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

    li_personal = accounts.get("linkedin-personal")
    if li_personal:
        response["linkedin_personal"] = {
            "connected": True,
            "linkedin_user_id": li_personal.get("linkedin_user_id"),
            "token": mask_token(li_personal.get("access_token")),
        }
    else:
        response["linkedin_personal"] = {"connected": False}

    li_company = accounts.get("linkedin-company")
    if li_company:
        response["linkedin_company"] = {
            "connected": True,
            "linkedin_user_id": li_company.get("linkedin_user_id"),
            "organization_id": li_company.get("linkedin_organization_id"),
            "token": mask_token(li_company.get("access_token")),
        }
    else:
        response["linkedin_company"] = {"connected": False}

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

    if platform == "linkedin-personal":
        if not payload.linkedin_user_id:
            raise HTTPException(status_code=400, detail="linkedin_user_id is required for LinkedIn Personal Profile")
        ok, error = _validate_linkedin_credentials(payload.linkedin_user_id, payload.access_token)
        if not ok:
            raise HTTPException(status_code=400, detail=error or "Invalid LinkedIn credentials")
        set_platform_credentials(
            user["_id"],
            "linkedin-personal",
            {
                "linkedin_user_id": payload.linkedin_user_id,
                "access_token": payload.access_token,
            },
        )
        return {"status": "success", "platform": "linkedin-personal"}

    if platform == "linkedin-company":
        if not payload.linkedin_user_id:
            raise HTTPException(status_code=400, detail="linkedin_user_id is required for LinkedIn Company Page")
        if not payload.linkedin_organization_id:
            raise HTTPException(status_code=400, detail="organization_id is required for LinkedIn Company Page")
        ok, error = _validate_linkedin_credentials(payload.linkedin_user_id, payload.access_token)
        if not ok:
            raise HTTPException(status_code=400, detail=error or "Invalid LinkedIn credentials")
        
        set_platform_credentials(
            user["_id"],
            "linkedin-company",
            {
                "linkedin_user_id": payload.linkedin_user_id,
                "access_token": payload.access_token,
                "linkedin_organization_id": payload.linkedin_organization_id,
            },
        )
        return {"status": "success", "platform": "linkedin-company"}

    # Keep old "linkedin" for backwards compatibility - treat as personal
    if platform == "linkedin":
        if not payload.linkedin_user_id:
            raise HTTPException(status_code=400, detail="linkedin_user_id is required for LinkedIn")
        ok, error = _validate_linkedin_credentials(payload.linkedin_user_id, payload.access_token)
        if not ok:
            raise HTTPException(status_code=400, detail=error or "Invalid LinkedIn credentials")
        
        credentials = {
            "linkedin_user_id": payload.linkedin_user_id,
            "access_token": payload.access_token,
        }
        
        # If organization_id provided, store as company; otherwise as personal
        if payload.linkedin_organization_id:
            credentials["linkedin_organization_id"] = payload.linkedin_organization_id
            set_platform_credentials(user["_id"], "linkedin-company", credentials)
            return {"status": "success", "platform": "linkedin-company"}
        else:
            set_platform_credentials(user["_id"], "linkedin-personal", credentials)
            return {"status": "success", "platform": "linkedin-personal"}

    raise HTTPException(status_code=400, detail="Unsupported platform")


@router.delete("/{platform}")
def disconnect_account(platform: str, user: dict = Depends(get_current_user)):
    normalized = (platform or "").strip().lower()
    if normalized not in {"facebook", "instagram", "linkedin", "linkedin-personal", "linkedin-company"}:
        raise HTTPException(status_code=400, detail="Unsupported platform")

    remove_platform_credentials(user["_id"], normalized)
    return {"status": "success", "platform": normalized}

@router.get("/linkedin/callback")
async def linkedin_oauth_callback(code: str, state: str):
    """
    LinkedIn OAuth callback endpoint (for future OAuth implementation)
    Exchanges authorization code for access token
    """
    # TODO: Implement OAuth token exchange when migrating to OAuth flow
    # For now, users add tokens manually via the Connect form
    token_url = "https://www.linkedin.com/oauth/v2/accessToken"
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": config.LINKEDIN_REDIRECT_URI,
        "client_id": config.LINKEDIN_CLIENT_ID,
        "client_secret": config.LINKEDIN_CLIENT_SECRET,
    }
    
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    
    try:
        response = requests.post(token_url, data=payload, headers=headers, timeout=15)
        data = response.json()
        
        if "access_token" not in data:
            raise HTTPException(status_code=400, detail=f"Failed to get token: {data}")
        
        access_token = data.get("access_token")
        expires_in = data.get("expires_in")
        
        # Get user profile info
        profile_url = "https://api.linkedin.com/v2/userinfo"
        profile_headers = {"Authorization": f"Bearer {access_token}"}
        profile_res = requests.get(profile_url, headers=profile_headers, timeout=15).json()
        
        return {
            "status": "success",
            "message": f"Connected as {profile_res.get('name')}!",
            "access_token": access_token,
            "expires_in": expires_in,
            "user_info": profile_res
        }
    except Exception as exc:
        logger.error("LinkedIn OAuth callback failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="LinkedIn authentication failed")