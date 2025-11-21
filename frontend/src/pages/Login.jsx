import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login({ setIsAuthenticated }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setIsAuthenticated(true); // Replace with backend API login later
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold mt-4">Agentic Social Manager</h1>
          <p className="text-gray-600 mt-1">Login to continue</p>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg focus:ring focus:ring-indigo-300"
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg focus:ring focus:ring-indigo-300"
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />

          <button
            onClick={handleLogin}
            className="bg-indigo-600 w-full py-3 rounded-lg text-white font-semibold flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </div>

        <p className="text-center text-gray-600 mt-4">
          Don’t have an account?
          <Link to="/register" className="text-indigo-600 font-semibold ml-1">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
