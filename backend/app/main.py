from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routes.auth import router as auth_router
from app.routes.posts import router as posts_router
from app.routes.content import router as content_router
from app.routes.profiles import router as profiles_router
from app.routes.analytics import router as analytics_router
from app.routes.accounts import router as accounts_router
from app.routes.media import router as media_router
from app.services.scheduler import start_scheduler, shutdown_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the scheduler
    start_scheduler()
    yield
    # Shutdown: Stop the scheduler
    shutdown_scheduler()


app = FastAPI(title="Agentic Social Manager", lifespan=lifespan)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Agentic Social Manager API is running"}

# Register routers
app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(content_router)
app.include_router(profiles_router)
app.include_router(analytics_router)
app.include_router(accounts_router)
app.include_router(media_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)