from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_current_user # <-- Use the correct dependency
from app.database import users_collection # <-- FIX: Import 'users_collection'
from bson import ObjectId
from app.models import UserProfileData # <-- We will add this model

router = APIRouter(prefix="/profile", tags=["Profile"])

@router.post("/create")
# --- FIX: Use Pydantic model and get user from dependency ---
def create_profile(profile_data: UserProfileData, user: dict = Depends(get_current_user)):
    user_id = ObjectId(user["_id"]) # Convert string ID back to ObjectId for Mongo

    users_collection.update_one(
        {"_id": user_id},
        {"$set": {"profile": {
            "name": profile_data.name,
            "bio": profile_data.bio,
            "interests": profile_data.interests,
        }}}
    )

    return {"message": "Profile created successfully"}

@router.get("/me")
def get_profile(user: dict = Depends(get_current_user)): # <-- get_current_user returns the full user
    profile = user.get("profile")

    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return profile

@router.put("/update")
# --- FIX: Use Pydantic model for update data ---
def update_profile(profile_data: UserProfileData, user: dict = Depends(get_current_user)):
    update_data = {}
    user_id = ObjectId(user["_id"]) # Convert string ID back to ObjectId

    # Use .dict() to get only fields that were actually sent
    update_values = profile_data.dict(exclude_unset=True)

    if not update_values:
        raise HTTPException(status_code=400, detail="No update data provided")

    # Build the $set query
    for key, value in update_values.items():
        update_data[f"profile.{key}"] = value

    users_collection.update_one(
        {"_id": user_id},
        {"$set": update_data}
    )

    return {"message": "Profile updated successfully"}