from fastapi import APIRouter, Depends, HTTPException
from app.utils import verify_token
from app.database import db
from app.ai_service import generate_caption
from datetime import datetime

router = APIRouter()

posts_col = db["posts"]

@router.post("/create")
def create_post(prompt: str, email: str = Depends(verify_token)):
    ai_result = generate_caption(prompt)
    if "error" in ai_result:
        raise HTTPException(status_code=500, detail=ai_result["error"])

    post_data = {
        "email": email,
        "prompt": prompt,
        "caption": ai_result["caption"],
        "created_at": datetime.utcnow()
    }

    posts_col.insert_one(post_data)
    return {"message": "Post created successfully", "data": post_data}
