# 🚀 Agentic Social Manager — Setup Guide

This guide walks through installing and running the project locally (Windows / PowerShell examples). The project has two parts:
- Frontend: React + Tailwind (dev server on port 3000)
- Backend: FastAPI (dev server on port 8000)

Prerequisites
- Python 3.10+ and pip
- Node.js 18+ and npm
- Git (to clone repository)

1) Install backend dependencies

```powershell
cd C:\FYP-ASM\backend
pip install -r requirements.txt
```

2) Configure environment (do NOT commit `.env`)

Copy the example file and edit values locally:

```powershell
cd C:\FYP-ASM\backend
copy .env.example .env
# Open backend\.env and set real API keys (Anthropic or RapidAPI + Unsplash)
code .env  # if using VS Code
```

Supported env variables (examples):

```env
# Option A: Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME

# Option B: RapidAPI (ChatGPT wrapper)
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=chatgpt-42.p.rapidapi.com

# Unsplash (image search)
UNSPLASH_API_KEY=REPLACE_WITH_UNSPLASH_KEY

# Other
JWT_SECRET=your_jwt_secret
```

3) (Optional) Ensure `.env` is ignored by git

If `.gitignore` does not already include `.env`, add it to avoid committing secrets.

4) Start backend server

```powershell
cd C:\FYP-ASM\backend
python -m uvicorn app.main:app --reload
```

You should see `Uvicorn running on http://127.0.0.1:8000` and `Application startup complete.`

5) Start frontend dev server

```powershell
cd C:\FYP-ASM\frontend
npm install    # (first time only)
npm start
```

Open `http://localhost:3000` in your browser.

Testing endpoints (PowerShell)

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/content/generate" -Method POST -ContentType "application/json" -Body (ConvertTo-Json @{ topic = "travel"; language = "english" })
```

Troubleshooting
- If you see `ModuleNotFoundError: No module named 'app'` make sure you run the uvicorn command from the `backend` folder.
- If the frontend can't reach the backend, confirm the backend is running and CORS is enabled in `backend/app/main.py`.
- If API calls return 401/403, double-check the keys in `backend/.env` and rotate keys if previously exposed.

Security reminder
- Never commit `.env` to git. Use `.env.example` only for placeholders.

That's it — backend and frontend should now be running locally.
