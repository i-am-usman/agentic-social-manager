Below is a **clean, professional `README.md`** for your GitHub repository, fully matching your project:

---

 🚀 Agentic Social Manager

AI-Powered Social Media Content Generator (Gemini + Bytez)

Agentic Social Manager is a full-stack AI application that automatically generates **Instagram/Facebook-ready social media content**, including:

✅ AI-generated image (Stable Diffusion XL via Bytez)
✅ AI-generated caption (Gemini 2.5 Flash)
✅ AI-generated hashtags (Gemini 2.5 Flash)
✅ Copy-to-clipboard content pack
✅ Clean and responsive React UI
✅ FastAPI backend

Perfect for creators, marketers, and businesses that want to automate high-quality content creation.

---

 🧠 Features

 🎨 **AI Image Generation**

Uses **Bytez + Stable Diffusion XL** to generate 1080×1080 square images ideal for Instagram & Facebook posts.

 ✏️ **AI Caption Generation**

Powered by **Gemini 2.5 Flash** to create short, engaging, emoji-friendly captions.

 🔖 **AI Hashtag Generation**

Generates relevant, trending, niche-based hashtags.

 🧩 **Full Content Package**

One click → get image, caption, hashtags + "Copy All" button.

 🔐 **User Authentication (Local)**

Simple login/register UI.

 🎯 **Clean Frontend UI**

React + Tailwind + Lucide Icons.

---

 🏗️ Project Structure

```
/frontend
  ├── src
  │   ├── AgenticSocialManager.jsx
  │   ├── components/
  │   ├── pages/
  │   ├── api/
  │   └── styles/
  └── package.json

/backend
  ├── main.py
  ├── ai_service.py
  ├── requirements.txt
  └── .env
```

---

 ⚙️ Tech Stack

 **Frontend**

* React (Create React App)
* TailwindCSS
* Lucide Icons (UI Icons)

 **Backend**

* FastAPI
* Python 3.10+
* Google Gemini API (`google-genai`)
* Bytez API (Stable Diffusion XL)

---

 🔑 Environment Variables

Create a `.env` file inside the **backend** folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
BYTEZ_API_KEY=your_bytez_api_key_here
BYTEZ_MODEL=stabilityai/stable-diffusion-xl-base-1.0
```

> Never commit API keys to GitHub.

---

 📦 Installation & Setup

 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-username/agentic-social-manager.git
cd agentic-social-manager
```

---

 🖥️ Backend Setup (FastAPI)

```bash
cd backend
pip install -r requirements.txt
```

Run the backend:

```bash
uvicorn main:app --reload
```

Backend should start at:

```
http://localhost:8000
```

---

 💻 Frontend Setup (React)

```bash
cd frontend
npm install
npm start
```

Frontend runs at:

```
http://localhost:3000
```

---

 🔥 API Endpoints

 **POST /generate-caption**

Returns AI caption.

 **POST /generate-hashtags**

Returns AI hashtags.

 **POST /generate-image**

Returns image URL or Base64.

 **POST /generate-all**

Returns `{ caption, hashtags, image }`

---

 📸 Image Format (Instagram/Facebook Ready)

The backend instructs Bytez to generate:

```
1080 × 1080 px (1:1)
```

Square format works best for:

* Instagram Feed Posts
* Facebook Feed Posts
* LinkedIn Posts
* Twitter/X Media Posts

---

 🧪 Testing

Run backend tests:

```bash
pytest
```

Run frontend tests:

```bash
npm test
```

---

 🚀 Deployment

You can deploy using:

 Backend

* Render
* Railway
* Docker
* AWS Lambda + API Gateway

 Frontend

* Netlify
* Vercel
* GitHub Pages (static)

---

 💡 Future Enhancements

* Instagram Story size generator (1080×1920)
* Multiple image styles (Minimal, Realistic, Cartoon)
* Multi-language captions
* AI scheduling + auto-posting
* User accounts with cloud storage

---

 🤝 Contributing

PRs are welcome!
Feel free to open issues for feature requests or bug reports.

---

 📄 License

MIT License © 2025


