import React, { useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(7);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchDashboard = () => {
      fetch(`http://127.0.0.1:8000/analytics/dashboard?range_days=${rangeDays}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setDashboard(data);
            setError("");
          } else {
            setError(data.detail || "Unable to load dashboard data.");
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error fetching dashboard:", err);
          setError("Unable to reach backend dashboard endpoint.");
          setLoading(false);
        });
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [rangeDays]);

  const totals = dashboard?.summary?.totals || {};
  const health = dashboard?.summary?.automation_health || {};
  const sentiment = dashboard?.summary?.sentiment || {};
  const platformSplit = dashboard?.summary?.platform_split || {};
  const channelSplit = dashboard?.summary?.channel_split || {};
  const topPosts = dashboard?.top_posts || [];
  const recentActions = dashboard?.recent_ai_actions || [];

  const totalSentiment =
    (sentiment.positive || 0) + (sentiment.neutral || 0) + (sentiment.negative || 0);

  const toPercent = (value, total) => {
    if (!total) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };

  const statusBadge = (status) => {
    if (status === "sent") return "bg-emerald-100 text-emerald-700";
    if (status === "failed") return "bg-red-100 text-red-700";
    if (status === "pending") return "bg-amber-100 text-amber-700";
    return "bg-gray-100 text-gray-700";
  };

  const platformBadge = (platform) => {
    if (platform === "facebook") return "bg-blue-100 text-blue-700";
    if (platform === "instagram") return "bg-pink-100 text-pink-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2 text-gray-800">Engagement Command Center</h1>
      <p className="text-gray-500 mb-4">Facebook + Instagram live automation intelligence.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {[1, 7, 30].map((days) => (
          <button
            key={days}
            type="button"
            className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
              rangeDays === days
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300"
            }`}
            onClick={() => {
              setLoading(true);
              setRangeDays(days);
            }}
          >
            Last {days} day{days > 1 ? "s" : ""}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!!dashboard?.meta?.partial_data && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Partial data received from one or more platform APIs. Some cards may be incomplete.
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="ml-3 text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatsCard label="AI Replies Sent" value={totals.ai_auto_replies_sent || 0} />
            <StatsCard label="Incoming Comments" value={totals.incoming_comments || 0} />
            <StatsCard label="Incoming DMs" value={totals.incoming_dms || 0} />
            <StatsCard label="Hours Saved" value={totals.hours_saved_estimate || 0} />
            <StatsCard
              label="Avg AI Response (s)"
              value={totals.average_ai_response_seconds ?? "-"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white shadow-md border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Automation Health</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Sent</span><span className="font-semibold">{health.sent || 0}</span></div>
                <div className="flex justify-between"><span>Pending</span><span className="font-semibold">{health.pending || 0}</span></div>
                <div className="flex justify-between"><span>Failed</span><span className="font-semibold">{health.failed || 0}</span></div>
                <div className="flex justify-between"><span>Skipped</span><span className="font-semibold">{health.skipped || 0}</span></div>
              </div>
            </div>

            <div className="bg-white shadow-md border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Platform Split</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Facebook</span>
                  <span className="font-semibold">{platformSplit.facebook || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Instagram</span>
                  <span className="font-semibold">{platformSplit.instagram || 0}</span>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Channel Split</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Comments</span><span className="font-semibold">{channelSplit.comments || 0}</span></div>
                <div className="flex justify-between"><span>DMs</span><span className="font-semibold">{channelSplit.dms || 0}</span></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white shadow-md border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Audience Mood (Heuristic)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Positive</span>
                  <span className="font-semibold">{toPercent(sentiment.positive || 0, totalSentiment)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Neutral</span>
                  <span className="font-semibold">{toPercent(sentiment.neutral || 0, totalSentiment)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Negative</span>
                  <span className="font-semibold">{toPercent(sentiment.negative || 0, totalSentiment)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white shadow-md border rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Top Performing Posts</h3>
              <div className="space-y-3">
                {topPosts.length === 0 && <p className="text-sm text-gray-500">No post data yet.</p>}
                {topPosts.map((post) => (
                  <div key={post.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${platformBadge(post.platform)}`}>
                        {post.platform}
                      </span>
                      <span className="text-xs text-gray-500">Score {post.score}</span>
                    </div>
                    <p className="text-sm text-gray-700 truncate">{post.message || "(no caption)"}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {post.likes} likes • {post.comments} comments • {post.shares} shares
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white shadow-md border rounded-xl p-5 mb-8">
            <h3 className="font-semibold text-gray-800 mb-4">Live AI Action Trail</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-3">Platform</th>
                    <th className="py-2 pr-3">Channel</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">User Message</th>
                    <th className="py-2 pr-3">AI Reply</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-4 text-center text-gray-500">
                        No recent AI actions.
                      </td>
                    </tr>
                  )}
                  {recentActions.map((item, index) => (
                    <tr key={`${item.created_at || "na"}-${index}`} className="border-b last:border-b-0">
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${platformBadge(item.platform)}`}>
                          {item.platform}
                        </span>
                      </td>
                      <td className="py-2 pr-3 uppercase text-xs text-gray-600">{item.channel_type}</td>
                      <td className="py-2 pr-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${statusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 max-w-xs truncate text-gray-700">{item.user_said || "-"}</td>
                      <td className="py-2 pr-3 max-w-xs truncate text-gray-700">{item.ai_replied || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
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