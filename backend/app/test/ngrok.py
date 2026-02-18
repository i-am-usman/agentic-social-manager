from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import PlainTextResponse
import uvicorn

app = FastAPI()
VERIFY_TOKEN = "ASMA_SECRET_2026"

@app.get("/webhook")
async def verify_webhook(request: Request):
    """Meta verification handshake"""
    params = request.query_params
    if params.get("hub.verify_token") == VERIFY_TOKEN:
        return PlainTextResponse(content=params.get("hub.challenge"))
    raise HTTPException(status_code=403, detail="Wrong Token")

@app.post("/webhook")
async def handle_webhook(request: Request):
    """Receive real-time updates"""
    data = await request.json()
    print("🔔 New Webhook Received:", data) # Terminal mein data print hoga
    return {"status": "ok"}

if __name__ == "__main__":
    # Make sure this port matches ngrok (8000)
    uvicorn.run(app, host="0.0.0.0", port=8000)