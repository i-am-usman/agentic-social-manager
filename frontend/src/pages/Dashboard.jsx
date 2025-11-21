import React from "react";
import StatsCard from "../components/StatsCard";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";



export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Welcome Back! 👋</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatsCard label="Total Posts" value={0} />
        <StatsCard label="Scheduled" value={0} />
        <StatsCard label="Total Reach" value="0" />
      </div>

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
