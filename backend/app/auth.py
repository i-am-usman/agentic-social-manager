from fastapi import APIRouter, HTTPException
from app.models import UserRegister, UserLogin
from app.database import users_collection
from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import datetime, timedelta
import bcrypt
from jose import jwt

router = APIRouter(prefix="/auth", tags=["Auth"])

def create_jwt_token(sub: str):
    """Create JWT token with user ID as subject"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": sub, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/register")
def register_user(user: UserRegister):
    """Register a new user"""
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    users_collection.insert_one({
        "email": user.email,
        "username": user.username,
        "password": hashed_pw,
        "created_at": datetime.utcnow()
    })
    return {"message": "User registered successfully"}

@router.post("/login")
def login_user(user: UserLogin):
    """Login user and return JWT"""
    existing = users_collection.find_one({"email": user.email})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    if not bcrypt.checkpw(user.password.encode("utf-8"), existing["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # ✅ Use MongoDB _id in token
    token = create_jwt_token(str(existing["_id"]))
    return {"access_token": token, "token_type": "bearer"}