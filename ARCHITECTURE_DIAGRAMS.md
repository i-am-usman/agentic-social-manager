# 📊 Architecture & Data Flow Diagrams

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AGENTIC SOCIAL MANAGER                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND LAYER (React)                           │  │
│  │                  http://localhost:3000                              │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────┐  │  │
│  │  │  Authentication     │  │  Content Generation Page            │  │  │
│  │  │  - Login            │  │  ┌─────────────────────────────────┐  │  │
│  │  │  - Register         │  │  │ Input:                          │  │  │
│  │  │  - Logout           │  │  │ • Topic: "Technology"           │  │  │
│  │  └─────────────────────┘  │  │ • Language: English/Urdu        │  │  │
│  │                           │  │                                 │  │  │
│  │  ┌─────────────────────┐  │  │ Output:                         │  │  │
│  │  │  Dashboard          │  │  │ • AI Caption                    │  │  │
│  │  │  - Stats            │  │  │ • Hashtags                      │  │  │
│  │  │  - Overview         │  │  │ • Image                         │  │  │
│  │  └─────────────────────┘  │  │ • Copy Button                   │  │  │
│  │                           │  └─────────────────────────────────┘  │  │
│  │                           └─────────────────────────────────────────┘  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                  │                                         │
│                                  │ HTTP POST                               │
│                                  │ JSON Request                            │
│                                  │                                         │
│                                  ▼                                         │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    BACKEND LAYER (FastAPI)                          │  │
│  │                   http://localhost:8000                              │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ FastAPI Main Application (main.py)                            │ │  │
│  │  │ • CORS Middleware (allow frontend requests)                   │ │  │
│  │  │ • Health Check Endpoint                                       │ │  │
│  │  │ • Router: /auth, /posts, /profile, /content                  │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ Content Router (content.py)                                   │ │  │
│  │  │                                                                │ │  │
│  │  │ POST /generate    ──┐                                          │ │  │
│  │  │ POST /caption     ─┼→ Calls AI Service                        │ │  │
│  │  │ POST /hashtags    ─┤                                          │ │  │
│  │  │ POST /image       ──┘                                          │ │  │
│  │  │                                                                │ │  │
│  │  │ • Input Validation (Pydantic)                                 │ │  │
│  │  │ • Error Handling                                              │ │  │
│  │  │ • Response Formatting                                         │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐ │  │
│  │  │ AI Service (ai_service.py)                                    │ │  │
│  │  │                                                                │ │  │
│  │  │ generate_caption(topic, language)                             │ │  │
│  │  │   └─→ Claude AI API                                           │ │  │
│  │  │       └─→ Returns: "🌟 Amazing caption..."                    │ │  │
│  │  │                                                                │ │  │
│  │  │ generate_hashtags(topic)                                      │ │  │
│  │  │   └─→ Claude AI API                                           │ │  │
│  │  │       └─→ Returns: ["#tech", "#ai", "#trending"]              │ │  │
│  │  │                                                                │ │  │
│  │  │ generate_image_url(topic)                                     │ │  │
│  │  │   └─→ Unsplash API                                            │ │  │
│  │  │       └─→ Returns: "https://images.unsplash.com/..."          │ │  │
│  │  │                                                                │ │  │
│  │  └────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│           ▲                                      ▲                         │
│           │ Text & Images                       │                         │
│           │                                     │                         │
│           │                 ┌───────────────────┴─────────────────┐      │
│           │                 │                                     │      │
│  ┌────────┴────────┐    ┌───┴──────────┐                 ┌────────┴────┐ │
│  │  Claude API     │    │ Environment  │                 │ Unsplash API│ │
│  │  (Anthropic)    │    │ Variables    │                 │  (Images)   │ │
│  │                 │    │              │                 │             │ │
│  │ • Captions      │    │ .env file:   │                 │ • Random    │ │
│  │ • Hashtags      │    │              │                 │   search    │ │
│  │ • Multi-lang    │    │ • ANTHROPIC  │                 │ • 800x600   │ │
│  │                 │    │   _API_KEY   │                 │ • Free tier │ │
│  │ Rate: 50/sec    │    │ • UNSPLASH   │                 │             │ │
│  │                 │    │   _API_KEY   │                 │ 50/hour     │ │
│  └─────────────────┘    └──────────────┘                 └─────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Content Generation Flow

```
START
  ▼
┌──────────────────────────────────┐
## System Architecture

This document contains an ASCII-style architecture overview and the content generation data flow used during development. The runtime components are:

- Frontend: React app running at `http://localhost:3000` (development)
- Backend: FastAPI app running at `http://localhost:8000`
- AI provider: Anthropic Claude OR a RapidAPI ChatGPT wrapper (configured in `.env`)
- Image provider: Unsplash API (configured in `.env`)

High-level flow

1. User enters a topic and optional language in the frontend UI.
2. Frontend calls one of the backend endpoints under `/content`:
   - `/content/generate` — caption + hashtags + image
   - `/content/caption` — caption only
   - `/content/hashtags` — hashtags only
   - `/content/image` — image only
3. Backend validates the request, calls the AI image/text providers, and returns a JSON response.
4. Frontend displays results and provides copy / share actions.

Notes
- The backend supports calling Anthropic directly (use `ANTHROPIC_API_KEY`) or calling a RapidAPI-hosted ChatGPT endpoint (use `RAPIDAPI_KEY` and `RAPIDAPI_HOST`).
- Make sure `backend/.env` contains the correct provider keys and is not committed.

Diagram (simplified):

```text
Frontend (React) http://localhost:3000
  └─ POST /content/generate { topic, language }
      └─ Backend (FastAPI) http://localhost:8000
          ├─ content.router -> validate request
          ├─ ai_service -> call text generation provider (Anthropic or RapidAPI)
          └─ ai_service -> call Unsplash for image
              └─ Return { caption, hashtags, image }
```

Recommended local testing commands (PowerShell):

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/content/generate" -Method POST -ContentType "application/json" -Body (ConvertTo-Json @{ topic = "travel"; language = "english" })
```

Security
- Do not commit `.env` with real keys. Use `.env.example` as a template with placeholders.

-- End of architecture notes
   │                        │ Services    │
   │                        └──────┬──────┘
   │                               │
   │                      ┌────────┴────────┐
   │                      │ Wait for APIs   │
   │                      │ (Parallel)      │
   │                      └────────┬────────┘
   │                               │
   │                        ┌──────┴──────┐
   │                        │ Build       │
   │                        │ Response    │
   │                        └──────┬──────┘
   │                               │
   │  200 OK                       │
   │  {                            │
   │    "caption": "...",          │
   │    "hashtags": [...],         │
   │    "image_url": "...",        │
   │    "success": true            │
   │  }                            │
   │◄──────────────────────────────┤
   │                               │
   ├─ Display Results ─────────────►
   │                               │
```

## Error Handling Flow

```
Invalid Input
    ▼
┌──────────────────────────┐
│ Is topic empty?          │
└──────────────────────────┘
    │                    │
   YES                   NO
    ▼                    ▼
Return Error        Proceed
"Topic cannot      with API
be empty"           calls
    │
    └──► Frontend catches error
         │
         ├─ Check console for details
         ├─ Use fallback mock data
         └─ Show user notification


API Error (Invalid Key)
    ▼
┌──────────────────────────┐
│ API returns 401/403      │
└──────────────────────────┘
    ▼
Backend catches exception
    ▼
Returns error response
    ▼
Frontend fallback:
Uses mock data to generate
basic content
    ▼
User still gets something!
```

## File Structure

```
Agentic Social Manager/
│
├── frontend/                          ← React App
│   ├── src/
│   │   ├── AgenticSocialManager.jsx  (UPDATED - async API calls)
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   ├── postcss.config.js
│   └── tailwind.config.js
│
├── backend/                           ← FastAPI
│   ├── app/
│   │   ├── main.py                  (UPDATED - CORS + content router)
│   │   ├── content.py               (NEW - API routes)
│   │   ├── ai_service.py            (UPDATED - Claude + Unsplash)
│   │   ├── models.py                (UPDATED - new models)
│   │   ├── auth.py
│   │   ├── posts.py
│   │   ├── profiles.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── utils.py
│   │   └── __init__.py
│   ├── requirements.txt              (UPDATED - anthropic added)
│   ├── .env.example                  (NEW - template)
│   └── .env                          (CREATE THIS!)
│
├── Documentation/                     ← Guides
│   ├── QUICK_START.md                (NEW - 3-step setup)
│   ├── API_INTEGRATION_GUIDE.md       (NEW - full guide)
│   ├── SETUP_GUIDE.md                (UPDATED)
│   └── IMPLEMENTATION_SUMMARY.md      (NEW - this doc)
│
├── start-dev.bat                      ← Quick start script
└── start-dev.sh                       ← For Mac/Linux
```

## Technology Stack

```
FRONTEND
├── React 19.2.0
├── Tailwind CSS 3
├── Lucide React (Icons)
├── Fetch API (HTTP)
└── Responsive Design

BACKEND
├── FastAPI 0.121.1
├── Uvicorn (ASGI Server)
├── Pydantic 2.12.4 (Validation)
├── Python 3.10
└── Async/Await

EXTERNAL APIS
├── Anthropic Claude
│   ├── Model: claude-3-5-sonnet
│   ├── For: Captions & Hashtags
│   └── Token limit: 200k
│
└── Unsplash
    ├── API: /photos/random
    ├── For: Image Search
    └── Quota: 50/hour (free)

DATABASE (Future)
└── MongoDB / PostgreSQL
```

## Deployment Readiness

```
DEVELOPMENT (Current) ✅
├── Frontend: localhost:3000/3001
├── Backend: localhost:8000
├── No database (in-memory)
└── Environment: Development

STAGING (Ready to Deploy)
├── Frontend: Vercel/Netlify
├── Backend: Heroku/Railway
├── Database: MongoDB Cloud
└── HTTPS enabled

PRODUCTION (Future)
├── Frontend: CDN
├── Backend: Kubernetes/Fargate
├── Database: Managed PostgreSQL
├── Monitoring: Sentry/DataDog
└── Scaling: Auto-scale enabled
```

---

**Diagrams show complete system architecture and data flow! 🏗️**
