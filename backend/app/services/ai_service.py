import base64
import os
from bytez import Bytez
from google import genai



GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
BYTEZ_API_KEY = os.getenv("BYTEZ_API_KEY")
BYTEZ_MODEL = os.getenv("BYTEZ_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")

gemini_client = genai.Client(api_key=GEMINI_API_KEY)


class AIService:
    """AI generation using Gemini (text) + Bytez (images)"""

    
    # Generate Caption (Gemini)
    
    @staticmethod
    def generate_caption(topic: str, language: str = "english") -> str:
        prompt = (
            f"Generate a short, engaging, emoji-rich social media caption "
            f"for the topic '{topic}' in {language}. Keep it under 25 words."
        )

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        return response.text.strip()

  
    # Generate Hashtags (Gemini)
   
    @staticmethod
    def generate_hashtags(topic: str, count: int = 6) -> list:
        prompt = (
            f"Generate {count} highly relevant social media hashtags for '{topic}'. "
            f"Return only hashtags separated by commas."
        )

        response = gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )

        raw = response.text
        tags = [tag.strip() for tag in raw.replace("\n", ",").split(",") if tag.strip()]

        # Ensure # prefix
        clean_tags = []
        for t in tags:
            if not t.startswith("#"):
                t = "#" + t.replace(" ", "")
            clean_tags.append(t)

        return clean_tags[:count]

    
    # Generate Image (Bytez)
    
    @staticmethod
    def generate_image(topic: str) -> str:
        sdk = Bytez(BYTEZ_API_KEY)
        model = sdk.model(BYTEZ_MODEL)

        prompt = (
        f"{topic}. Create a high-quality square image optimized for social media "
        f"(Instagram/Facebook). Use a 1:1 aspect ratio, designed for 1080x1080 px."
        )
        result = model.run(prompt)
        # result = model.run(topic)

        if result.output:
            out = result.output

            # URL
            if isinstance(out, str) and out.startswith("http"):
                return out

            # Base64
            if isinstance(out, str) and not out.startswith("http"):
                return f"data:image/png;base64,{out}"

            # Bytes → base64
            if isinstance(out, (bytes, bytearray)):
                b64 = base64.b64encode(out).decode("utf-8")
                return f"data:image/png;base64,{b64}"

        # On error, fallback placeholder
        return (
            "data:image/svg+xml,"
            "%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E"
            "%3Crect width='600' height='400' fill='%23ddd'/%3E"
            f"%3Ctext x='300' y='200' text-anchor='middle' fill='%23666'%3E{topic}%3C/text%3E"
            "%3C/svg%3E"
        )

    
    # Generate All Content
    
    @staticmethod
    def generate_full_content(topic: str, language: str = "english"):
        return {
            "caption": AIService.generate_caption(topic, language),
            "hashtags": AIService.generate_hashtags(topic),
            "image": AIService.generate_image(topic)
        }
