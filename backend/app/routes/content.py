from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.ai_service import AIService
from datetime import datetime, timezone
import pytz
from app.services.database import posts_collection
from app.models import GeneratedContent
from app.services.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Content"])

# Pakistani Standard Time (UTC+5)
PAKISTAN_TZ = pytz.timezone('Asia/Karachi')

class ContentRequest(BaseModel):
    topic: str
    language: str = "english"

class CaptionRequest(BaseModel):
    topic: str
    language: str = "english"

class HashtagRequest(BaseModel):
    topic: str
    count: int = 6

class ImageRequest(BaseModel):
    topic: str



@router.post("/save")
def save_content(content: GeneratedContent, user: dict = Depends(get_current_user)):
    try:
        print(f"\n=== SAVE CONTENT REQUEST ===")
        print(f"User: {user.get('_id')}")
        print(f"Content object: {content}")
        
        content_data = content.dict(exclude_none=False)
        print(f"Content dict keys: {content_data.keys()}")
        print(f"Scheduled_at: {content_data.get('scheduled_at')}")
        
        content_data["user_id"] = str(user["_id"])
        content_data["created_at"] = datetime.now(PAKISTAN_TZ)
        
        # If scheduled_at is provided, ensure it's timezone-aware (treat as Pakistani time)
        if content.scheduled_at:
            if content.scheduled_at.tzinfo is None:
                # Naive datetime - localize to Pakistani timezone
                content_data["scheduled_at"] = PAKISTAN_TZ.localize(content.scheduled_at)
                print(f"Localized naive datetime to PKT: {content_data['scheduled_at']}")
            else:
                # Already timezone-aware
                content_data["scheduled_at"] = content.scheduled_at
        
        # Auto-set status based on scheduled_at (use timezone-aware comparison)
        now_pkt = datetime.now(PAKISTAN_TZ)
        if content_data.get("scheduled_at") and content_data["scheduled_at"] > now_pkt:
            content_data["status"] = "scheduled"
            print(f"Setting status to SCHEDULED")
        else:
            content_data["status"] = "draft"
            print(f"Setting status to DRAFT")
        
        print(f"Final content_data: {content_data}")
        result = posts_collection.insert_one(content_data)
        print(f"✓ Saved successfully with ID: {result.inserted_id}")
        
        return {
            "status": "success",
            "id": str(result.inserted_id),
            "message": "Content saved successfully"
        }
    except Exception as e:
        print(f"\n!!! ERROR SAVING CONTENT !!!")
        print(f"Error: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error saving content: {str(e)}")


@router.post("/generate")
async def generate_content(request: ContentRequest):
    """Generate complete social media content (caption + hashtags + image)"""
    try:
        content = AIService.generate_full_content(request.topic, request.language)
        return {"status": "success", "data": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/caption")
async def generate_caption(request: CaptionRequest):
    """Generate only caption"""
    try:
        caption = AIService.generate_caption(request.topic, request.language)
        return {"status": "success", "caption": caption}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hashtags")
async def generate_hashtags(request: HashtagRequest):
    """Generate only hashtags"""
    try:
        hashtags = AIService.generate_hashtags(request.topic, request.count)
        return {"status": "success", "hashtags": hashtags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image")
async def generate_image(request: ImageRequest):
    """Generate or fetch only image"""
    try:
        image = AIService.generate_image(request.topic)
        return {"status": "success", "image": image}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/stats")
async def get_post_stats(user: dict = Depends(get_current_user)):
    user_id = user["_id"]
    total = posts_collection.count_documents({"user_id": user_id})
    drafts = posts_collection.count_documents({"user_id": user_id, "status": "draft"})
    scheduled = posts_collection.count_documents({"user_id": user_id, "status": "scheduled"})
    published = posts_collection.count_documents({"user_id": user_id, "status": "published"})

    return {
        "status": "success",
        "stats": {
            "total_posts": total,
            "drafts": drafts,
            "scheduled": scheduled,
            "published": published
        }
    }