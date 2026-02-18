import requests
import json

# Credentials from your dashboard
ACCESS_TOKEN = "IGAAZA8ZA5mkLexBZAGF4eG5kX0s4SE15ZAVpTQ0w5VGsxYW1tQ3ZANSWtsN0dnaVMzMDdrZAkp1VXRCQzN1eFp0UGhWekhNbWFKajI3OHdvQXBTNGc1bVBWcDB6N2pDX0NHejJnRUM2RktqclgxdlNlclY2dnFqRll3ZAkZANX051TjNkVQZDZD" # image_403f7d wala token
IG_ACCOUNT_ID = "17841477977449512" # image_3d1500 se verify kiya gaya ID

def print_response(label, response):
    try:
        payload = response.json()
    except ValueError:
        payload = {"raw": response.text}
    print(f"\n--- {label} ---")
    print(json.dumps(payload, indent=2))
    return payload

def fetch_and_test_engagement():
    print("--- 1. Fetching Recent Media ---")
    media_url = f"https://graph.facebook.com/v24.0/{IG_ACCOUNT_ID}/media"
    params = {'fields': 'id,caption,comments_count,like_count', 'access_token': ACCESS_TOKEN}

    media_response = requests.get(media_url, params=params)
    media_res = print_response("Media Response", media_response)

    if 'error' in media_res:
        print("\nMedia fetch failed. Check token permissions and IG account ID.")
        return

    if 'data' in media_res and len(media_res['data']) > 0:
        latest_post = media_res['data'][0]
        post_id = latest_post['id']
        print(f"Latest Post ID: {post_id} | Caption: {latest_post.get('caption', 'No Caption')}")

        print("\n--- 2. Fetching Comments for this Post ---")
        comment_url = f"https://graph.facebook.com/v24.0/{post_id}/comments"
        comments_response = requests.get(comment_url, params={'access_token': ACCESS_TOKEN})
        comments = print_response("Comments Response", comments_response)

        for c in comments.get('data', []):
            comment_id = c['id']
            text = c['text'].lower()
            print(f"User said: '{text}' | ID: {comment_id}")

            # Agentic Logic: Simple Keyword-based Sentiment Reply
            if "testing" in text or "good" in text:
                print(f"Agent Action: Sending Positive Reply to {comment_id}...")
                reply_url = f"https://graph.facebook.com/v24.0/{comment_id}/replies"
                requests.post(reply_url, data={'message': 'ASMA Agent is working perfectly! 🤖', 'access_token': ACCESS_TOKEN})
    else:
        print("No media found. Pehle aik post create karein.")

if __name__ == "__main__":
    fetch_and_test_engagement()