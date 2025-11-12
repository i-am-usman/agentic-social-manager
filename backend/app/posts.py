from fastapi import APIRouter, Depends
from app.ai_service import AIService
from app.utils import verify_token
from pydantic import BaseModel

router = APIRouter(prefix="/posts", tags=["posts"])

class PostCreate(BaseModel):
    title: str
    content: str
    topic: str
    language: str = "english"

@router.post("/create")
async def create_post(post: PostCreate, email: str = Depends(verify_token)):
    """Create a new social media post with AI-generated content"""
    try:
        # Generate content using AIService
        caption = AIService.generate_caption(post.topic, post.language)
        hashtags = AIService.generate_hashtags(post.topic)
        image = AIService.generate_image(post.topic)
        
        return {
            "status": "success",
            "post": {
                "title": post.title,
                "caption": caption,
                "hashtags": hashtags,
                "image": image,
                "created_by": email
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@router.get("/user-posts")
async def get_user_posts(email: str = Depends(verify_token)):
    """Get all posts created by the user"""
    return {
        "status": "success",
        "posts": [],
        "message": "Database integration coming soon"
    }