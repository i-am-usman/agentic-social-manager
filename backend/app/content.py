from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.ai_service import generate_all_content, generate_caption, generate_hashtags, generate_image_url

router = APIRouter()

class ContentGenerationRequest(BaseModel):
    topic: str
    language: str = "english"

class ContentGenerationResponse(BaseModel):
    topic: str
    language: str
    caption: str
    hashtags: list
    image_url: str
    success: bool

@router.post("/generate", response_model=ContentGenerationResponse)
async def generate_content(request: ContentGenerationRequest):
    """
    Generate AI-powered content (caption, hashtags, and image) for a given topic.
    
    Args:
        topic: The subject/topic for content generation
        language: Language for caption (english, urdu, etc.) - default: english
    
    Returns:
        ContentGenerationResponse with caption, hashtags, image URL and success status
    """
    
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    
    result = generate_all_content(request.topic, request.language)
    
    if not result.get("success"):
        raise HTTPException(
            status_code=500, 
            detail="Failed to generate content. Please try again."
        )
    
    return ContentGenerationResponse(
        topic=result["topic"],
        language=result["language"],
        caption=result["caption"],
        hashtags=result["hashtags"],
        image_url=result["image_url"],
        success=result["success"]
    )

@router.post("/caption")
async def generate_caption_only(request: ContentGenerationRequest):
    """Generate only a caption for a topic"""
    
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    
    result = generate_caption(request.topic, request.language)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {"caption": result.get("caption"), "success": True}

@router.post("/hashtags")
async def generate_hashtags_only(request: ContentGenerationRequest):
    """Generate only hashtags for a topic"""
    
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    
    result = generate_hashtags(request.topic)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {"hashtags": result.get("hashtags", []), "success": True}

@router.post("/image")
async def generate_image_only(request: ContentGenerationRequest):
    """Generate only an image for a topic"""
    
    if not request.topic or not request.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")
    
    result = generate_image_url(request.topic)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error"))
    
    return {"image_url": result.get("image_url"), "success": True}
