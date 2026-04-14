from fastapi import APIRouter, Depends, HTTPException
import logging
import requests
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode
from app.config import config
from app.schemas.social_accounts import ConnectAccountRequest, MetaOAuthCallbackRequest
from app.services.dependencies import get_current_user
from app.services.social_accounts import (
    get_user_social_accounts,
    remove_platform_credentials,
    set_platform_credentials,
    mask_token,
)

router = APIRouter(prefix="/accounts", tags=["Accounts"])
logger = logging.getLogger(__name__)

_meta_oauth_state_cache = {}


def _require_meta_oauth_config() -> None:
    missing = []
    if not config.META_APP_ID:
        missing.append("META_APP_ID")
    if not config.META_APP_SECRET:
        missing.append("META_APP_SECRET")
    if not config.META_REDIRECT_URI:
        missing.append("META_REDIRECT_URI")
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Missing Meta OAuth configuration: {', '.join(missing)}",
        )


def _issue_meta_oauth_state(user_id: str) -> str:
    state = secrets.token_urlsafe(32)
    _meta_oauth_state_cache[state] = {
        "user_id": user_id,
        "expires_at": datetime.utcnow() + timedelta(seconds=config.META_OAUTH_STATE_TTL_SECONDS),
    }
    return state


def _consume_meta_oauth_state(state: str, user_id: str) -> None:
    record = _meta_oauth_state_cache.pop(state, None)
    if not record:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    if datetime.utcnow() > record["expires_at"]:
        raise HTTPException(status_code=400, detail="OAuth state has expired")

    if record["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="OAuth state does not belong to this user")


def _exchange_meta_code_for_token(code: str) -> dict:
    token_url = f"https://graph.facebook.com/{config.GRAPH_API_VERSION}/oauth/access_token"
    params = {
        "client_id": config.META_APP_ID,
        "client_secret": config.META_APP_SECRET,
        "redirect_uri": config.META_REDIRECT_URI,
        "code": code,
    }
    response = requests.get(token_url, params=params, timeout=20)
    data = response.json()
    if response.status_code >= 400 or "access_token" not in data:
        detail = (data.get("error") or {}).get("message") or "Failed to exchange authorization code"
        raise HTTPException(status_code=400, detail=detail)
    return data


def _exchange_long_lived_token(short_lived_token: str) -> dict:
    token_url = f"https://graph.facebook.com/{config.GRAPH_API_VERSION}/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": config.META_APP_ID,
        "client_secret": config.META_APP_SECRET,
        "fb_exchange_token": short_lived_token,
    }
    response = requests.get(token_url, params=params, timeout=20)
    data = response.json()
    if response.status_code >= 400 or "access_token" not in data:
        detail = (data.get("error") or {}).get("message") or "Failed to get long-lived token"
        raise HTTPException(status_code=400, detail=detail)
    return data


def _fetch_meta_pages(user_access_token: str) -> list:
    pages_url = f"https://graph.facebook.com/{config.GRAPH_API_VERSION}/me/accounts"
    params = {
        "fields": "id,name,access_token,instagram_business_account{id,username},instagram_accounts{id,username}",
        "access_token": user_access_token,
    }
    response = requests.get(pages_url, params=params, timeout=20)
    data = response.json()
    if response.status_code >= 400:
        detail = (data.get("error") or {}).get("message") or "Failed to fetch pages"
        raise HTTPException(status_code=400, detail=detail)
    return data.get("data") or []


def _fetch_meta_permissions(user_access_token: str) -> dict:
    url = f"https://graph.facebook.com/{config.GRAPH_API_VERSION}/me/permissions"
    params = {"access_token": user_access_token}
    response = requests.get(url, params=params, timeout=20)
    data = response.json()
    if response.status_code >= 400:
        return {"granted": [], "declined": [], "error": (data.get("error") or {}).get("message")}

    granted = []
    declined = []
    for item in data.get("data") or []:
        perm = item.get("permission")
        status = item.get("status")
        if not perm:
            continue
        if status == "granted":
            granted.append(perm)
        elif status in {"declined", "expired"}:
            declined.append(perm)

    return {"granted": granted, "declined": declined, "error": None}


def _extract_instagram_user_id(page: dict) -> str | None:
    ig_business = page.get("instagram_business_account") or {}
    if ig_business.get("id"):
        return ig_business["id"]

    ig_accounts = page.get("instagram_accounts") or []
    if isinstance(ig_accounts, list) and ig_accounts:
        return (ig_accounts[0] or {}).get("id")

    return None


def _select_primary_page(pages: list) -> dict:
    if not pages:
        return {}

    preferred_page_id = (config.FB_PAGE_ID or "").strip()
    if preferred_page_id:
        for page in pages:
            if str(page.get("id")) == preferred_page_id:
                return page

    for page in pages:
        if _extract_instagram_user_id(page):
            return page

    return pages[0]


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


@router.get("/meta/login-url")
def get_meta_login_url(user: dict = Depends(get_current_user)):
    _require_meta_oauth_config()
    state = _issue_meta_oauth_state(user["_id"])

    params = {
        "client_id": config.META_APP_ID,
        "redirect_uri": config.META_REDIRECT_URI,
        "response_type": "code",
        "scope": ",".join(config.META_SCOPES),
        "state": state,
        "auth_type": "rerequest",
        "display": "popup",
    }
    if config.META_CONFIG_ID:
        params["config_id"] = config.META_CONFIG_ID
    auth_url = f"https://www.facebook.com/{config.GRAPH_API_VERSION}/dialog/oauth?{urlencode(params)}"
    return {
        "status": "success",
        "auth_url": auth_url,
        "state": state,
        "expires_in": config.META_OAUTH_STATE_TTL_SECONDS,
    }


@router.get("/meta/auth-url")
def get_meta_auth_url(user: dict = Depends(get_current_user)):
    # Alias endpoint for client compatibility.
    return get_meta_login_url(user)


@router.post("/meta/callback")
def complete_meta_oauth(payload: MetaOAuthCallbackRequest, user: dict = Depends(get_current_user)):
    _require_meta_oauth_config()
    _consume_meta_oauth_state(payload.state, user["_id"])

    short_lived = _exchange_meta_code_for_token(payload.code)
    long_lived = _exchange_long_lived_token(short_lived["access_token"])

    # Some app configurations return a usable page list on short-lived token only.
    pages = _fetch_meta_pages(short_lived["access_token"])
    if not pages:
        pages = _fetch_meta_pages(long_lived["access_token"])

    if not pages:
        short_permissions = _fetch_meta_permissions(short_lived["access_token"])
        long_permissions = _fetch_meta_permissions(long_lived["access_token"])
        permissions = long_permissions if (long_permissions.get("granted") or long_permissions.get("declined")) else short_permissions
        declined = permissions.get("declined") or []
        granted = permissions.get("granted") or []
        critical_scopes = [
            "pages_show_list",
            "pages_read_engagement",
            "pages_manage_metadata",
            "instagram_basic",
        ]
        missing_critical = [scope for scope in critical_scopes if scope in declined]

        detail_parts = [
            "No Facebook pages found for this account.",
            "Ensure this user has full control on a Facebook Page and selects that Page in Meta consent.",
            "Also open Facebook Settings > Business Integrations, edit this app, and enable the target Page in the granted assets list.",
        ]
        if not config.META_CONFIG_ID:
            detail_parts.append(
                "This app appears to use Facebook Login for Business. Set META_CONFIG_ID in backend/.env from Meta Dashboard > Facebook Login for Business > Configurations."
            )
        if granted:
            detail_parts.append(f"Granted permissions seen: {', '.join(granted)}.")
        if missing_critical:
            detail_parts.append(f"Declined critical permissions: {', '.join(missing_critical)}.")
        if permissions.get("error"):
            detail_parts.append(f"Permissions diagnostic error: {permissions['error']}.")

        raise HTTPException(
            status_code=400,
            detail=" ".join(detail_parts),
        )

    primary_page = _select_primary_page(pages)
    page_id = str(primary_page.get("id") or "")
    page_access_token = primary_page.get("access_token")
    if not page_id or not page_access_token:
        raise HTTPException(
            status_code=400,
            detail=(
                "Facebook page token is unavailable. Reconnect and ensure you grant page permissions for the selected Page."
            ),
        )

    set_platform_credentials(
        user["_id"],
        "facebook",
        {
            "page_id": page_id,
            "access_token": page_access_token,
            "page_name": primary_page.get("name"),
            "token_type": long_lived.get("token_type", "bearer"),
            "token_expires_in": long_lived.get("expires_in"),
            "oauth_provider": "meta",
        },
    )

    connected = ["facebook"]
    instagram_page = next((page for page in pages if _extract_instagram_user_id(page)), None)
    instagram_user_id = _extract_instagram_user_id(instagram_page or primary_page)
    if instagram_user_id:
        instagram_page_token = (instagram_page or primary_page).get("access_token") or page_access_token
        set_platform_credentials(
            user["_id"],
            "instagram",
            {
                "ig_user_id": instagram_user_id,
                "access_token": instagram_page_token,
                "token_type": long_lived.get("token_type", "bearer"),
                "token_expires_in": long_lived.get("expires_in"),
                "oauth_provider": "meta",
            },
        )
        connected.append("instagram")

    return {
        "status": "success",
        "message": "Meta account connected successfully",
        "connected": connected,
        "facebook": {
            "page_id": page_id,
            "page_name": primary_page.get("name"),
        },
        "instagram": {
            "ig_user_id": instagram_user_id,
        },
    }


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