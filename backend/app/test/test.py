# import requests

# page_id = "106068218850406"
# access_token = "EAAfZBVSoX4EEBQnsT8QMohj1cz3J3T4RLoPIZC1UsWBs69oxGAoqE55xQ6GqzHZA3bwSAyK6RfnJkzDQCeSdqTLzc6Pc0OhNWZC7ZAkH0m7ujQQEQ7FzectPgKUF4mNXezuEopxedUqqkSilUYIKMvXJtoPVJdJFPLftpFYELmlsXcV2F7vW5VpZC4obL629denQZAEFu5Mz50O"

# url = f"https://graph.facebook.com/v24.0/{page_id}/feed"

# # Using the parameters from the provided documentation
# payload = {
#     "message": "Hello Khaaq! This post follows the official Meta Pages API guide.",
#     "published": "true", # Set to false + scheduled_publish_time for agentic scheduling
#     "access_token": access_token
# }

# response = requests.post(url, data=payload)
# print(response.json())

# import requests

# # Use the NEW token starting with 'EAA...'
# page_id = "106068218850406"
# access_token = "EAAfZBVSoX4EEBQsVJZCVC36ocojZC2NPcHwY8ZCOAEVzolEXgrOphTFf7GZCuj18lfZCGLgmYTYXe6rGJkFX2deKceqbhIDECFZBRjx5EPbros77F7Mz0xXA4m8UiZC3kSNKCn2y6sjE1JBAXJRpVXEcruyLO1ij3XbKTkQdihXebNiLfJDQgPRY6nwHxsDGLiY5JhU0ES9UaMU1H4T6vKqTtXhfo8PatPTq92FahJJpCDKfUdScnz7OKDL4cXUSMmixUG03dPCLOL8va1nWuEQvNOsQOAZDZD"

# # IMPORTANT: For photos, use /{page_id}/photos instead of /feed
# url = f"https://graph.facebook.com/v24.0/me/feed"

# payload = {
#     # "url": "https://baconmockup.com/640/360", # Link to your AI-generated image
#     "caption": "Hello Khaaq! Post successful via ASMA Backend.",
#     "access_token": access_token
# }

# response = requests.post(url, data=payload)
# print(response.json())
# import requests

# # 1. Configuration
# # Replace with your actual Page ID and the NEW token you generate
# PAGE_ID = "106068218850406" 
# ACCESS_TOKEN = "EAAfZBVSoX4EEBQtZCqolBuivTcoPiUAMtwkXPIq0lnQwklOtGer7sJpgNYjp4TLZCAwprsZBs8UaBZBI5MJmgJZCwZCZAmZAWC72MtHR72WvGs8uuOXaZAsLeKwo90EPUOVvkItfXudq0khuf0MDVmvr87fxZB0SrC6ZBYSRZAanz4CYaaLzpkZCyuHZCi4fZCfMscq8v81Tjspy2i9JRGQklnix1RbNBhEZD" 

# def publish_text_post(message):
#     """Publishes a simple text message to the Facebook Page feed."""
#     url = f"https://graph.facebook.com/v24.0/{PAGE_ID}/feed"
    
#     payload = {
#         "message": message,
#         "access_token": ACCESS_TOKEN
#     }
    
#     try:
#         response = requests.post(url, data=payload)
#         result = response.json()
        
#         if "id" in result:
#             print(f"✅ Post Successful! Post ID: {result['id']}")
#         else:
#             print(f"❌ Error: {result}")
            
#     except Exception as e:
#         print(f"⚠️ Request failed: {e}")

# # Run the function
# publish_text_post("Hello from my ASMA Backend! 🤖")

import requests

# 1. Configuration
PAGE_ID = "106068218850406" 
# Use the NEW EAA... token you generated with 'pages_manage_posts'
ACCESS_TOKEN = "EAAfZBVSoX4EEBQtZCqolBuivTcoPiUAMtwkXPIq0lnQwklOtGer7sJpgNYjp4TLZCAwprsZBs8UaBZBI5MJmgJZCwZCZAmZAWC72MtHR72WvGs8uuOXaZAsLeKwo90EPUOVvkItfXudq0khuf0MDVmvr87fxZB0SrC6ZBYSRZAanz4CYaaLzpkZCyuHZCi4fZCfMscq8v81Tjspy2i9JRGQklnix1RbNBhEZD" 

def post_image_to_fb(image_url, caption):
    """Posts an image from a URL to the Facebook Page."""
    url = f"https://graph.facebook.com/v24.0/{PAGE_ID}/photos"
    
    payload = {
        "url": image_url,
        "caption": caption,
        "access_token": ACCESS_TOKEN
    }
    
    try:
        response = requests.post(url, data=payload)
        result = response.json()
        
        if "id" in result:
            print(f"✅ Image Posted Successfully! ID: {result['id']}")
        else:
            print(f"❌ Error: {result}")
            
    except Exception as e:
        print(f"⚠️ Connection failed: {e}")

# Test with a sample image
post_image_to_fb(
    "https://baconmockup.com/640/360", 
    "This is an AI-generated test post from ASMA! 🤖"
)