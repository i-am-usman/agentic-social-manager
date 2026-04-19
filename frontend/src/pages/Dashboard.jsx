import React, { useCallback, useEffect, useState } from "react";
import StatsCard from "../components/StatsCard";
import EngagementTrendChart from "../components/EngagementTrendChart";
import SentimentDonutChart from "../components/SentimentDonutChart";
import SplitBarChart from "../components/SplitBarChart";
import BestTimeToPostWidget from "../components/BestTimeToPostWidget";
import AnomalyAlertPanel from "../components/AnomalyAlertPanel";
import BorderGlow from "../components/BorderGlow";
import useSessionStorageState from "../hooks/useSessionStorageState";

import {
  Bot,
  CheckCircle2,
  Clock3,
  MessageCircleMore,
  PlusCircle,
  Sparkles,
  Users,
  X,
  ShieldCheck,
  Radar,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useSessionStorageState("dashboard.data", null);
  const [lastUpdated, setLastUpdated] = useSessionStorageState("dashboard.lastUpdated", "");
  const [hasLoadedDashboard, setHasLoadedDashboard] = useSessionStorageState("dashboard.hasLoaded", false);
  const [loading, setLoading] = useState(!hasLoadedDashboard);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useSessionStorageState("dashboard.rangeDays", 7);
  const [error, setError] = useState("");
  const [authFlashMessage, setAuthFlashMessage] = useState("");

  const loadDashboard = useCallback((options = {}) => {
    const background = Boolean(options.background);
    const token = localStorage.getItem("token");

    if (!background) {
      setLoading(true);
    }

    return fetch(`http://127.0.0.1:8000/analytics/dashboard?range_days=${rangeDays}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setDashboard(data);
          setError("");
          setLastUpdated(data?.meta?.generated_at || new Date().toISOString());
          setHasLoadedDashboard(true);
        } else {
          setError(data.detail || "Unable to load dashboard data.");
        }
      })
      .catch((err) => {
        console.error("Error fetching dashboard:", err);
        setError("Unable to reach backend dashboard endpoint.");
      })
      .finally(() => {
        if (!background) {
          setLoading(false);
        }
      });
  }, [rangeDays, setDashboard, setHasLoadedDashboard, setLastUpdated]);

  useEffect(() => {
    if (hasLoadedDashboard) {
      setLoading(false);
      loadDashboard({ background: true });
    } else {
      loadDashboard();
    }

    const interval = setInterval(() => {
      setRefreshing(true);
      loadDashboard({ background: true }).finally(() => setRefreshing(false));
    }, 10000);
    return () => clearInterval(interval);
  }, [hasLoadedDashboard, loadDashboard]);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-6 py-6 text-slate-800 shadow-sm lg:px-8 lg:py-8 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-[0_30px_80px_rgba(2,6,23,0.42)]">
          <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(45,212,191,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.14),_transparent_26%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
          <div className="absolute inset-0 hidden opacity-20 dark:block [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-3 py-1 text-xs font-semibold tracking-wide text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <ShieldCheck size={14} className="text-indigo-500 dark:text-indigo-300" />
                ASMA COMMAND CENTER
              </div>

              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-800 sm:text-4xl dark:text-white">Engagement Command Center</h1>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-400/30 dark:text-emerald-300">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </span>
                  Live
                </span>
              </div>

              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                Facebook + Instagram live automation intelligence with predictive signals, AI response tracking, and spike detection.
              </p>

              <div className="flex flex-wrap gap-3 pt-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/90 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <Bot size={14} className="text-indigo-500 dark:text-indigo-300" /> AI replies active
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-100 bg-white/90 px-3 py-1 text-xs text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <Radar size={14} className="text-cyan-500 dark:text-cyan-300" /> Spike detection on
                </div>
              </div>
            </div>

            <div className="relative flex items-center gap-4 rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-lg shadow-indigo-500/30">
                <Sparkles className="text-white" size={28} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-200">Freshness</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">Last updated: {lastUpdatedLabel}</p>
              </div>
            </div>
          </div>

          {authFlashMessage && (
            <div className="relative mt-5 max-w-xl rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 shadow-lg backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={18} />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-900 dark:text-white">Sign in successful</p>
                  <p className="mt-0.5 text-sm text-emerald-700 dark:text-emerald-100">Welcome back to ASMA.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAuthFlashMessage("")}
                  className="rounded-md p-1 text-emerald-700 transition-colors hover:bg-emerald-100 dark:text-emerald-200 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Dismiss login success message"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Live sync</p>
              <p className="text-xs text-slate-500 dark:text-slate-300">Last updated: {lastUpdatedLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${refreshing ? "bg-amber-500/15 text-amber-700 ring-1 ring-amber-400/25 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-400/25 dark:text-emerald-300"}`}>
                {refreshing ? "Refreshing" : "Live"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setRefreshing(true);
                  loadDashboard().finally(() => setRefreshing(false));
                }}
                aria-label="Refresh dashboard"
                title="Refresh dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="absolute -right-8 top-4 hidden h-28 w-28 rounded-full bg-indigo-500/10 blur-3xl lg:block" />
          <div className="absolute bottom-0 right-1/4 hidden h-24 w-24 rounded-full bg-purple-500/10 blur-3xl lg:block" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[1, 7, 30].map((days) => (
            <button
              key={days}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                rangeDays === days
                  ? "border-indigo-200 bg-indigo-100 text-indigo-700 shadow-sm dark:border-indigo-400/30 dark:bg-indigo-500/15 dark:text-white dark:shadow-[0_10px_30px_rgba(99,102,241,0.18)]"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
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
          <div className="mb-6 rounded-xl border border-rose-300/30 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        )}

        {!!dashboard?.meta?.partial_data && (
          <div className="mb-6 rounded-xl border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
            Partial data received from one or more platform APIs. Some cards may be incomplete.
          </div>
        )}

        {loading ? (
            <div className="flex h-32 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-400" />
            <p className="ml-3 text-slate-500 dark:text-slate-300">Loading dashboard...</p>
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
              <BorderGlow
                className="rounded-2xl bg-white p-5 shadow-sm backdrop-blur dark:bg-slate-800 dark:shadow-none"
                glowColor="250 80 60"
                colors={['#4F46E5', '#9333EA', '#6366F1']}
                borderRadius={16}
              >
                <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-800 dark:text-white">Automation Health</h3>
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
                    <span className="font-bold text-slate-700 dark:text-slate-300">{health.skipped || 0}</span>
                  </div>
                </div>
              </BorderGlow>

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

            <BorderGlow
              className="mb-8 rounded-2xl bg-white p-5 shadow-sm backdrop-blur dark:bg-slate-800 dark:shadow-none"
              glowColor="250 80 60"
              colors={['#4F46E5', '#9333EA', '#6366F1']}
              borderRadius={16}
            >
              <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-800 dark:text-white">Top Performing Posts</h3>
              <div className="space-y-3">
                {topPosts.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No post data yet.</p>}
                {topPosts.map((post) => (
                  <div key={post.id} className="cursor-pointer rounded-xl border border-slate-200 p-3 transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/5">
                    <div className="mb-1 flex items-center justify-between">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${platformBadge(post.platform)}`}>
                        {post.platform}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Score {post.score}</span>
                    </div>
                    <p className="truncate text-sm text-slate-700 dark:text-slate-200">{post.message || "(no caption)"}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {post.likes} likes • {post.comments} comments • {post.shares} shares
                    </p>
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                      >
                        Open post context
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </BorderGlow>

            <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-800 dark:shadow-none">
              <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-800 dark:text-white">Live AI Action Trail</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500 dark:border-white/10 dark:text-slate-400">
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
                        <td colSpan="5" className="py-4 text-center text-slate-500 dark:text-slate-400">
                          No recent AI actions.
                        </td>
                      </tr>
                    )}
                    {recentActions.map((item, index) => (
                      <tr key={`${item.created_at || "na"}-${index}`} className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50 last:border-b-0 dark:border-white/5 dark:hover:bg-white/5">
                        <td className="py-2 pr-3">
                          <span className={`rounded px-2 py-1 text-xs font-semibold ${platformBadge(item.platform)}`}>
                            {item.platform}
                          </span>
                        </td>
                        <td className="py-2 pr-3 uppercase text-xs text-slate-500 dark:text-slate-400">{item.channel_type}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded px-2 py-1 text-xs font-semibold ${statusBadge(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="max-w-xs py-2 pr-3 truncate text-slate-700 dark:text-slate-200">{item.user_said || "-"}</td>
                        <td className="max-w-xs py-2 pr-3 truncate text-slate-700 dark:text-slate-200">
                          <span title={item.ai_replied || ""}>{item.ai_replied || "-"}</span>
                          {item.ai_fallback_reason && (
                            <div className="mt-1 text-[11px] text-amber-700 dark:text-amber-200">
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

        <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-8 text-slate-800 shadow-sm dark:border-white/10 dark:bg-slate-950 dark:text-white dark:shadow-[0_30px_80px_rgba(2,6,23,0.42)]">
          <div className="absolute inset-0 hidden dark:block dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.2),_transparent_30%),radial-gradient(circle_at_85%_20%,_rgba(45,212,191,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.14),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
          <div className="absolute inset-0 hidden opacity-18 dark:block [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-semibold tracking-wide text-slate-700 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <Sparkles size={14} className="text-indigo-500 dark:text-indigo-300" />
                AI CONTENT STUDIO
              </p>
              <h2 className="text-2xl font-black tracking-tight text-slate-800 sm:text-3xl dark:text-white">Ready to create something sharp and on-brand?</h2>
              <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Move from insights to action by generating content, captions, and campaigns directly from your command center.
              </p>
            </div>

            <button
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:bg-indigo-500"
              onClick={() => navigate("/generate")}
            >
              <PlusCircle size={20} /> Create New Content
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}