import React, { useCallback, useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import EngagementTrendChart from "../components/EngagementTrendChart";
import SentimentDonutChart from "../components/SentimentDonutChart";
import SplitBarChart from "../components/SplitBarChart";
import BestTimeToPostWidget from "../components/BestTimeToPostWidget";
import AnomalyAlertPanel from "../components/AnomalyAlertPanel";
import {
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  PlusCircle,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useState(7);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [authFlashMessage, setAuthFlashMessage] = useState("");

  const loadDashboard = useCallback(() => {
    const token = localStorage.getItem("token");

    return fetch(`http://127.0.0.1:8000/analytics/dashboard?range_days=${rangeDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setDashboard(data);
          setError("");
          setLastUpdated(data?.meta?.generated_at || new Date().toISOString());
        } else {
          setError(data.detail || "Unable to load dashboard data.");
        }
      })
      .catch((err) => {
        console.error("Error fetching dashboard:", err);
        setError("Unable to reach backend dashboard endpoint.");
      });
  }, [rangeDays]);

  useEffect(() => {
    setLoading(true);
    loadDashboard().finally(() => setLoading(false));

    const interval = setInterval(() => {
      setRefreshing(true);
      loadDashboard().finally(() => setRefreshing(false));
    }, 10000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  useEffect(() => {
    const flashMessage = sessionStorage.getItem("auth_flash_message");
    if (flashMessage) {
      setAuthFlashMessage(flashMessage);
      sessionStorage.removeItem("auth_flash_message");

      const timer = setTimeout(() => {
        setAuthFlashMessage("");
      }, 3500);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, []);

  const totals = dashboard?.summary?.totals || {};
  const health = dashboard?.summary?.automation_health || {};
  const sentiment = dashboard?.summary?.sentiment || {};
  const platformSplit = dashboard?.summary?.platform_split || {};
  const channelSplit = dashboard?.summary?.channel_split || {};
  const trends = dashboard?.trends || { labels: [], incoming_comments: [], incoming_dms: [], ai_replies_sent: [] };
  const bestTimeToPost = dashboard?.best_time_to_post || null;
  const anomalyAlert = dashboard?.anomaly_alert || null;
  const topPosts = dashboard?.top_posts || [];
  const recentActions = dashboard?.recent_ai_actions || [];

  const statusBadge = (status) => {
    if (status === "sent") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
    if (status === "failed") return "bg-rose-50 text-rose-800 ring-1 ring-rose-200";
    if (status === "pending") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  };

  const platformBadge = (platform) => {
    if (platform === "facebook") return "bg-blue-50 text-blue-700 ring-1 ring-blue-100";
    if (platform === "instagram") return "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-100";
    return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  };

  const lastUpdatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString()
    : "Waiting for fresh data";

  const healthBadge = (status) => {
    if (status === "sent") return "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200";
    if (status === "failed") return "bg-rose-50 text-rose-800 ring-1 ring-rose-200";
    if (status === "pending") return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    return "bg-slate-50 text-slate-700 ring-1 ring-slate-200";
  };

  const statusTone = (status) => {
    if (status === "sent") return "text-emerald-800";
    if (status === "failed") return "text-rose-800";
    if (status === "pending") return "text-amber-800";
    return "text-slate-700";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-2 flex items-center gap-3">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Engagement Command Center</h1>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>
        <p className="mb-4 text-slate-500">Facebook + Instagram live automation intelligence.</p>

        {authFlashMessage && (
          <div className="fixed right-4 top-20 z-50 w-[min(92vw,420px)] animate-[fadeIn_0.25s_ease-out] rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={18} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">Sign in successful</p>
                <p className="mt-0.5 text-sm text-slate-600">Welcome back to ASMA.</p>
              </div>
              <button
                type="button"
                onClick={() => setAuthFlashMessage("")}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                aria-label="Dismiss login success message"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Live sync</p>
            <p className="text-xs text-slate-500">Last updated: {lastUpdatedLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${refreshing ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"}`}>
              {refreshing ? "Refreshing" : "Live"}
            </span>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true);
                loadDashboard().finally(() => setRefreshing(false));
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Refresh now
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[1, 7, 30].map((days) => (
            <button
              key={days}
              type="button"
              className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
                rangeDays === days
                  ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!!dashboard?.meta?.partial_data && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Partial data received from one or more platform APIs. Some cards may be incomplete.
          </div>
        )}

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
            <p className="ml-3 text-slate-500">Loading dashboard...</p>
          </div>
        ) : (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              <StatsCard
                label="AI Replies Sent"
                value={totals.ai_auto_replies_sent || 0}
                icon={Bot}
                iconClassName="text-indigo-600 bg-indigo-50"
              />
              <StatsCard
                label="Incoming Comments"
                value={totals.incoming_comments || 0}
                icon={MessageCircleMore}
                iconClassName="text-blue-600 bg-blue-50"
              />
              <StatsCard
                label="Incoming DMs"
                value={totals.incoming_dms || 0}
                icon={Users}
                iconClassName="text-fuchsia-600 bg-fuchsia-50"
              />
              <StatsCard
                label="Hours Saved"
                value={totals.hours_saved_estimate || 0}
                icon={Clock3}
                iconClassName="text-emerald-600 bg-emerald-50"
              />
              <StatsCard
                label="Avg AI Response (s)"
                value={totals.average_ai_response_seconds ?? "-"}
                icon={Sparkles}
                iconClassName="text-amber-600 bg-amber-50"
              />
            </div>

            <EngagementTrendChart trends={trends} />

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-800">Automation Health</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${healthBadge("sent")}`}>Sent</span>
                    <span className={`font-bold ${statusTone("sent")}`}>{health.sent || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${healthBadge("pending")}`}>Pending</span>
                    <span className={`font-bold ${statusTone("pending")}`}>{health.pending || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${healthBadge("failed")}`}>Failed</span>
                    <span className={`font-bold ${statusTone("failed")}`}>{health.failed || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${healthBadge("skipped")}`}>Skipped</span>
                    <span className="font-bold text-slate-700">{health.skipped || 0}</span>
                  </div>
                </div>
              </div>

              <SplitBarChart
                title="Platform Split"
                gradientStart="#8b5cf6"
                gradientEnd="#4f46e5"
                rows={[
                  { label: "Facebook", value: platformSplit.facebook || 0 },
                  { label: "Instagram", value: platformSplit.instagram || 0 },
                ]}
              />

              <SplitBarChart
                title="Channel Split"
                gradientStart="#4f46e5"
                gradientEnd="#9333ea"
                rows={[
                  { label: "Comments", value: channelSplit.comments || 0 },
                  { label: "DMs", value: channelSplit.dms || 0 },
                ]}
              />
            </div>

            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <SentimentDonutChart sentiment={sentiment} />

              <BestTimeToPostWidget insight={bestTimeToPost} />

              <AnomalyAlertPanel insight={anomalyAlert} hottestPost={topPosts[0]} />
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-800">Top Performing Posts</h3>
              <div className="space-y-3">
                {topPosts.length === 0 && <p className="text-sm text-slate-500">No post data yet.</p>}
                {topPosts.map((post) => (
                  <div key={post.id} className="cursor-pointer rounded-xl border border-slate-100 p-3 transition-all hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-50">
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${platformBadge(post.platform)}`}>
                        {post.platform}
                      </span>
                      <span className="text-xs text-slate-500">Score {post.score}</span>
                    </div>
                    <p className="truncate text-sm text-slate-700">{post.message || "(no caption)"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {post.likes} likes • {post.comments} comments • {post.shares} shares
                    </p>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Open post context
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-800">Live AI Action Trail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="py-3 pr-3">Platform</th>
                      <th className="py-3 pr-3">Channel</th>
                      <th className="py-3 pr-3">Status</th>
                      <th className="py-3 pr-3">User Message</th>
                      <th className="py-3 pr-3">AI Reply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActions.length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-4 text-center text-slate-500">
                          No recent AI actions.
                        </td>
                      </tr>
                    )}
                    {recentActions.map((item, index) => (
                      <tr key={`${item.created_at || "na"}-${index}`} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-b-0">
                        <td className="py-2 pr-3">
                          <span className={`rounded px-2 py-1 text-xs font-semibold ${platformBadge(item.platform)}`}>
                            {item.platform}
                          </span>
                        </td>
                        <td className="py-2 pr-3 uppercase text-xs text-slate-600">{item.channel_type}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded px-2 py-1 text-xs font-semibold ${statusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="max-w-xs py-2 pr-3 truncate text-slate-700">{item.user_said || "-"}</td>
                        <td className="max-w-xs py-2 pr-3 truncate text-slate-700">
                          <span title={item.ai_replied || ""}>{item.ai_replied || "-"}</span>
                          {item.ai_fallback_reason && (
                            <div className="mt-1 text-[11px] text-amber-700">
                              Fallback: {item.ai_fallback_reason}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white shadow-lg shadow-indigo-500/20">
          <h2 className="mb-4 text-2xl font-bold tracking-tight">Ready to Create Content?</h2>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-indigo-700 shadow-sm transition-transform hover:-translate-y-0.5"
            onClick={() => navigate("/generate")}
          >
            <PlusCircle size={20} /> Create New Content
          </button>
        </div>
      </div>
    </div>
  );
}