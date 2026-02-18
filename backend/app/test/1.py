import requests

# Yeh credentials aapne Meta Dashboard se liye hain
INSTAGRAM_ACCOUNT_ID = "17841477977449512" # Image_3d1500 se liya gaya ID
ACCESS_TOKEN = "IGAAZA8ZA5mkLexBZAFpBR3NHRDN6V2I3aDhRZATB4ODNWYzZABRzNvNkp6blN5dWpNN2pXYWRhZA2lKVzdESFJLRTNjT2JuYzZAZAb2ptWEdnZATRROThXempsMjRXVGhGTGI0d1p0ckhPd21Wd3JhYk55V0dnRTMxY2pQMzVubUM3OWtyRQZDZD" # Image_3d1500 wala token

def fetch_insta_posts():
    """Agentic feature: Last 5 posts ki performance aur comments check karna"""
    url = f"https://graph.facebook.com/v20.0/{INSTAGRAM_ACCOUNT_ID}/media"
    params = {
        'fields': 'id,caption,media_type,media_url,like_count,comments_count',
        'access_token': ACCESS_TOKEN
    }
    response = requests.get(url, params=params)
    return response.json()

def post_to_insta(image_url, caption):
    """Agentic feature: Multimodal content publish karna"""
    # Step 1: Media Container banana (Facebook API requirement)
    container_url = f"https://graph.facebook.com/v20.0/{INSTAGRAM_ACCOUNT_ID}/media"
    payload = {
        'image_url': image_url,
        'caption': caption,
        'access_token': ACCESS_TOKEN
    }
    
    container_res = requests.post(container_url, data=payload).json()
    
    if 'id' in container_res:
        creation_id = container_res['id']
        # Step 2: Container ko publish karna
        publish_url = f"https://graph.facebook.com/v20.0/{INSTAGRAM_ACCOUNT_ID}/media_publish"
        publish_payload = {
            'creation_id': creation_id,
            'access_token': ACCESS_TOKEN
        }
        final_res = requests.post(publish_url, data=publish_payload)
        return final_res.json()
    else:
        return container_res

# Testing
if __name__ == "__main__":
    print("Fetching Posts...")
    print(fetch_insta_posts())
    
    print("Posting Image...")
    print(post_to_insta("https://share.google/Wsd9c32gE0tMEe6Gn", "Hello from ASMA!"))