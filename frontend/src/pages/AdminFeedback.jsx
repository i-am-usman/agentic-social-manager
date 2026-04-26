import React, { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquareText, LogOut, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../config/api";

export default function AdminFeedback({ onLogout } = {}) {
  const navigate = useNavigate();
  const token = localStorage.getItem("adminToken");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [feature, setFeature] = useState("all");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const [error, setError] = useState("");

  const formatApiError = (detail) => {
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          const path = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : "";
          const message = item?.msg || "Invalid input";
          return path ? `${path}: ${message}` : message;
        })
        .join(" ");
    }

    if (typeof detail === "string") {
      return detail;
    }

    if (detail && typeof detail === "object") {
      return detail.msg || detail.message || "Invalid input";
    }

    return "Failed to load feedback.";
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminRole");
    if (typeof onLogout === "function") {
      onLogout();
    }
    navigate("/admin/login");
  };

  const loadData = useCallback(async () => {
    if (!token) {
      navigate("/admin/login");
      return;
    }

    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));

    const parsedMin = minRating === "" ? null : Number(minRating);
    const parsedMax = maxRating === "" ? null : Number(maxRating);

    if (parsedMin !== null && (!Number.isFinite(parsedMin) || parsedMin < 1 || parsedMin > 5)) {
      setError("Min rating must be between 1 and 5.");
      setLoading(false);
      return;
    }

    if (parsedMax !== null && (!Number.isFinite(parsedMax) || parsedMax < 1 || parsedMax > 5)) {
      setError("Max rating must be between 1 and 5.");
      setLoading(false);
      return;
    }

    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      setError("Min rating cannot be greater than max rating.");
      setLoading(false);
      return;
    }

    if (feature !== "all") params.set("feature", feature);
    if (minRating) params.set("min_rating", minRating);
    if (maxRating) params.set("max_rating", maxRating);

    try {
      const res = await fetch(apiUrl(`/admin/feedback?${params.toString()}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok || data.status !== "success") {
        setError(formatApiError(data?.detail));
        setItems([]);
        setSummary(null);
      } else {
        setItems(data.data?.items || []);
        setSummary(data.data?.summary || null);
      }
    } catch (err) {
      setError(`Unable to load feedback: ${err.message}`);
      setItems([]);
      setSummary(null);
    }

    setLoading(false);
  }, [feature, limit, maxRating, minRating, navigate, page, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Admin Feedback Console</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">User feedback only</h1>
            <p className="mt-2 text-sm text-slate-400">This panel is for reviewing feedback submissions and nothing else.</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="mb-3 flex items-center gap-2">
            <Filter size={18} className="text-cyan-300" />
            <h2 className="font-semibold">Filters</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <select value={feature} onChange={(e) => { setFeature(e.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-slate-100">
              <option value="all">All features</option>
              <option value="dashboard">Dashboard</option>
              <option value="analytics">Analytics</option>
              <option value="automation">Automation</option>
              <option value="comment-analysis">Comment Analysis</option>
              <option value="generate">AI Generate</option>
              <option value="custom-post">Custom Post</option>
              <option value="saved-content">Saved Content</option>
              <option value="accounts">Accounts</option>
              <option value="profile">Profile</option>
              <option value="other">Other</option>
            </select>
            <input value={minRating} onChange={(e) => { setMinRating(e.target.value); setPage(1); }} type="number" min="1" max="5" placeholder="Min rating" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-slate-100" />
            <input value={maxRating} onChange={(e) => { setMaxRating(e.target.value); setPage(1); }} type="number" min="1" max="5" placeholder="Max rating" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-slate-100" />
            <button type="button" onClick={() => { setFeature("all"); setMinRating(""); setMaxRating(""); setPage(1); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-200">Reset</button>
          </div>
        </div>

        {summary && (
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Total</p>
              <p className="mt-2 text-2xl font-black">{summary.total_feedback}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Average Rating</p>
              <p className="mt-2 text-2xl font-black">{summary.overall_average_rating}/5</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Top Feature</p>
              <p className="mt-2 text-2xl font-black">{summary.by_feature?.[0]?.feature_label || "-"}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquareText size={18} className="text-cyan-300" />
            <h2 className="text-lg font-semibold">Feedback submissions</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="animate-spin text-cyan-300" size={26} />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">{error}</div>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-400">No feedback found for these filters.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{item.feature_label}</p>
                      <p className="text-xs text-slate-400">By user: {item.created_by_user_id}</p>
                    </div>
                    <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleString()}</p>
                  </div>
                  <div className="mb-2 text-amber-400">{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</div>
                  <p className="text-sm text-slate-200">{item.feedback_text}</p>
                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span key={`${item.id}_${tag}`} className="rounded-full border border-white/10 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((prev) => Math.max(1, prev - 1))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:opacity-50">Previous</button>
            <span className="text-sm text-slate-400">Page {page}</span>
            <button type="button" disabled={loading || items.length < limit} onClick={() => setPage((prev) => prev + 1)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
