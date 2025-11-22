import React, { useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_posts: 0,
    drafts: 0,
    scheduled: 0,
    published: 0,
  });
  const [loading, setLoading] = useState(true); // ✅ loading state

  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchStats = () => {
      fetch("http://127.0.0.1:8000/posts/stats", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.stats) {
            setStats(data.stats);
            setLoading(false); // ✅ stop loading once data arrives
          }
        })
        .catch((err) => console.error("Error fetching stats:", err));
    };

    // ✅ Fetch immediately
    fetchStats();

    // ✅ Auto-refresh every 10 seconds
    const interval = setInterval(fetchStats, 10000);

    // ✅ Cleanup when component unmounts
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Welcome Back! 👋</h1>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          {/* ✅ Spinner animation */}
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-3 text-gray-500">Loading stats...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatsCard label="Total Posts" value={stats.total_posts} />
          <StatsCard label="Drafts" value={stats.drafts} />
          <StatsCard label="Scheduled" value={stats.scheduled} />
          <StatsCard label="Published" value={stats.published} />
        </div>
      )}

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl p-8">
        <h2 className="text-2xl font-bold mb-4">Ready to Create Content?</h2>
        <button
          className="bg-white text-indigo-600 px-6 py-3 rounded-lg font-semibold flex items-center gap-2"
          onClick={() => navigate("/generate")}
        >
          <PlusCircle size={20} /> Create New Content
        </button>
      </div>
    </div>
  );
}