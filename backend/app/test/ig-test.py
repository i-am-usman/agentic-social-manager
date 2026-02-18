# import requests

# TOKEN = "IGAAZA8ZA5mkLexBZAFlEeTlXTnRORXhUWmRBX2ZAELXBzODBJQ001S3pLZADhnUjd5ZAWlycXF2emxsdjZAfdjZAXYnJ5Q0p5MWIxN2xVUElvbVduUjVQQWluZA09TUXFlQWR3MWNZAMlJHdlA4eklBMVlrVmZAwbEtlcnNvZA2NGZAi1OZAXRwZAwZDZD" # Aapka current page token (image_2485b4 wala)
    
# IG_ID = "17841477977449512"

# def moderate_comment(comment_id, action="HIDE"):
#     """
#     Action can be 'HIDE' or 'DELETE'
#     Agentic Logic: Sentiment negative hone par auto-hide karna
#     """
#     url = f"https://graph.facebook.com/v24.0/{comment_id}"
    
#     if action == "HIDE":
#         payload = {'hide': True, 'access_token': TOKEN}
#         response = requests.post(url, data=payload)
#     else:
#         response = requests.delete(url, params={'access_token': TOKEN})
        
#     return response.json()

# # Example usage:
# print(moderate_comment("i_m__usman", action="HIDE"))


import requests

# TOKEN = "IGAAZA8ZA5mkLexBZAFlEeTlXTnRORXhUWmRBX2ZAELXBzODBJQ001S3pLZADhnUjd5ZAWlycXF2emxsdjZAfdjZAXYnJ5Q0p5MWIxN2xVUElvbVduUjVQQWluZA09TUXFlQWR3MWNZAMlJHdlA4eklBMVlrVmZAwbEtlcnNvZA2NGZAi1OZAXRwZAwZDZD" # Aapka current page token (image_2485b4 wala)
TOKEN = "EAAfZBVSoX4EEBQkZB8xGcIrmUWmvZA3Ix1JbXEBsMsDIWAu7surYuWqdHzn6fPpa4mgctjSsZBXKKlDbxDgFbRCx3qVZA2X9wZCPSru5WUT5CamaAdZCE9sHRgtojJm0gV8w9ZCkBVEIh7kqNyEKhUKM9ZCjtLmjv41gcBTQC3qNJz6N4vcsnksjbCCwyocblu6Q1UITK8N5aazU9xQZDZD"
# Yeh ID aapki image_3f71e1.jpg wali post ki hai
MEDIA_ID = "1825634261413356" 

def get_comment_ids():
    url = f"https://graph.facebook.com/v24.0/{MEDIA_ID}/comments"
    params = {'access_token': TOKEN}
    response = requests.get(url, params=params).json()
    
    # Yeh list aapko comment text aur unki IDs return karegi
    for comment in response.get('data', []):
        print(f"Comment: {comment['text']} | ID: {comment['id']}")

print(get_comment_ids())