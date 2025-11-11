from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.auth import router as auth_router
from app.posts import router as posts_router
from app.profiles import router as profile_router
from app.content import router as content_router

app = FastAPI(title="Agentic Social Manager API")

# CORS Middleware - Allow frontend to communicate
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(posts_router, prefix="/posts", tags=["Posts"])
app.include_router(profile_router, prefix="/profile", tags=["Profile"])
app.include_router(content_router, prefix="/content", tags=["Content Generation"])

# Root endpoint
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to the Agentic Social Manager API!"}

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "message": "Backend is running"}

if __name__ == "__main__":
    print("Starting FastAPI server on http://localhost:8000")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
