from bson import ObjectId
from fastapi import APIRouter, Depends
from app.dependencies import get_current_user
from app.models import UserProfileData
from app.database import users_collection

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
    return updated_user