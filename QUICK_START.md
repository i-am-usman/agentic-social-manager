# 🎯 Quick Start - API Content Generation

## What Changed?

Your app now has **real AI-powered content generation** instead of mock data!

### **Before**
- ❌ Static templates
- ❌ Mock hashtags  
- ❌ Random images

### **After** ✨
- ✅ **Claude AI** generates unique captions
- ✅ **Claude AI** creates smart hashtags
- ✅ **Unsplash** provides real images
- ✅ **Multi-language** support (English & Urdu)

---

## 🚀 Quick Setup (3 Steps)

### **Step 1: Get API Keys** (5 minutes)

**Anthropic Claude:**
# Quick Start — Agentic Social Manager

3-minute setup to run the app locally (backend + frontend).

Prerequisites
- Python 3.10+ and pip
- Node.js 18+ and npm

1) Configure environment

 - Copy the example .env and edit locally (do NOT commit):

```powershell
cd C:\FYP-ASM\backend
copy .env.example .env
# Edit backend\.env and paste your real keys
```

Supported environment variables (examples):

```env
# Option A: Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-REPLACE_ME

# Option B: RapidAPI (ChatGPT wrapper)
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=chatgpt-42.p.rapidapi.com

# Unsplash (image search)
UNSPLASH_API_KEY=REPLACE_WITH_UNSPLASH_KEY
```

2) Start backend

```powershell
cd C:\FYP-ASM\backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend should be available at `http://localhost:8000`.

3) Start frontend

```powershell
cd C:\FYP-ASM\frontend
npm install     # if not already installed
npm start
```

Open `http://localhost:3000` in your browser. Enter a topic in the Create Content page and click the buttons to generate caption, hashtags, image, or all together.

Quick test (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/content/generate" -Method POST -ContentType "application/json" -Body (ConvertTo-Json @{ topic = "travel"; language = "english" })
```

Notes
- Keep your `.env` secret and add it to `.gitignore` if not already ignored.
- If you exposed keys previously, rotate them immediately.

That's it — the app will generate real captions and images when both servers are running.

