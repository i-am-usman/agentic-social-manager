# from fastapi import FastAPI
# import requests

# app = FastAPI()

# @app.get("/fetch-insta")
# async def get_insta_data():
#     # Token must be fresh from the dashboard
#     params = {'fields': 'id,caption', 'access_token': "IGAAZA8ZA5mkLexBZAFpBR3NHRDN6V2I3aDhRZATB4ODNWYzZABRzNvNkp6blN5dWpNN2pXYWRhZA2lKVzdESFJLRTNjT2JuYzZAZAb2ptWEdnZATRROThXempsMjRXVGhGTGI0d1p0ckhPd21Wd3JhYk55V0dnRTMxY2pQMzVubUM3OWtyRQZDZD"}
#     res = requests.get(f"https://graph.facebook.com/v24.0/17841477977449512/media", params=params)
#     return res.json()

import requests

def asma_instagram_post(image_url, caption):
    ig_id = "17841477977449512"
    # token = "IGAAZA8ZA5mkLexBZAFlEeTlXTnRORXhUWmRBX2ZAELXBzODBJQ001S3pLZADhnUjd5ZAWlycXF2emxsdjZAfdjZAXYnJ5Q0p5MWIxN2xVUElvbVduUjVQQWluZA09TUXFlQWR3MWNZAMlJHdlA4eklBMVlrVmZAwbEtlcnNvZA2NGZAi1OZAXRwZAwZDZD" # Aapka current page token (image_2485b4 wala)
    # token = "EAAfZBVSoX4EEBQkZB8xGcIrmUWmvZA3Ix1JbXEBsMsDIWAu7surYuWqdHzn6fPpa4mgctjSsZBXKKlDbxDgFbRCx3qVZA2X9wZCPSru5WUT5CamaAdZCE9sHRgtojJm0gV8w9ZCkBVEIh7kqNyEKhUKM9ZCjtLmjv41gcBTQC3qNJz6N4vcsnksjbCCwyocblu6Q1UITK8N5aazU9xQZDZD" 
    token = "EAAfZBVSoX4EEBQt4QCZALlYHt5gAHn19cR1pvvKpxvdPLNjx4NUV6hj9ZA8IYb8YBPITGX7rtLLMYg2OgzZAZAB66aPJUmHmm5hbVOkCIzzAOHFf6ZAiwbpyZC5bAXfSlHrzNjCEmH4UnwQ9uVjxA43AUnkTdJMpJolZAjMPZBFxyV0cl4QiOcV8SdVBmJO2aZAvvP0Bl2Pk5TKUsQ"
    # token = "IGAAZA8ZA5mkLexBZAGJrR0pNTzQxRDNGWmZAhY0lMOEx5UVV6Q0w0aGdKX3JocU5rRFJ2X0pDUFpSaElvdTlnUi1la0pOcmNyeHNJVHp5MnVLTkNLMkNpdHp6NkxVRnpYVWxOdlBnOGNmVlVHZAGxUMjEydjc4STU1VzFPbnBKZA0U4OAZDZD"
    # Step 1: Container
    r1 = requests.post(f"https://graph.facebook.com/v24.0/{ig_id}/media", data={
        'image_url': image_url,
        'caption': caption,
        'access_token': token
    }).json()
    
    if 'id' in r1:
        # Step 2: Publish
        r2 = requests.post(f"https://graph.facebook.com/v24.0/{ig_id}/media_publish", data={
            'creation_id': r1['id'],
            'access_token': token
        })
        return "Post Successful!", r2.json()
    return "Error:", r1

# Run it!
print(asma_instagram_post("https://baconmockup.com/640/360", "Testing from ASMA Backend!"))