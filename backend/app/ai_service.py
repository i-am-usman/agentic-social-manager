import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST")  # e.g. "chatgpt-42.p.rapidapi.com"
UNSPLASH_API_KEY = os.getenv("UNSPLASH_API_KEY")

HEADERS = {
    "x-rapidapi-key": RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST,
    "Content-Type": "application/json"
}

def _safe_extract_text(resp_json):
    # Try several common response shapes returned by RapidAPI wrappers
    if not isinstance(resp_json, dict):
        return None
    # look for common keys
    # 1) choices -> [ { message: { content: "..." } } ]
    choices = resp_json.get("choices")
    if choices and isinstance(choices, list):
        first = choices[0]
        msg = first.get("message") if isinstance(first, dict) else None
        if msg and isinstance(msg, dict):
            return msg.get("content") or msg.get("text")
        return first.get("text") if isinstance(first, dict) and first.get("text") else None
    # 2) output / outputs
    if "output" in resp_json:
        out = resp_json["output"]
        if isinstance(out, list) and out:
            return out[0].get("content") or out[0].get("text")
        if isinstance(out, str):
            return out
    # 3) message or text at root
    if "message" in resp_json and isinstance(resp_json["message"], dict):
        return resp_json["message"].get("content") or resp_json["message"].get("text")
    if "text" in resp_json:
        return resp_json.get("text")
    # 4) fallback to raw 'response' or 'result'
    for key in ("response", "result", "data"):
        val = resp_json.get(key)
        if isinstance(val, str):
            return val
    return None

class AIService:
    """AI content generation using RapidAPI chat endpoint + Unsplash for images"""

    @staticmethod
    def _call_chat(messages: list, max_tokens: int = 256, temperature: float = 0.9):
        if not RAPIDAPI_KEY or not RAPIDAPI_HOST:
            raise RuntimeError("RAPIDAPI_KEY or RAPIDAPI_HOST not set in environment")
        url = f"https://{RAPIDAPI_HOST}/matag2"
        payload = {
            "messages": messages,
            "system_prompt": "",
            "temperature": temperature,
            "top_k": 5,
            "top_p": 0.9,
            "image": "",
            "max_tokens": max_tokens
        }
        try:
            resp = requests.post(url, json=payload, headers=HEADERS, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            text = _safe_extract_text(data)
            return text or data
        except requests.RequestException as e:
            print("RapidAPI Error:", e)
            return None

    @staticmethod
    def generate_caption(topic: str, language: str = "english") -> str:
        prompt = f"Generate an engaging social media caption about '{topic}' in {language}. Keep it short, emoji-friendly and suitable for Instagram."
        messages = [{"role": "user", "content": prompt}]
        result = AIService._call_chat(messages)
        if result:
            return result.strip()
        # fallback
        if language.lower().startswith("urdu"):
            return f"{topic} کی حیرت انگیز دنیا دریافت کریں! ہمارے ساتھ شامل ہوں۔"
        return f"🌟 Discover the amazing world of {topic}! Join us on this journey. ✨"

    @staticmethod
    def generate_hashtags(topic: str, count: int = 6) -> list:
        prompt = f"Provide {count} relevant hashtags for the topic '{topic}'. Return only hashtags separated by commas or newlines."
        messages = [{"role": "user", "content": prompt}]
        result = AIService._call_chat(messages, max_tokens=128, temperature=0.7)
        if result:
            # parse returned string into list
            # split on commas/newlines and clean
            parts = []
            for part in result.replace("\r", "\n").split("\n"):
                for sub in part.split(","):
                    tag = sub.strip()
                    if not tag:
                        continue
                    if not tag.startswith("#"):
                        tag = "#" + tag.replace(" ", "")
                    parts.append(tag)
            # ensure unique and limited to `count`
            seen = []
            for t in parts:
                if t not in seen:
                    seen.append(t)
                if len(seen) >= count:
                    break
            return seen if seen else [f"#{topic.replace(' ', '')}", "#trending", "#viral"]
        # fallback
        topic_words = topic.lower().split()
        tags = [f"#{''.join(topic_words)}", f"#{topic_words[0]}" if topic_words else "#trending",
                "#trending", "#viral", "#socialmedia", "#contentcreation"]
        return tags[:count]

    @staticmethod
    def generate_image(topic: str) -> str:
        try:
            url = "https://api.unsplash.com/photos/random"
            params = {"query": topic, "w": 800, "h": 600, "client_id": UNSPLASH_API_KEY}
            resp = requests.get(url, params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            return data.get("urls", {}).get("regular") or f"https://source.unsplash.com/800x600/?{topic}"
        except requests.RequestException as e:
            print("Unsplash API Error:", e)
            return f"https://source.unsplash.com/800x600/?{topic}"

    @staticmethod
    def generate_full_content(topic: str, language: str = "english"):
        caption = AIService.generate_caption(topic, language)
        hashtags = AIService.generate_hashtags(topic)
        image = AIService.generate_image(topic)
        return {"caption": caption, "hashtags": hashtags, "image": image}

