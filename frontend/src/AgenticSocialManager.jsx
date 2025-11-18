import React, { useState } from 'react';
import { Camera, Hash, Sparkles, ImageIcon, Copy, Check, Loader2, LogOut, Home, PlusCircle } from 'lucide-react';

const AgenticSocialManager = () => {
  const [currentPage, setCurrentPage] = useState('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    fullName: '', 
    email: '', 
    password: '',
    confirmPassword: '' 
  });
  
  const [topic, setTopic] = useState('');
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [generatedHashtags, setGeneratedHashtags] = useState([]);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('english');

  const handleLogin = (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    setTimeout(() => {
      if (loginData.email && loginData.password) {
        setUser({
          id: '1',
          fullName: 'Demo User',
          email: loginData.email
        });
        setIsAuthenticated(true);
        setCurrentPage('dashboard');
      }
      setIsGenerating(false);
    }, 1000);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setIsGenerating(true);
    
    setTimeout(() => {
      if (registerData.password === registerData.confirmPassword) {
        setUser({
          id: '1',
          fullName: registerData.fullName,
          email: registerData.email
        });
        setIsAuthenticated(true);
        setCurrentPage('dashboard');
      }
      setIsGenerating(false);
    }, 1000);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setCurrentPage('login');
    setLoginData({ email: '', password: '' });
  };

  const generateContent = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setGeneratedCaption('');
    setGeneratedHashtags([]);
    setGeneratedImage(null);

    try {
      const res = await fetch('http://localhost:8000/content/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language: selectedLanguage })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const payload = await res.json();
      const data = payload?.data ?? payload;
      setGeneratedCaption(data?.caption ?? `🌟 Discover the amazing world of ${topic}!`);
      setGeneratedHashtags(Array.isArray(data?.hashtags) ? data.hashtags : (typeof data?.hashtags === 'string' ? data.hashtags.split(',') : []));
      setGeneratedImage(data?.image ?? `https://source.unsplash.com/800x600/?${encodeURIComponent(topic)}`);
    } catch (err) {
      console.error('Content generation error:', err);
      setGeneratedCaption(selectedLanguage === 'urdu' ? `${topic} کی حیرت انگیز دنیا دریافت کریں!` : `🌟 Discover the amazing world of ${topic}!`);
      setGeneratedHashtags([`#${topic.replace(/\s+/g, '')}`, '#trending', '#viral']);
      setGeneratedImage(`https://source.unsplash.com/800x600/?${encodeURIComponent(topic)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Individual generation helpers ---
  const generateCaptionOnly = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setGeneratedCaption('');
    try {
      const res = await fetch('http://localhost:8000/content/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language: selectedLanguage })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const payload = await res.json();
      const caption = payload?.caption ?? payload?.data?.caption ?? `🌟 Discover the amazing world of ${topic}!`;
      setGeneratedCaption(caption);
    } catch (err) {
      console.error('Caption generation error:', err);
      setGeneratedCaption(
        selectedLanguage === 'urdu'
          ? `${topic} کی حیرت انگیز دنیا دریافت کریں!`
          : `🌟 Discover the amazing world of ${topic}!`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const generateHashtagsOnly = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setGeneratedHashtags([]);
    try {
      const res = await fetch('http://localhost:8000/content/hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count: 6 })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const payload = await res.json();
      const hashtags = payload?.hashtags ?? payload?.data?.hashtags ?? [];
      setGeneratedHashtags(Array.isArray(hashtags) ? hashtags : []);
    } catch (err) {
      console.error('Hashtag generation error:', err);
      setGeneratedHashtags([`#${topic.replace(/\s+/g, '')}`, '#trending', '#viral']);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateImageOnly = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const res = await fetch('http://localhost:8000/content/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const payload = await res.json();
      const image = payload?.image ?? payload?.data?.image ?? `https://source.unsplash.com/800x600/?${encodeURIComponent(topic)}`;
      setGeneratedImage(image);
    } catch (err) {
      console.error('Image generation error:', err);
      setGeneratedImage(`https://source.unsplash.com/800x600/?${encodeURIComponent(topic)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAllContent = () => {
    const fullContent = `${generatedCaption}\n\n${generatedHashtags.join(' ')}`;
    copyToClipboard(fullContent);
  };

  const LoginPage = () => (
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
              onChange={(e) => setLoginData({...loginData, email: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={isGenerating}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : null}
            {isGenerating ? 'Logging in...' : 'Login'}
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

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Demo: Use any email and password to login
          </p>
        </div>
      </div>
    </div>
  );

  const RegisterPage = () => (
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
            <input
              type="text"
              value={registerData.fullName}
              onChange={(e) => setRegisterData({...registerData, fullName: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={registerData.email}
              onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={registerData.password}
              onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={registerData.confirmPassword}
              onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={handleRegister}
            disabled={isGenerating}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : null}
            {isGenerating ? 'Creating Account...' : 'Register'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  const DashboardPage = () => (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <span className="text-xl font-bold text-gray-800">Agentic Social Manager</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'dashboard' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Home size={20} />
                <span className="font-medium">Dashboard</span>
              </button>
              
              <button
                onClick={() => setCurrentPage('generate')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentPage === 'generate' 
                    ? 'bg-indigo-50 text-indigo-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <PlusCircle size={20} />
                <span className="font-medium">Create Content</span>
              </button>
              
              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentPage === 'dashboard' ? (
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Welcome back, {user?.fullName}! 👋</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Posts</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
                  </div>
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <ImageIcon className="text-indigo-600" size={24} />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Scheduled</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Camera className="text-green-600" size={24} />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Total Reach</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">0</p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Hash className="text-purple-600" size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
              <h2 className="text-2xl font-bold mb-3">Ready to create amazing content?</h2>
              <p className="text-indigo-100 mb-6">Use our AI-powered tools to generate captions, hashtags, and images in seconds!</p>
              <button
                onClick={() => setCurrentPage('generate')}
                className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold hover:bg-indigo-50 transition-colors inline-flex items-center gap-2"
              >
                <PlusCircle size={20} />
                Create New Content
              </button>
            </div>
          </div>
        ) : (
          <ContentGenerationPage />
        )}
      </div>
    </div>
  );

  const ContentGenerationPage = () => (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setCurrentPage('dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Dashboard"
        >
          <Home size={20} />
          <span className="font-medium">Back</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-800">AI Content Generator</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Content Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic / Keyword
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., technology, travel, food, fitness"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="english">English</option>
                <option value="urdu">Urdu (اردو)</option>
              </select>
            </div>

            <button
              onClick={generateContent}
              disabled={!topic.trim() || isGenerating}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : 'Generate All Content'}
            </button>

            {/* Individual generation buttons */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={generateCaptionOnly}
                disabled={!topic.trim() || isGenerating}
                className="py-2 px-3 bg-blue-500 text-white rounded-lg disabled:opacity-50"
              >
                Caption
              </button>

              <button
                onClick={generateHashtagsOnly}
                disabled={!topic.trim() || isGenerating}
                className="py-2 px-3 bg-purple-500 text-white rounded-lg disabled:opacity-50"
              >
                Tags
              </button>

              <button
                onClick={generateImageOnly}
                disabled={!topic.trim() || isGenerating}
                className="py-2 px-3 bg-green-500 text-white rounded-lg disabled:opacity-50"
              >
                Image
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">What gets generated:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <span>AI-powered caption</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <span>Relevant hashtags</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                <span>AI-generated image</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Generated Content</h2>
            {(generatedCaption || generatedHashtags.length > 0) && (
              <button
                onClick={copyAllContent}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy All'}
              </button>
            )}
          </div>

          {!generatedCaption && !generatedImage && !isGenerating && (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500">Enter a topic and click generate to see AI-powered content</p>
            </div>
          )}

          {isGenerating && (
            <div className="text-center py-12">
              <Loader2 className="animate-spin mx-auto mb-4 text-indigo-600" size={48} />
              <p className="text-gray-600 font-medium">Creating amazing content...</p>
            </div>
          )}

          {generatedImage && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Generated Image</p>
              <img
                src={generatedImage}
                alt="Generated content"
                className="w-full rounded-lg shadow-md"
              />
            </div>
          )}

          {generatedCaption && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Caption</p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{generatedCaption}</p>
              </div>
            </div>
          )}

          {generatedHashtags.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Hashtags</p>
              <div className="flex flex-wrap gap-2">
                {generatedHashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return currentPage === 'login' ? <LoginPage /> : <RegisterPage />;
  }

  return <DashboardPage />;
};

export default AgenticSocialManager;