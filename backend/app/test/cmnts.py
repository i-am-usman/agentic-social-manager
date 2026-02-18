import requests

# 1. Use the Page Access Token you generated earlier
# ACCESS_TOKEN = "EAAfZBVSoX4EEBQkZB8xGcIrmUWmvZA3Ix1JbXEBsMsDIWAu7surYuWqdHzn6fPpa4mgctjSsZBXKKlDbxDgFbRCx3qVZA2X9wZCPSru5WUT5CamaAdZCE9sHRgtojJm0gV8w9ZCkBVEIh7kqNyEKhUKM9ZCjtLmjv41gcBTQC3qNJz6N4vcsnksjbCCwyocblu6Q1UITK8N5aazU9xQZDZD" 
ACCESS_TOKEN = "IGAAZA8ZA5mkLexBZAGJrR0pNTzQxRDNGWmZAhY0lMOEx5UVV6Q0w0aGdKX3JocU5rRFJ2X0pDUFpSaElvdTlnUi1la0pOcmNyeHNJVHp5MnVLTkNLMkNpdHp6NkxVRnpYVWxOdlBnOGNmVlVHZAGxUMjEydjc4STU1VzFPbnBKZA0U4OAZDZD"
# 2. Your Instagram Business Account ID (from your dashboard)
IG_USER_ID = "17841477977449512" 

def enable_subscriptions():
    url = f"https://graph.facebook.com/v24.0/{IG_USER_ID}/subscribed_apps"
    
    # We explicitly ask for 'comments' and 'mentions' here
    params = {
        "subscribed_fields": "comments,mentions,messages", 
        "access_token": ACCESS_TOKEN
    }
    
    response = requests.post(url, params=params)
    print(response.json())

enable_subscriptions()