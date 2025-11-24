import os
import argparse
from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client.get_default_database()

def migrate(collection_name, dry_run=False, limit=5):
    col = db[collection_name]
    query = {"$and": [{"created_by": {"$exists": True}}, {"user_id": {"$exists": False}}]}
    if dry_run:
        docs = list(col.find(query).limit(limit))
        print(f"DRY RUN - {collection_name}: showing up to {limit} documents that would be changed:")
        for d in docs:
            print(d)
        print("Use --dry-run False to actually apply changes.")
        return
    result = col.update_many(
        query,
        [{"$set": {"user_id": {"$toString": "$created_by"}}}]
    )
    print(f"{collection_name}: matched {result.matched_count}, modified {result.modified_count}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--collection", "-c", default=None, help="Collection to migrate (posts|content). Leave empty to run both.")
    parser.add_argument("--dry-run", action="store_true", help="Show sample docs without modifying DB")
    parser.add_argument("--limit", type=int, default=5, help="Number of sample docs to show in dry-run")
    args = parser.parse_args()

    if args.collection:
        migrate(args.collection, dry_run=args.dry_run, limit=args.limit)
    else:
        migrate("posts", dry_run=args.dry_run, limit=args.limit)
        migrate("content", dry_run=args.dry_run, limit=args.limit)