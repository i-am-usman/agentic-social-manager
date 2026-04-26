# 🚀 Agentic Social Manager

AI-Powered Social Media Management Platform (FastAPI + React + MongoDB)

Agentic Social Manager is a full-stack AI application that helps creators, marketers, and businesses automate **Instagram/Facebook-ready content creation and management**, including:

✅ AI-generated captions, hashtags, and images  
✅ Save posts as drafts, schedule, or publish  
✅ Feature feedback hub (submit + browse + filter)  
✅ Per-user dashboard with live stats (Total, Drafts, Scheduled, Published)  
✅ JWT-based authentication & protected routes  
✅ Clean and responsive React UI  
✅ FastAPI backend with MongoDB integration  

---

## 🧠 Features

🎨 **AI Image Generation**  
Generate 1080×1080 square images using Stable Diffusion XL (via Bytez API).

✏️ **AI Caption Generation**  
Powered by Gemini 2.5 Flash to create short, engaging, emoji-friendly captions.

🔖 **AI Hashtag Generation**  
Generate relevant, trending hashtags tailored to your topic.

📊 **Dashboard Analytics**  
Track **Total Posts, Drafts, Scheduled, Published** with real-time sync.

🔐 **User Authentication (JWT)**  
Secure login/register with token-based authentication.

🗂️ **Content Management**  
Save posts to MongoDB with status (`draft`, `scheduled`, `published`).

🎯 **Clean Frontend UI**  
React + TailwindCSS + Lucide Icons.

---

/frontend
  ├── src
  │   ├── components/
  │   │   └── StatsCard.jsx
  │   ├── pages/
  │   │   ├── Dashboard.jsx
  │   │   ├── Login.jsx
  │   │   └── Register.jsx
  │   ├── api/
  │   └── App.jsx
  └── package.json

/backend
  ├── app/
  │   ├── main.py
  │   ├── routes/                # API endpoints
  │   │   ├── auth.py
  │   │   ├── content.py
  │   │   ├── posts.py
  │   │   └── profiles.py
  │   ├── schemas/               # Pydantic request/response models
  │   │   ├── post_schema.py
  │   │   └── users.py
  │   ├── models/                # Database document structures
  │   │   ├
  │   │   └── users.py
  │   ├── services/              # Business logic + integrations
  │   │   ├── ai_service.py
  │   │   ├── database.py
  │   │   ├── dependencies.py
  │   │   └── utils.py
  │   ├── config/                # App settings + security
  │   │   ├── config.py
  │   │   └── security.py
  ├── requirements.txt
  └── .env

---

## ⚙️ Tech Stack

**Frontend**
- React + Vite
- TailwindCSS
- Lucide Icons
- React Router

**Backend**
- FastAPI
- MongoDB
- JWT Authentication
- Pydantic Models
- Gemini API (`google-genai`)
- Bytez API (Stable Diffusion XL)

---

## 🔑 Environment Variables

Create a `.env` file inside the **backend** folder:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY=your_gemini_api_key_here
BYTEZ_API_KEY=your_bytez_api_key_here
BYTEZ_MODEL=stabilityai/stable-diffusion-xl-base-1.0
COMMENT_ANALYSIS_CONFIDENCE_THRESHOLD=0.65
```

> ⚠️ Never commit API keys or secrets to GitHub.

---

## 📦 Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/agentic-social-manager.git
cd agentic-social-manager
```

### 2️⃣ Backend Setup (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Backend runs at: `http://127.0.0.1:8000`

### 3️⃣ Frontend Setup (React)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 🔥 API Endpoints

### Auth
- `POST /auth/register` → Register new user
- `POST /auth/login` → Login and get JWT

### Content
- `POST /content/generate` → Generate full content (caption + hashtags + image)
- `POST /content/caption` → Generate caption
- `POST /content/hashtags` → Generate hashtags
- `POST /content/image` → Generate image
- `POST /content/save` → Save generated content
- `GET /content/stats` → Get per-user post stats

### Feedback
- `GET /feedback/features` → Available feature categories
- `POST /feedback` → Submit feedback for a feature
- `GET /feedback` → List feedback with paging and filters
- `GET /feedback/summary` → Aggregate feedback counts and average ratings

### Admin
- `ADMIN_REGISTRATION_SECRET` in `backend/.env` enables invite-only admin registration
- Frontend route: `/admin/register`
- `GET /admin/feedback` → Admin-only feedback console data
- Frontend route: `/admin/login` and `/admin/feedback`

---

## 📊 Dashboard Stats

- **Total Posts** → All posts created by user  
- **Drafts** → Posts saved as draft  
- **Scheduled** → Posts scheduled for future publishing  
- **Published** → Posts already published  

Stats auto-refresh every 10 seconds.

---

## 🧪 Testing

Run backend tests:
```bash
pytest
```

Run frontend tests:
```bash
npm test
```

---

## 🚀 Deployment

### Vercel Frontend

1. Set the Vercel project root directory to `frontend`.
2. Add `REACT_APP_API_BASE_URL` in Vercel and point it at your deployed backend.
3. Deploy with the existing `npm run build` script; the output directory is `build`.
4. The included Vercel rewrite keeps client-side routes like `/dashboard` and `/connect/callback` working on refresh.

### Backend Hosting

This FastAPI backend is not a good fit for Vercel serverless because it starts a scheduler on startup. Deploy it separately on Render, Railway, Docker, or another always-on host, then point the Vercel frontend at that backend with `REACT_APP_API_BASE_URL`.

For OAuth, set `META_REDIRECT_URI` on the backend to `https://<your-vercel-domain>/connect/callback`, and set `LINKEDIN_REDIRECT_URI` to the backend callback URL on your chosen host.

---

## 💡 Future Enhancements

- Instagram Story size generator (1080×1920)  
- Multiple image styles (Minimal, Realistic, Cartoon)  
- Multi-language captions  
- AI scheduling + auto-posting  
- User accounts with cloud storage  

---

## 🤝 Contributing

PRs are welcome!  
Feel free to open issues for feature requests or bug reports.

---

## 📄 License

MIT License © 2025

---

## 👨‍💻 Author

Built with ❤️ by **Muhammad Usman**  
Final-year Computer Science student at Sukkur IBA University  
Focused on scalable backend systems, authentication, and automation workflows.
```

