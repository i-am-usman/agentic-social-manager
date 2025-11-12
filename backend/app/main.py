from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth import router as auth_router
from app.posts import router as posts_router
from app.content import router as content_router
from app.profiles import router as profiles_router

app = FastAPI()

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (frontend + external)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/")
async def root():
    return {"message": "Agentic Social Manager API is running"}

# Register routers
app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(content_router)
app.include_router(profiles_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
