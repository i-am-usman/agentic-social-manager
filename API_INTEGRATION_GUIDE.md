# 🚀 API Content & Image Generation - Implementation Guide

## ✅ What's Been Done

### **Backend Integration**
- ✅ Created `/app/content.py` with new API endpoints
- ✅ Updated `ai_service.py` with Claude AI integration
- ✅ Configured CORS in `main.py` for frontend communication
- ✅ Created 4 API endpoints:
  - `POST /content/generate` - Full content generation
  - `POST /content/caption` - Caption only
  - `POST /content/hashtags` - Hashtags only  
  - `POST /content/image` - Image only

### **Frontend Integration**
- ✅ Updated `AgenticSocialManager.jsx`
- ✅ Replaced mock content generation with async API calls
- ✅ Added error handling and fallback to mock data
- ✅ Real content generation from Claude AI
- ✅ Real images from Unsplash API

### **API Services**
- ✅ **Claude AI** (Anthropic) - For captions & hashtags
- ✅ **Unsplash API** - For images
- ✅ Multi-language support (English, Urdu)

---

## 📋 Setup Instructions

### **Step 1: Get API Keys**

#### **Anthropic Claude API Key**
1. Go to https://console.anthropic.com/
2. Sign up or login
3. Navigate to "API Keys"
4. Create a new API key
5. Copy it (don't share!)

#### **Unsplash API Key**
1. Go to https://unsplash.com/developers
2. Sign up or login
3. Create a new application
4. Go to "Keys"
5. Copy your "Access Key"

### **Step 2: Configure Backend**

```bash
# Navigate to backend
cd backend

# Copy example env file
cp .env.example .env

# Edit .env with your keys using your favorite editor
# On Windows with VS Code:
code .env
```

**Add these to `.env`:**
```
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXXXXXXX
UNSPLASH_API_KEY=XXXXXXXXXXXXXXXXXXXXX
```

### **Step 3: Install Backend Dependencies**

```bash
cd backend
pip install -r requirements.txt
```

### **Step 4: Start Backend Server**

```bash
cd backend
python -m uvicorn app.main:app --reload
```

**Expected Output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

### **Step 5: Start Frontend Server** (in another terminal)

```bash
cd frontend
npm start
```

Frontend will open at `http://localhost:3000` or `http://localhost:3001`

---

## 🔌 API Endpoints

### **POST /content/generate**
**Generates caption, hashtags, and image in one call**

```bash
curl -X POST http://localhost:8000/content/generate \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Artificial Intelligence",
    "language": "english"
  }'
```

**Response:**
```json
{
  "topic": "Artificial Intelligence",
  "language": "english",
  "caption": "🤖 Exploring the future of AI innovation...",
  "hashtags": ["#AI", "#technology", "#innovation", "#trending"],
  "image_url": "https://images.unsplash.com/...",
  "success": true
}
```

### **POST /content/caption**
**Generates only caption**

```bash
curl -X POST http://localhost:8000/content/caption \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Artificial Intelligence",
    "language": "urdu"
  }'
```

### **POST /content/hashtags**
**Generates only hashtags**

```bash
curl -X POST http://localhost:8000/content/hashtags \
  -H "Content-Type: application/json" \
  -d '{"topic": "Artificial Intelligence"}'
```

### **POST /content/image**
**Generates only image**

```bash
curl -X POST http://localhost:8000/content/image \
  -H "Content-Type: application/json" \
  -d '{"topic": "Artificial Intelligence"}'
```

---

## 🧪 Testing

### **Test in VS Code Terminal**

1. **Check backend is running:**
```bash
curl http://localhost:8000/health
# Should return: {"status":"ok","message":"Backend is running"}
```

2. **Generate content:**
```bash
curl -X POST http://localhost:8000/content/generate \
  -H "Content-Type: application/json" \
  -d '{"topic":"python programming","language":"english"}'
```

### **Test in Frontend**

1. Open http://localhost:3000/3001
2. Login with any email/password
3. Go to "Create Content"
4. Enter a topic (e.g., "Web Development")
5. Click "Generate Content"
6. Watch real AI content appear! ✨

---

## 🔄 How It Works

```
┌──────────────┐
│   Frontend   │
│ React App    │
└──────┬───────┘
       │ POST /content/generate
       │ {topic, language}
       │
       ▼
┌──────────────────┐
│   FastAPI        │
│   Backend        │
├──────────────────┤
│ • Claude AI API  │──►  Anthropic
│ • Unsplash API   │──►  Unsplash  
│ • Content Router │
└──────┬───────────┘
       │
       │ JSON Response
       │ {caption, hashtags, image_url}
       │
       ▼
┌──────────────┐
│   Frontend   │
│ Display      │
│ Content      │
└──────────────┘
```

---

## 🐛 Troubleshooting

### **Backend Won't Start**

**Error: `ModuleNotFoundError: No module named 'anthropic'`**
```bash
pip install anthropic
```

**Error: `No module named 'app'`**
```bash
# Make sure you're in the backend folder
cd c:\FYP-ASM\backend

# Then run:
python -m uvicorn app.main:app --reload
```

**Error: `ANTHROPIC_API_KEY not found`**
- Create `.env` file in backend folder
- Add your keys to `.env`
- Restart the server

### **Frontend Can't Reach Backend**

**Error: `Failed to fetch http://localhost:8000/content/generate`**

1. Check backend is running: `http://localhost:8000/health`
2. Check frontend is running: `http://localhost:3000`
3. Check CORS is enabled in `main.py`
4. Check firewall isn't blocking port 8000

### **API Returns Error**

**"Invalid API key"**
- Check API key in `.env`
- Key should not have quotes
- Regenerate key if needed

**"No content generated"**
- Try simpler topic (e.g., "Technology")
- Check Claude API quota
- Check Unsplash API quota (50/hour free)

---

## 📚 Architecture Overview

### **Backend Files Structure**
```
backend/
├── app/
│   ├── main.py            # FastAPI app & CORS config
│   ├── content.py         # Content generation routes (NEW)
│   ├── ai_service.py      # Claude & Unsplash integration (UPDATED)
│   ├── models.py          # Pydantic models
│   ├── auth.py            # Authentication
│   ├── posts.py           # Posts routes
│   ├── profiles.py        # User profiles
│   └── __init__.py
├── .env                   # API keys (CREATE THIS!)
├── .env.example          # Template
└── requirements.txt      # Dependencies

frontend/
├── src/
│   ├── AgenticSocialManager.jsx  # Main component (UPDATED)
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
└── postcss.config.js
```

### **Key Files Modified**
1. ✅ `backend/app/main.py` - Added content router
2. ✅ `backend/app/ai_service.py` - Claude & Unsplash integration
3. ✅ `backend/app/content.py` - New API endpoints
4. ✅ `frontend/src/AgenticSocialManager.jsx` - Async API calls

---

## 🚀 Production Deployment

### **Backend (Heroku)**
```bash
git push heroku main
```

### **Frontend (Vercel)**
```bash
vercel deploy
```

Update frontend API URL in `AgenticSocialManager.jsx`:
```javascript
// Change from localhost to production URL
const response = await fetch('https://your-backend.herokuapp.com/content/generate', {
```

---

## 📖 Environment Variables Reference

| Variable | Required | Value |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | ✅ | From console.anthropic.com |
| `UNSPLASH_API_KEY` | ✅ | From unsplash.com/developers |
| `FASTAPI_PORT` | ❌ | Default: 8000 |

---

## ✨ Features

✅ **Real AI Content** - Claude generates unique captions  
✅ **Smart Hashtags** - Context-aware hashtags  
✅ **Real Images** - From Unsplash API  
✅ **Multi-language** - English & Urdu  
✅ **Error Handling** - Graceful fallbacks  
✅ **Production Ready** - CORS, validation, error responses  

---

##  🎯 Next Steps

1. **Get API keys** from Anthropic and Unsplash
2. **Create .env file** in backend folder
3. **Install dependencies** with pip
4. **Start backend** on port 8000
5. **Start frontend** on port 3000
6. **Test content generation!**

---

## 💡 Tips

- Use simple topics first to test (e.g., "Technology", "Travel")
- Check API quotas in your Anthropic/Unsplash dashboards
- Monitor terminal output for errors
- Keep API keys secret - never commit `.env` to git!

---

**Happy content creating! 🎨✨**
