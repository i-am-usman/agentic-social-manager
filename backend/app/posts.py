from fastapi import APIRouter, Depends, HTTPException
from app.utils import verify_token
from app.database import db
from app.ai_service import generate_caption
from datetime import datetime
from app.models import PostCreate  # <-- IMPORT THE NEW MODEL

router = APIRouter()

posts_col = db["posts"]

@router.post("/create")
# --- UPDATE THIS FUNCTION SIGNATURE ---
def create_post(post: PostCreate, email: str = Depends(verify_token)):
    # Now, 'post.topic' holds the value from the JSON body
    ai_result = generate_caption(post.topic)
    
    if "error" in ai_result:
        raise HTTPException(status_code=500, detail=ai_result["error"])

    post_data = {
        "email": email,
        "prompt": post.topic,
        "caption": ai_result["caption"],
        "created_at": datetime.utcnow()
    }

    posts_col.insert_one(post_data)
    return {"message": "Post created successfully", "data": post_data}