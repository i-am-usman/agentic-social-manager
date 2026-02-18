from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.ai_service import AIService
from datetime import datetime
from app.services.database import posts_collection
from app.models import GeneratedContent
from app.services.dependencies import get_current_user   

router = APIRouter(prefix="/content", tags=["Content"])

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
    content_data = content.dict()
    content_data["user_id"] = str(user["_id"])
    content_data["created_at"] = datetime.utcnow()
    result = posts_collection.insert_one(content_data)
    return {
        "status": "success",
        "id": str(result.inserted_id),
        "message": "Content saved successfully"
    }


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