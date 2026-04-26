from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.services.ai_service import AIService
from datetime import datetime, timezone
import pytz
from app.services.database import posts_collection
from app.models import GeneratedContent
from app.services.dependencies import get_current_user
from app.services.image_service import ImageService
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["Content"])

# Pakistani Standard Time (UTC+5)
PAKISTAN_TZ = pytz.timezone('Asia/Karachi')


def _to_pakistan_time(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return PAKISTAN_TZ.localize(dt)
    return dt.astimezone(PAKISTAN_TZ)

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

class SentimentRequest(BaseModel):
    text: str
    language: str = "english"


_COMMON_PROMPT_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "with", "by",
    "is", "are", "be", "this", "that", "it", "my", "your", "our", "from", "as", "about",
    "create", "make", "generate", "image", "caption", "post",
}


def _looks_like_gibberish(token: str) -> bool:
    if not token:
        return True

    lowered = token.lower()
    if re.search(r"(.)\1{3,}", lowered):
        return True

    if len(lowered) >= 5:
        unique_ratio = len(set(lowered)) / len(lowered)
        has_vowel = bool(re.search(r"[aeiou]", lowered))
        if unique_ratio < 0.35:
            return True
        if not has_vowel and unique_ratio < 0.5:
            return True

    return False


def _tokenize_prompt(value: str) -> list[str]:
    tokens = re.findall(r"[a-zA-Z0-9]+", value.lower())
    return [token for token in tokens if token and token not in _COMMON_PROMPT_STOPWORDS]


def _validate_prompt_quality(prompt: str):
    value = (prompt or "").strip()
    if len(value) < 12:
        raise HTTPException(
            status_code=400,
            detail="Prompt is too short. Describe a clear subject and context for both caption and image.",
        )

    tokens = _tokenize_prompt(value)
    if len(tokens) < 3:
        raise HTTPException(
            status_code=400,
            detail="Prompt needs at least 3 meaningful words so caption and image generation make sense.",
        )

    if len(set(tokens)) < 2:
        raise HTTPException(
            status_code=400,
            detail="Prompt is too repetitive. Add more specific context.",
        )

    gibberish_count = sum(1 for token in tokens if _looks_like_gibberish(token))
    if gibberish_count >= max(2, (len(tokens) + 1) // 2):
        raise HTTPException(
            status_code=400,
            detail="Prompt looks invalid or gibberish. Use clear words describing a real idea for caption and image.",
        )



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
        
        # If scheduled_at is provided, normalize it to Pakistani timezone
        if content.scheduled_at:
            content_data["scheduled_at"] = _to_pakistan_time(content.scheduled_at)
            print(f"Normalized scheduled_at to PKT: {content_data['scheduled_at']}")
        
        # Auto-set status based on scheduled_at (use timezone-aware comparison)
        now_pkt = datetime.now(PAKISTAN_TZ)
        if content_data.get("scheduled_at") and content_data["scheduled_at"] > now_pkt:
            content_data["status"] = "scheduled"
            print(f"Setting status to SCHEDULED")
        else:
            content_data["status"] = "draft"
            print(f"Setting status to DRAFT")
        
        # ✅ Upload media to Cloudinary if provided
        if content_data.get("media") and isinstance(content_data["media"], list):
            print(f"Processing {len(content_data['media'])} media items...")
            cloudinary_media = []
            
            for idx, media_item in enumerate(content_data["media"]):
                try:
                    # Check if media_item has a URL (either from /media/upload endpoint or base64)
                    if isinstance(media_item, dict):
                        media_url = media_item.get("url")
                        media_type = media_item.get("type", "image")
                        
                        # If it's a base64 string, upload to Cloudinary
                        if media_url and media_url.startswith("data:"):
                            print(f"Uploading media item {idx+1} to Cloudinary...")
                            upload_result = ImageService.upload_base64_to_cloudinary(media_url, media_type)
                            
                            if upload_result["status"] == "success":
                                cloudinary_media.append({
                                    "type": media_type,
                                    "url": upload_result["url"],
                                    "public_id": upload_result.get("public_id"),
                                    "order": idx
                                })
                                print(f"✓ Media item {idx+1} uploaded to {upload_result['url']}")
                            else:
                                print(f"⚠ Failed to upload media item {idx+1}: {upload_result.get('detail')}")
                        else:
                            # Already a URL (from /media/upload endpoint), use as-is
                            cloudinary_media.append({
                                "type": media_type,
                                "url": media_url,
                                "order": idx
                            })
                            print(f"✓ Media item {idx+1} already uploaded: {media_url}")
                    else:
                        print(f"⚠ Media item {idx+1} is not a dict, skipping")
                        
                except Exception as e:
                    print(f"⚠ Error processing media item {idx+1}: {str(e)}")
                    continue
            
            content_data["media"] = cloudinary_media
            print(f"✓ Processed {len(cloudinary_media)} media items")
        
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
        _validate_prompt_quality(request.topic)
        content = AIService.generate_full_content(request.topic, request.language)
        return {"status": "success", "data": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/caption")
async def generate_caption(request: CaptionRequest):
    """Generate only caption"""
    try:
        _validate_prompt_quality(request.topic)
        caption = AIService.generate_caption(request.topic, request.language)
        return {"status": "success", "caption": caption}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/hashtags")
async def generate_hashtags(request: HashtagRequest):
    """Generate only hashtags"""
    try:
        _validate_prompt_quality(request.topic)
        hashtags = AIService.generate_hashtags(request.topic, request.count)
        return {"status": "success", "hashtags": hashtags}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/image")
async def generate_image(request: ImageRequest):
    """Generate or fetch only image"""
    try:
        _validate_prompt_quality(request.topic)
        image = AIService.generate_image(request.topic)
        return {"status": "success", "image": image}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
async def analyze_text_sentiment(request: SentimentRequest):
    """Analyze sentiment and emotions for a text snippet."""
    try:
        analysis = AIService.analyze_sentiment_and_emotion(request.text, request.language)
        return {"status": "success", "analysis": analysis}
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