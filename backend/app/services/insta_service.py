import requests
from app.config import config


class InstaService:
    def __init__(self):
        self.ig_user_id = config.IG_USER_ID
        self.token = config.IG_ACCESS_TOKEN
        self.api_version = config.GRAPH_API_VERSION

    def publish_photo(self, image_url: str, caption: str):
        if not self.ig_user_id or not self.token:
            return {"status": "error", "detail": "Instagram credentials not configured"}

        if not image_url:
            return {"status": "error", "detail": "Image URL is required"}

        if image_url.startswith("data:image"):
            return {"status": "error", "detail": "Instagram requires a public image URL"}

        # Step 1: Create container
        url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media"
        payload = {
            "image_url": image_url,
            "caption": caption,
            "access_token": self.token,
        }
        r1 = requests.post(url, data=payload, timeout=30).json()

        if "id" not in r1:
            return {"status": "error", "detail": r1}

        # Step 2: Publish container
        publish_url = f"https://graph.facebook.com/{self.api_version}/{self.ig_user_id}/media_publish"
        r2 = requests.post(
            publish_url,
            data={"creation_id": r1["id"], "access_token": self.token},
            timeout=30,
        ).json()

        if "id" not in r2:
            return {"status": "error", "detail": r2}

        return {"status": "success", "data": r2}