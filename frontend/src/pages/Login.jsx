import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";

export default function Login({ setIsAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        // ✅ Store JWT
        localStorage.setItem("token", data.access_token);
        setIsAuthenticated(true);

        // ✅ Immediately fetch stats after login
        try {
          const statsRes = await fetch("http://127.0.0.1:8000/posts/stats", {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          const statsData = await statsRes.json();

          if (statsData.stats) {
            localStorage.setItem("userStats", JSON.stringify(statsData.stats));
          }
        } catch (statsErr) {
          console.error("Error fetching stats:", statsErr);
        }

        alert("Login successful!");
        navigate("/dashboard"); // ✅ redirect
      } else {
        alert(data.detail || "Login failed");
      }
    } catch (err) {
      alert("Error logging in: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        
        {/* Logo + Title */}
        <div className="text-center mb-8">
          <div className="bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold mt-4">Agentic Social Manager</h1>
          <p className="text-gray-600 mt-1">Login to continue</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full p-3 border rounded-lg focus:ring focus:ring-indigo-300"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border rounded-lg focus:ring focus:ring-indigo-300"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            className="bg-indigo-600 w-full py-3 rounded-lg text-white font-semibold flex justify-center items-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Login"}
          </button>
        </form>

        {/* Register Link */}
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