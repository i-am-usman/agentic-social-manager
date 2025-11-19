// Updated React component with Option A layout
// (Dashboard = Stats + Create Content only, ContentGenerationPage = AI Tools + Output)

// --- FULL FILE REPLACED WITH CLEAN, FIXED VERSION ---

import React, { useState } from "react";
import { Sparkles, PlusCircle, Copy, Check, Loader2 } from "lucide-react";

function LoginPage({ loginData, setLoginData, handleLogin, isGenerating, setCurrentPage }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Agentic Social Manager</h1>
          <p className="text-gray-600 mt-2">AI-Powered Social Media Management</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={loginData.email}
              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isGenerating}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating && <Loader2 className="animate-spin" size={20} />}
            {isGenerating ? "Logging in..." : "Login"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={() => setCurrentPage('register')}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ registerData, setRegisterData, handleRegister, isGenerating, setCurrentPage }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-600 mt-2">Join Agentic Social Manager</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={registerData.fullName} onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="John Doe" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={registerData.email} onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="your@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input type="password" value={registerData.password} onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="••••••••" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" value={registerData.confirmPassword} onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="••••••••" />
          </div>

          <button onClick={handleRegister} disabled={isGenerating} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {isGenerating && <Loader2 className="animate-spin" size={20} />}
            {isGenerating ? "Creating Account..." : "Register"}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button onClick={() => setCurrentPage('login')} className="text-indigo-600 font-semibold hover:underline">
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ✅ NEW: Clean Content Generation Page (Option A)
function ContentGenerationPage({ topic, setTopic, isGenerating, generatedImage, generatedCaption, generatedHashtags, generateAll, generateCaption, generateHashtagsOnly, generateImageOnly, copyAllContent, copied }) {
  return (
    <div className="max-w-5xl mx-auto py-10">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Create AI Content</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., Modern Tech Trends"
        />

        <div className="flex flex-wrap gap-3 mt-4">
          <button onClick={generateAll} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700">
            Generate All Content
          </button>
          <button onClick={generateCaption} className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700">
            Caption Only
          </button>
          <button onClick={generateHashtagsOnly} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700">
            Hashtags Only
          </button>
          <button onClick={generateImageOnly} className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700">
            Image Only
          </button>
        </div>
      </div>

      {/* OUTPUT SECTION */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Generated Content</h2>

          {(generatedCaption || generatedHashtags.length > 0) && (
            <button onClick={copyAllContent} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy All"}
            </button>
          )}
        </div>

        {isGenerating && (
          <div className="text-center py-12">
            <Loader2 className="animate-spin mx-auto mb-4 text-indigo-600" size={48} />
            <p className="text-gray-600 font-medium">Generating content...</p>
          </div>
        )}

        {/* Image */}
        {generatedImage && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Generated Image</p>
            <img src={generatedImage} alt="Generated content" className="w-full rounded-lg shadow-md" />
          </div>
        )}

        {/* Caption */}
        {generatedCaption && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Caption</p>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-gray-800 whitespace-pre-wrap">{generatedCaption}</p>
            </div>
          </div>
        )}

        {/* Hashtags */}
        {generatedHashtags.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Hashtags</p>
            <div className="flex flex-wrap gap-2">
              {generatedHashtags.map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- CLEAN DASHBOARD PAGE (NO GENERATED CONTENT HERE) ---
function DashboardPage({ user, setCurrentPage }) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome back, {user?.fullName}! 👋</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Posts</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Scheduled</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Reach</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-white mb-10">
        <h2 className="text-2xl font-bold mb-3">Ready to create amazing content?</h2>
        <p className="text-indigo-100 mb-6">Use our AI-powered tools to generate captions, hashtags, and images in seconds!</p>
        <button onClick={() => setCurrentPage('generate')} className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2">
          <PlusCircle size={20} /> Create New Content
        </button>
      </div>
    </div>
  );
}

export default function AgenticSocialManager() {
  // STATE
  const [currentPage, setCurrentPage] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });

  const [topic, setTopic] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState([]);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const user = { fullName: "User", email: "user@example.com" };

  // HANDLERS
  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentPage('dashboard');
  };

  const handleRegister = () => {
    setCurrentPage('login');
  };

  const copyAllContent = () => {
    navigator.clipboard.writeText(`${generatedCaption}
${generatedHashtags.join(' ')}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // GENERATORS
  const generateCaption = async () => {
    setIsGenerating(true);
    const res = await fetch("http://localhost:8000/content/caption", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic })
    });
    const data = await res.json();
    setGeneratedCaption(data.caption || "Generated caption");
    setIsGenerating(false);
  };

  const generateHashtagsOnly = async () => {
    setIsGenerating(true);
    const res = await fetch("http://localhost:8000/content/hashtags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, count: 5 })
    });
    const data = await res.json();
    setGeneratedHashtags(data.hashtags || []);
    setIsGenerating(false);
  };

  const generateImageOnly = async () => {
    setIsGenerating(true);
    const res = await fetch("http://localhost:8000/content/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic })
    });
    const data = await res.json();
    setGeneratedImage(data.image || null);
    setIsGenerating(false);
  };

  const generateAll = async () => {
    await generateCaption();
    await generateHashtagsOnly();
    await generateImageOnly();
  };

  // PAGE RENDERING
  if (!isAuthenticated) {
    return currentPage === 'login' ? (
      <LoginPage loginData={loginData} setLoginData={setLoginData} handleLogin={handleLogin} isGenerating={isGenerating} setCurrentPage={setCurrentPage} />
    ) : (
      <RegisterPage registerData={registerData} setRegisterData={setRegisterData} handleRegister={handleRegister} isGenerating={isGenerating} setCurrentPage={setCurrentPage} />
    );
  }

  // AUTHENTICATED PAGES
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white" size={24} />
            </div>
            <span className="text-xl font-bold text-gray-800">Agentic Social Manager</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setCurrentPage('dashboard')} className={`px-4 py-2 rounded-lg ${currentPage === 'dashboard' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}>Dashboard</button>
            <button onClick={() => setCurrentPage('generate')} className={`px-4 py-2 rounded-lg ${currentPage === 'generate' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}>Create Content</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {currentPage === 'dashboard' ? (
          <DashboardPage user={user} setCurrentPage={setCurrentPage} />
        ) : (
          <ContentGenerationPage
            topic={topic}
            setTopic={setTopic}
            isGenerating={isGenerating}
            generatedImage={generatedImage}
            generatedCaption={generatedCaption}
            generatedHashtags={generatedHashtags}
            generateAll={generateAll}
            generateCaption={generateCaption}
            generateHashtagsOnly={generateHashtagsOnly}
            generateImageOnly={generateImageOnly}
            copyAllContent={copyAllContent}
            copied={copied}
          />
        )}
      </div>
    </div>
  );
}