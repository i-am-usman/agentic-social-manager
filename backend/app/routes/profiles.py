from bson import ObjectId
from fastapi import APIRouter, Depends
from app.services.dependencies import get_current_user
from app.models import UserProfileData
from app.services.database import users_collection

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.post("/create")
def create_profile(profile: UserProfileData, user: dict = Depends(get_current_user)):
    users_collection.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$set": {
            "name": profile.name,
            "bio": profile.bio,
            "interests": profile.interests
        }}
    )
    return {"message": "Profile created/updated successfully"}


@router.get("/me")
def get_profile(user: dict = Depends(get_current_user)):
    updated_user = users_collection.find_one({"_id": ObjectId(user["_id"])})
    updated_user["_id"] = str(updated_user["_id"])
    if "password" in updated_user:
        updated_user.pop("password")
    social_accounts = updated_user.get("social_accounts") or {}
    for account in social_accounts.values():
        if isinstance(account, dict) and "access_token" in account:
            account["access_token"] = None
    updated_user["social_accounts"] = social_accounts
    return updated_user