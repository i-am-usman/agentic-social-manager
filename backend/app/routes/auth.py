from fastapi import APIRouter, HTTPException, Request
from app.schemas.users import UserRegister, UserLogin, ForgotPasswordRequest, ResetPasswordConfirm   #  schemas
from app.services.database import users_collection      #  database connection
from app.config.config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    RESET_RATE_LIMIT_MAX_REQUESTS,
    RESET_RATE_LIMIT_WINDOW_MINUTES,
    RESET_TOKEN_DEV_RETURN,
    RESET_TOKEN_EXPIRE_MINUTES,
)
from datetime import datetime, timedelta
import bcrypt
from jose import jwt
import hashlib
import re
import secrets

router = APIRouter(prefix="/auth", tags=["Auth"])

# In-memory rate limit buckets: {(ip, email): [datetime, ...]}
_password_reset_buckets = {}


def _enforce_password_reset_rate_limit(ip_address: str, email: str):
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=RESET_RATE_LIMIT_WINDOW_MINUTES)
    bucket_key = (ip_address, email.lower())
    attempts = _password_reset_buckets.get(bucket_key, [])
    attempts = [timestamp for timestamp in attempts if timestamp >= window_start]

    if len(attempts) >= RESET_RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Too many reset attempts. Please try again in {RESET_RATE_LIMIT_WINDOW_MINUTES} minutes."
            ),
        )

    attempts.append(now)
    _password_reset_buckets[bucket_key] = attempts


def _hash_reset_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _email_query(email: str):
    normalized = _normalize_email(email)
    # Case-insensitive exact match for backward compatibility with older mixed-case records.
    return {"email": {"$regex": f"^{re.escape(normalized)}$", "$options": "i"}}

def create_jwt_token(sub: str):
    """Create JWT token with user ID as subject"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": sub, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register")
def register_user(user: UserRegister):
    """Register a new user"""
    normalized_email = _normalize_email(user.email)
    existing = users_collection.find_one(_email_query(normalized_email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    users_collection.insert_one({
        "email": normalized_email,
        "username": user.username,
        "password": hashed_pw,
        "role": "user",
        "created_at": datetime.utcnow()
    })
    return {"message": "User registered successfully"}

@router.post("/login")
def login_user(user: UserLogin):
    """Login user and return JWT"""
    normalized_email = _normalize_email(user.email)
    existing = users_collection.find_one(
        _email_query(normalized_email),
        sort=[("updated_at", -1), ("created_at", -1)],
    )
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    if not bcrypt.checkpw(user.password.encode("utf-8"), existing["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    #  Use MongoDB _id in token
    token = create_jwt_token(str(existing["_id"]))
    return {"access_token": token, "token_type": "bearer", "role": existing.get("role", "user")}

@router.post("/forgot-password")
def request_password_reset(payload: ForgotPasswordRequest, request: Request):
    """Issue password reset token and store its hash/expiry for verification."""
    client_ip = request.client.host if request.client else "unknown"
    normalized_email = _normalize_email(payload.email)
    _enforce_password_reset_rate_limit(client_ip, normalized_email)

    existing = users_collection.find_one(
        _email_query(normalized_email),
        sort=[("updated_at", -1), ("created_at", -1)],
    )

    # Return generic message even if user does not exist to reduce account enumeration risk.
    generic_message = "If your account exists, a password reset code has been generated."
    if not existing:
        return {"message": generic_message}

    raw_reset_token = secrets.token_urlsafe(24)
    token_hash = _hash_reset_token(raw_reset_token)
    expires_at = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

    users_collection.update_one(
        {"_id": existing["_id"]},
        {
            "$set": {
                "password_reset": {
                    "token_hash": token_hash,
                    "expires_at": expires_at,
                    "requested_at": datetime.utcnow(),
                    "used": False,
                }
            }
        },
    )

    response = {"message": generic_message}
    if RESET_TOKEN_DEV_RETURN:
        response["reset_token"] = raw_reset_token
        response["note"] = "Development mode: token is returned directly."
    return response


@router.post("/reset-password/confirm")
def confirm_password_reset(payload: ResetPasswordConfirm):
    """Verify reset token and update user password."""
    normalized_email = _normalize_email(payload.email)
    existing = users_collection.find_one(
        _email_query(normalized_email),
        sort=[("updated_at", -1), ("created_at", -1)],
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Invalid reset request")

    reset_state = existing.get("password_reset") or {}
    token_hash = reset_state.get("token_hash")
    expires_at = reset_state.get("expires_at")
    used = reset_state.get("used", False)

    if not token_hash or not expires_at or used:
        raise HTTPException(status_code=400, detail="Reset token is missing or already used")

    if datetime.utcnow() > expires_at:
        raise HTTPException(status_code=400, detail="Reset token has expired")

    provided_hash = _hash_reset_token(payload.reset_token)
    if provided_hash != token_hash:
        raise HTTPException(status_code=401, detail="Invalid reset token")

    new_hashed_pw = bcrypt.hashpw(payload.new_password.encode("utf-8"), bcrypt.gensalt())
    users_collection.update_many(
        _email_query(normalized_email),
        {
            "$set": {
                "email": normalized_email,
                "password": new_hashed_pw,
                "updated_at": datetime.utcnow(),
                "password_reset.used": True,
            }
        },
    )

    return {"message": "Password reset successful. Please sign in with your new password."}