import os
from pathlib import Path
from dotenv import load_dotenv

# Always load backend/.env no matter where the process is started from.
BACKEND_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=BACKEND_ENV_PATH)

SECRET_KEY = os.getenv("JWT_SECRET", "mysecretkey")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

# Password reset configuration
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", 15))
RESET_RATE_LIMIT_WINDOW_MINUTES = int(os.getenv("RESET_RATE_LIMIT_WINDOW_MINUTES", 15))
RESET_RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RESET_RATE_LIMIT_MAX_REQUESTS", 5))
# In local development, returning the token helps test the flow without an email provider.
RESET_TOKEN_DEV_RETURN = os.getenv("RESET_TOKEN_DEV_RETURN", "true").lower() == "true"

# Admin bootstrap / registration gate
ADMIN_REGISTRATION_SECRET = os.getenv("ADMIN_REGISTRATION_SECRET")

GRAPH_API_VERSION = os.getenv("GRAPH_API_VERSION", "v21.0")

# Meta OAuth configuration
META_APP_ID = os.getenv("META_APP_ID")
META_APP_SECRET = os.getenv("META_APP_SECRET")
META_REDIRECT_URI = os.getenv("META_REDIRECT_URI", "http://localhost:3000/connect/callback")
META_CONFIG_ID = os.getenv("META_CONFIG_ID")
META_OAUTH_STATE_TTL_SECONDS = int(os.getenv("META_OAUTH_STATE_TTL_SECONDS", 600))
META_SCOPES = [
	scope.strip()
	for scope in os.getenv(
		"META_SCOPES",
		(
			"public_profile,email,business_management,pages_show_list,pages_read_engagement,read_insights,"
			"pages_read_user_content,pages_manage_engagement,pages_manage_posts,"
			"pages_messaging,pages_manage_metadata,instagram_basic,"
			"instagram_manage_insights,instagram_manage_comments,"
			"instagram_manage_messages,instagram_content_publish"
		),
	).split(",")
	if scope.strip()
]

FB_PAGE_ID = os.getenv("FB_PAGE_ID")
FB_PAGE_ACCESS_TOKEN = os.getenv("FB_PAGE_ACCESS_TOKEN")
IG_USER_ID = os.getenv("IG_USER_ID")
IG_ACCESS_TOKEN = os.getenv("IG_ACCESS_TOKEN")

# AI Services
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
BYTEZ_API_KEY = os.getenv("BYTEZ_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
COMMENT_ANALYSIS_CONFIDENCE_THRESHOLD = float(os.getenv("COMMENT_ANALYSIS_CONFIDENCE_THRESHOLD", "0.65"))

# Image hosting for Instagram (requires public URLs)
IMGBB_API_KEY = os.getenv("IMGBB_API_KEY")

# Cloudinary configuration for image and video hosting
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

# LinkedIn configuration (OAuth - for future use)
LINKEDIN_CLIENT_ID = os.getenv("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = os.getenv("LINKEDIN_CLIENT_SECRET")
LINKEDIN_REDIRECT_URI = os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:8000/accounts/linkedin/callback")
LINKEDIN_ORGANIZATION_ID = os.getenv("LINKEDIN_ORGANIZATION_ID")