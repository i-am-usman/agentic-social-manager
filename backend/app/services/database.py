from pymongo import MongoClient
import os
import certifi
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "agentic_social")

client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=False,
    retryWrites=True,
    retryReads=True,
    serverSelectionTimeoutMS=20000,
    connectTimeoutMS=20000,
    socketTimeoutMS=45000,
    maxPoolSize=30,
    minPoolSize=0,
    maxIdleTimeMS=60000,
)
db = client[DB_NAME]

users_collection = db["users"]
posts_collection = db["posts"]
feedback_collection = db["feedback"]

# Automation collections
automation_settings_collection = db["automation_settings"]
automation_events_collection = db["automation_events"]
automation_actions_collection = db["automation_actions"]
dm_threads_collection = db["dm_threads"]
poll_cursor_state_collection = db["poll_cursor_state"]

def init_automation_indexes():
    """Initialize indexes for automation collections - call on app startup"""
    feedback_collection.create_index(
        [("created_by_user_id", 1), ("created_at", -1)]
    )
    feedback_collection.create_index(
        [("feature_key", 1), ("created_at", -1)]
    )
    feedback_collection.create_index(
        [("rating", 1)]
    )
    
    # automation_settings: user + platform should be unique
    automation_settings_collection.create_index(
        [("user_id", 1), ("platform", 1)],
        unique=True
    )
    
    # automation_events: query by user, platform, created_at for polling
    automation_events_collection.create_index(
        [("user_id", 1), ("platform", 1), ("created_at", -1)]
    )
    automation_events_collection.create_index(
        [("user_id", 1), ("event_type", 1)],
    )
    
    # automation_actions: query by idempotency_key (deduplication), user + status for retry
    automation_actions_collection.create_index(
        [("idempotency_key", 1), ("user_id", 1)],
        unique=True
    )
    automation_actions_collection.create_index(
        [("user_id", 1), ("status", 1)]
    )
    automation_actions_collection.create_index(
        [("next_retry_at", 1)],
    )
    
    # dm_threads: query by user + platform + conversation_id (update state)
    dm_threads_collection.create_index(
        [("user_id", 1), ("platform", 1), ("conversation_id", 1)],
        unique=True
    )
    dm_threads_collection.create_index(
        [("is_paused_by_human", 1)],
    )
    
    # poll_cursor_state: key state by (user, platform, channel_type)
    poll_cursor_state_collection.create_index(
        [("user_id", 1), ("platform", 1), ("channel_type", 1)],
        unique=True
    )