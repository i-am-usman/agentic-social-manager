from fastapi import APIRouter, HTTPException, Depends
from app.models import UserRegister, UserLogin
from app.database import db
from datetime import datetime, timedelta
from dotenv import load_dotenv
import bcrypt, jwt, os

router = APIRouter()

load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "mysecretkey")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

users_col = db["users"]

def create_jwt_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    data.update({"exp": expire})
    token = jwt.encode(data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

@router.post("/register")
def register_user(user: UserRegister):
    existing = users_col.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())
    users_col.insert_one({
        "email": user.email,
        "password": hashed_pw,
        "created_at": datetime.utcnow()
    })
    return {"message": "User registered successfully"}

@router.post("/login")
def login_user(user: UserLogin):
    existing = users_col.find_one({"email": user.email})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    if not bcrypt.checkpw(user.password.encode("utf-8"), existing["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_jwt_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


from app.utils import verify_token
from fastapi import Depends

@router.get("/profile")
def get_user_profile(email: str = Depends(verify_token)):
    return {"message": f"Welcome, {email}! You are authenticated."}
