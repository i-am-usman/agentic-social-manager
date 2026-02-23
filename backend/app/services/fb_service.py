import base64
import requests
from app.config import config


class FacebookService:
	def __init__(self, page_id: str | None, access_token: str | None):
		self.page_id = page_id
		self.token = access_token
		self.api_version = config.GRAPH_API_VERSION

	def _publish_photo_url(self, image_url: str, caption: str):
		url = f"https://graph.facebook.com/{self.api_version}/{self.page_id}/photos"
		payload = {
			"url": image_url,
			"caption": caption,
			"access_token": self.token,
		}
		return requests.post(url, data=payload, timeout=30).json()

	def _publish_photo_base64(self, image_base64: str, caption: str):
		url = f"https://graph.facebook.com/{self.api_version}/{self.page_id}/photos"
		header, encoded = image_base64.split(",", 1)
		image_bytes = base64.b64decode(encoded)
		files = {"source": ("image.jpg", image_bytes, "image/jpeg")}
		data = {
			"caption": caption,
			"access_token": self.token,
		}
		return requests.post(url, files=files, data=data, timeout=30).json()

	def publish_text(self, message: str):
		"""Publish text-only post to Facebook feed"""
		if not self.page_id or not self.token:
			return {"status": "error", "detail": "Facebook credentials not configured"}
		
		url = f"https://graph.facebook.com/{self.api_version}/{self.page_id}/feed"
		payload = {
			"message": message,
			"access_token": self.token,
		}
		response = requests.post(url, data=payload, timeout=30).json()
		
		if "id" not in response:
			return {"status": "error", "detail": response}
		
		return {"status": "success", "data": response}

	def publish_photo(self, image: str, caption: str):
		if not self.page_id or not self.token:
			return {"status": "error", "detail": "Facebook credentials not configured"}

		if image.startswith("data:image"):
			response = self._publish_photo_base64(image, caption)
		else:
			response = self._publish_photo_url(image, caption)

		if "id" not in response:
			return {"status": "error", "detail": response}

		return {"status": "success", "data": response}
