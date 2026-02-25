import base64
import requests
import time
from app.config import config
from typing import List


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
	
	def publish_album(self, image_urls: List[str], caption: str):
		"""
		Publish multiple images as a multi-photo post to Facebook
		Uses the two-step workflow: Upload unpublished, then link with attached_media
		
		Args:
			image_urls: List of image URLs or base64 strings
			caption: Caption for the album
		"""
		import json
		
		if not self.page_id or not self.token:
			return {"status": "error", "detail": "Facebook credentials not configured"}
		
		if not image_urls or len(image_urls) < 2:
			return {"status": "error", "detail": "Album requires at least 2 images"}
		
		try:
			photo_ids = []
			
			# Step 1: Upload each photo as unpublished
			for idx, image in enumerate(image_urls):
				upload_url = f"https://graph.facebook.com/{self.api_version}/{self.page_id}/photos"
				
				if image.startswith("data:image"):
					header, encoded = image.split(",", 1)
					image_bytes = base64.b64decode(encoded)
					files = {"source": ("image.jpg", image_bytes, "image/jpeg")}
					data = {
						"published": "false",
						"access_token": self.token,
					}
					response = requests.post(upload_url, files=files, data=data, timeout=30).json()
				else:
					payload = {
						"url": image,
						"published": "false",
						"access_token": self.token,
					}
					response = requests.post(upload_url, data=payload, timeout=30).json()
				
				if "id" not in response:
					return {"status": "error", "detail": f"Failed to upload photo {idx + 1}: {response}"}
				
				photo_ids.append(response["id"])
				time.sleep(0.3)  # Small delay between uploads
			
			# Step 2: Create feed post with attached_media linking all photos
			feed_url = f"https://graph.facebook.com/{self.api_version}/{self.page_id}/feed"
			
			# Use JSON encoding for attached_media parameter
			import json
			
			feed_payload = {
				"message": caption,
				"attached_media": json.dumps([{"media_fbid": pid} for pid in photo_ids]),
				"access_token": self.token,
			}
			
			feed_response = requests.post(feed_url, data=feed_payload, timeout=30).json()
			
			if "id" not in feed_response:
				return {"status": "error", "detail": f"Failed to create multi-photo post: {feed_response}"}
			
			return {"status": "success", "data": {"post_id": feed_response["id"], "photos": len(photo_ids)}}
		
		except Exception as e:
			return {"status": "error", "detail": str(e)}
	def publish_video(self, video_url: str, caption: str):
		"""
		Publish a video to Facebook feed
		
		Args:
			video_url: URL of the video (must be publicly accessible)
			caption: Caption for the video
		"""
		if not self.page_id or not self.token:
			return {"status": "error", "detail": "Facebook credentials not configured"}
		
		if not video_url:
			return {"status": "error", "detail": "Video URL is required"}
		
		if video_url.startswith("data:"):
			return {"status": "error", "detail": "Video must be uploaded to a public server (like Cloudinary) before publishing to Facebook"}
		
		try:
			# Publish video to feed
			url = f"https://graph.facebook.com/{self.api_version}/{self.page_id}/videos"
			payload = {
				"file_url": video_url,
				"description": caption,  # Use 'description' for video captions, not 'caption'
				"access_token": self.token,
			}
			
			response = requests.post(url, data=payload, timeout=60).json()
			
			if "id" not in response:
				return {"status": "error", "detail": response}
			
			return {"status": "success", "data": response}
		
		except Exception as e:
			return {"status": "error", "detail": str(e)}