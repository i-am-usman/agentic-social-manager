import os
import requests
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

# Initialize Anthropic client
client = Anthropic()

UNSPLASH_API_KEY = os.getenv("UNSPLASH_API_KEY", "your-unsplash-key")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

def generate_caption(topic: str, language: str = "english"):
    """Generate social media caption using Claude AI"""
    
    prompt = f"""You are a creative social media content specialist. Generate a compelling Instagram caption for the topic: "{topic}"
    
    Requirements:
    - Keep it concise (under 150 characters)
    - Add relevant emojis
    - Make it engaging and shareable
    - Language: {language}
    
    Return ONLY the caption text, nothing else."""
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        caption = message.content[0].text.strip()
        return {"caption": caption, "success": True}
    
    except Exception as e:
        print(f"Error generating caption: {str(e)}")
        return {"error": str(e), "success": False}


def generate_hashtags(topic: str, count: int = 6):
    """Generate relevant hashtags using Claude AI"""
    
    prompt = f"""Generate {count} relevant and trending hashtags for social media content about: "{topic}"
    
    Requirements:
    - Make them specific to the topic
    - Include mix of popular and niche hashtags
    - Format: #hashtag (one per line)
    
    Return ONLY the hashtags, nothing else."""
    
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        
        hashtags_text = message.content[0].text.strip()
        hashtags = [tag.strip() for tag in hashtags_text.split('\n') if tag.strip().startswith('#')]
        
        return {"hashtags": hashtags, "success": True}
    
    except Exception as e:
        print(f"Error generating hashtags: {str(e)}")
        return {"error": str(e), "success": False}


def generate_image_url(topic: str):
    """Generate image URL from Unsplash API"""
    
    url = "https://api.unsplash.com/photos/random"
    
    params = {
        "query": topic,
        "w": 800,
        "h": 600,
        "client_id": UNSPLASH_API_KEY
    }
    
    try:
        response = requests.get(url, params=params)
        
        if response.status_code == 200:
            data = response.json()
            image_url = data.get("urls", {}).get("regular")
            return {"image_url": image_url, "success": True}
        else:
            # Fallback to placeholder if quota exceeded
            fallback_url = f"https://source.unsplash.com/800x600/?{topic.replace(' ', '+')}"
            return {"image_url": fallback_url, "success": True}
    
    except Exception as e:
        print(f"Error generating image: {str(e)}")
        # Fallback URL
        fallback_url = f"https://source.unsplash.com/800x600/?{topic.replace(' ', '+')}"
        return {"image_url": fallback_url, "success": True}


def generate_all_content(topic: str, language: str = "english"):
    """Generate complete content package: caption, hashtags, and image"""
    
    results = {
        "topic": topic,
        "language": language,
        "caption": None,
        "hashtags": [],
        "image_url": None,
        "success": False
    }
    
    # Generate caption
    caption_result = generate_caption(topic, language)
    if caption_result.get("success"):
        results["caption"] = caption_result.get("caption")
    else:
        print(f"Caption error: {caption_result.get('error')}")
    
    # Generate hashtags
    hashtags_result = generate_hashtags(topic)
    if hashtags_result.get("success"):
        results["hashtags"] = hashtags_result.get("hashtags", [])
    else:
        print(f"Hashtags error: {hashtags_result.get('error')}")
    
    # Generate image
    image_result = generate_image_url(topic)
    if image_result.get("success"):
        results["image_url"] = image_result.get("image_url")
    else:
        print(f"Image error: {image_result.get('error')}")
    
    results["success"] = all([results["caption"], results["hashtags"], results["image_url"]])
    
    return results

