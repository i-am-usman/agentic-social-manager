import os
import base64
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
BYTEZ_API_KEY = os.getenv("BYTEZ_API_KEY")
BYTEZ_MODEL = os.getenv("BYTEZ_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")


class AIService:
    """AI content generation using Google Gemini for captions/hashtags and Bytez for images"""

    @staticmethod
    def generate_caption(topic: str, language: str = "english") -> str:
        """Generate caption using Google Gemini API"""
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set in environment")
        
        try:
            import google.genai as genai
            
            client = genai.Client(api_key=GEMINI_API_KEY)
            
            if language.lower().startswith("urdu"):
                prompt = f"'{topic}' کے بارے میں ایک دلچسپ سوشل میڈیا کیپشن تیار کریں۔ یہ مختصر، emoji دوست اور Instagram کے لیے موزوں ہو۔"
            else:
                prompt = f"Generate an engaging social media caption about '{topic}' in {language}. Keep it short, emoji-friendly and suitable for Instagram."
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            if response and response.text:
                return response.text.strip()
            
            # Fallback if no response
            if language.lower().startswith("urdu"):
                return f"{topic} کی حیرت انگیز دنیا دریافت کریں! ہمارے ساتھ شامل ہوں۔"
            return f"🌟 Discover the amazing world of {topic}! Join us on this journey. ✨"
            
        except ImportError:
            raise RuntimeError("google-genai package not installed")
        except Exception as e:
            print(f"Gemini Caption Error: {e}")
            if language.lower().startswith("urdu"):
                return f"{topic} کی حیرت انگیز دنیا دریافت کریں! ہمارے ساتھ شامل ہوں۔"
            return f"🌟 Discover the amazing world of {topic}! Join us on this journey. ✨"

    @staticmethod
    def generate_hashtags(topic: str, count: int = 6) -> list:
        """Generate hashtags using Google Gemini API"""
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not set in environment")
        
        try:
            import google.genai as genai
            
            client = genai.Client(api_key=GEMINI_API_KEY)
            
            prompt = f"Provide {count} relevant hashtags for the topic '{topic}'. Return only hashtags separated by commas or newlines. Each hashtag should start with #."
            
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            
            if response and response.text:
                result = response.text.strip()
                parts = []
                for part in result.replace("\r", "\n").split("\n"):
                    for sub in part.split(","):
                        tag = sub.strip()
                        if not tag:
                            continue
                        if not tag.startswith("#"):
                            tag = "#" + tag.replace(" ", "")
                        parts.append(tag)
                
                seen = []
                for t in parts:
                    if t not in seen:
                        seen.append(t)
                    if len(seen) >= count:
                        break
                
                return seen if seen else [f"#{topic.replace(' ', '')}", "#trending", "#viral"]
            
            # Fallback
            topic_words = topic.lower().split()
            tags = [
                f"#{''.join(topic_words)}",
                f"#{topic_words[0]}" if topic_words else "#trending",
                "#trending",
                "#viral",
                "#socialmedia",
                "#contentcreation"
            ]
            return tags[:count]
            
        except ImportError:
            raise RuntimeError("google-genai package not installed")
        except Exception as e:
            print(f"Gemini Hashtags Error: {e}")
            topic_words = topic.lower().split()
            tags = [
                f"#{''.join(topic_words)}",
                f"#{topic_words[0]}" if topic_words else "#trending",
                "#trending",
                "#viral",
                "#socialmedia",
                "#contentcreation"
            ]
            return tags[:count]

    @staticmethod
    def generate_image(topic: str) -> str:
        """Generate image using Bytez API (Stable Diffusion SDXL)"""
        if not BYTEZ_API_KEY:
            raise RuntimeError("BYTEZ_API_KEY not set in environment")
        
        try:
            from bytez import Client
            
            client = Client(token=BYTEZ_API_KEY)
            
            response = client.generate(
                model=BYTEZ_MODEL,
                prompt=topic,
                height=512,
                width=768
            )
            
            if response and hasattr(response, 'images') and response.images:
                first_image = response.images[0]
                if hasattr(first_image, 'data'):
                    return base64.b64encode(first_image.data).decode('utf-8')
                if hasattr(first_image, 'url'):
                    return first_image.url
            
            # SVG placeholder fallback
            return f"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='512'%3E%3Crect fill='%23222' width='768' height='512'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23fff' text-anchor='middle' dominant-baseline='middle'%3E{topic[:30]}%3C/text%3E%3C/svg%3E"
            
        except ImportError:
            raise RuntimeError("bytez package not installed")
        except Exception as e:
            print(f"Bytez Image Generation Error: {e}")
            # Return SVG placeholder on failure
            return f"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='768' height='512'%3E%3Crect fill='%23222' width='768' height='512'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23fff' text-anchor='middle' dominant-baseline='middle'%3E{topic[:30]}%3C/text%3E%3C/svg%3E"

    @staticmethod
    def generate_full_content(topic: str, language: str = "english"):
        """Generate complete content: caption, hashtags, and image"""
        caption = AIService.generate_caption(topic, language)
        hashtags = AIService.generate_hashtags(topic)
        image = AIService.generate_image(topic)
        return {"caption": caption, "hashtags": hashtags, "image": image}

