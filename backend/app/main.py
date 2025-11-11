from fastapi import FastAPI
from app.auth import router as auth_router
from app.posts import router as posts_router

app = FastAPI(title="Agentic Social Manager API")

app.include_router(auth_router, prefix="/auth")
app.include_router(posts_router, prefix="/posts")
