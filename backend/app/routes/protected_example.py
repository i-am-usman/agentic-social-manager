from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId

from app.core.security import verify_token
from app.db.mongo import db

auth_scheme = HTTPBearer()
router = APIRouter(prefix="/protected", tags=["Protected"])

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    token = creds.credentials
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user  # full Mongo doc; access via user["username"], etc.

@router.get("/me")
async def me(current_user = Depends(get_current_user)):
    return {
        "status": "success",
        "user": {
            "id": str(current_user["_id"]),
            "username": current_user["username"],
            "email": current_user["email"],
            "role": current_user.get("role", "user"),
        },
    }

from fastapi import APIRouter, Depends
from app.dependencies import get_current_user

router = APIRouter(prefix="/content", tags=["Content"])

@router.post("/save")
def save_content(payload: dict, user: dict = Depends(get_current_user)):
    payload["user_id"] = str(user["_id"])  # attach logged-in user
    # insert into MongoDB
    result = users_collection.insert_one(payload)
    return {"status": "success", "id": str(result.inserted_id)}