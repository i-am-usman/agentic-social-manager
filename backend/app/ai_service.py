import os
import requests
from dotenv import load_dotenv

load_dotenv()

RAPID_API_KEY = os.getenv("RAPID_API_KEY") or "7b55821abamsh1b7429025c7560ep1d5338jsnfdfe7c4e2005"
RAPID_API_URL = "https://ai-content-generation-api.p.rapidapi.com/generate-content"

def generate_caption(prompt: str):
    headers = {
        "x-rapidapi-key": RAPID_API_KEY,
        "x-rapidapi-host": "ai-content-generation-api.p.rapidapi.com",
        "Content-Type": "application/json"
    }

    payload = {
        "type": "instagram_caption",
        "topic": prompt,
        "length": "short"
    }

    try:
        response = requests.post(RAPID_API_URL, headers=headers, json=payload)
        print("🔹 Status:", response.status_code)
        print("🔹 Response:", response.text)

        if response.status_code != 200:
            return {"error": f"Request failed: {response.text}"}

        data = response.json()
        return {"caption": data.get("result", "No caption generated")}

    except Exception as e:
        return {"error": str(e)}
