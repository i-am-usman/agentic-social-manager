from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.ai_service import AIService

router = APIRouter(prefix="/content", tags=["content"])

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

@router.post("/generate")
async def generate_content(request: ContentRequest):
    """Generate complete social media content (caption + hashtags + image)"""
    try:
        content = AIService.generate_full_content(request.topic, request.language)
        return {
            "status": "success",
            "data": content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/caption")
async def generate_caption(request: CaptionRequest):
    """Generate only caption"""
    try:
        caption = AIService.generate_caption(request.topic, request.language)
        return {
            "status": "success",
            "caption": caption
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/hashtags")
async def generate_hashtags(request: HashtagRequest):
    """Generate only hashtags"""
    try:
        hashtags = AIService.generate_hashtags(request.topic, request.count)
        return {
            "status": "success",
            "hashtags": hashtags
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/image")
async def generate_image(request: ImageRequest):
    """Generate or fetch only image"""
    try:
        image = AIService.generate_image(request.topic)
        return {
            "status": "success",
            "image": image
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
