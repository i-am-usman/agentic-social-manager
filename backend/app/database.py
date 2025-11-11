from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB connection string from .env
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "agentic_social")

# print("Connecting to Mongo:", MONGO_URI)

# Connect to MongoDB
client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Example collections
users_collection = db["users"]
posts_collection = db["posts"]
