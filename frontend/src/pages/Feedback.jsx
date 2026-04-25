import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareHeart, Send, SlidersHorizontal, Star } from "lucide-react";
import { apiUrl } from "../config/api";

const DEFAULT_FEATURES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "analytics", label: "Analytics" },
  { key: "automation", label: "Automation" },
  { key: "comment-analysis", label: "Comment Analysis" },
  { key: "generate", label: "AI Generate" },
  { key: "custom-post", label: "Custom Post" },
  { key: "saved-content", label: "Saved Content" },
  { key: "accounts", label: "Accounts" },
  { key: "profile", label: "Profile" },
  { key: "other", label: "Other" },
];

export default function Feedback() {
  const token = localStorage.getItem("token");

  const [featureOptions, setFeatureOptions] = useState(DEFAULT_FEATURES);
  const [featureKey, setFeatureKey] = useState("dashboard");
  const [featureCustom, setFeatureCustom] = useState("");
  const [rating, setRating] = useState(4);
  const [feedbackText, setFeedbackText] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filterFeature, setFilterFeature] = useState("all");
  const [filterMinRating, setFilterMinRating] = useState("");
  const [filterMaxRating, setFilterMaxRating] = useState("");

  const [loadingList, setLoadingList] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);

  const canSubmit = useMemo(() => {
    const hasFeature = featureKey !== "other" || featureCustom.trim();
    return hasFeature && feedbackText.trim().length >= 5;
  }, [featureKey, featureCustom, feedbackText]);

  const authHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }), [token]);

  const loadFeatures = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/feedback/features"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.status === "success" && Array.isArray(data.data) && data.data.length > 0) {
        setFeatureOptions(data.data);
      }
    } catch (err) {
      // Keep default options when API fails.
    }
  }, [token]);

  const loadFeedback = useCallback(async (nextPage = 1) => {
    setLoadingList(true);
    setFeedbackNotice(null);

    const params = new URLSearchParams();
    params.set("page", String(nextPage));
    params.set("limit", String(limit));
    if (filterFeature !== "all") {
      params.set("feature", filterFeature);
    }
    if (filterMinRating) {
      params.set("min_rating", filterMinRating);
    }
    if (filterMaxRating) {
      params.set("max_rating", filterMaxRating);
    }

    try {
      const [listRes, summaryRes] = await Promise.all([
        fetch(apiUrl(`/feedback?${params.toString()}`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(apiUrl(`/feedback/summary?${params.toString()}`), {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const listData = await listRes.json();
      const summaryData = await summaryRes.json();

      if (listRes.ok && listData.status === "success") {
        setItems(listData.data?.items || []);
      } else {
        setItems([]);
        setFeedbackNotice({ type: "error", text: listData.detail || "Failed to load feedback." });
      }

      if (summaryRes.ok && summaryData.status === "success") {
        setSummary(summaryData.data);
      } else {
        setSummary(null);
      }
    } catch (err) {
      setItems([]);
      setSummary(null);
      setFeedbackNotice({ type: "error", text: `Failed to load feedback: ${err.message}` });
    }

    setLoadingList(false);
  }, [filterFeature, filterMaxRating, filterMinRating, limit, token]);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  useEffect(() => {
    loadFeedback(page);
  }, [loadFeedback, page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) {
      setFeedbackNotice({ type: "error", text: "Please add a feature and feedback text (at least 5 characters)." });
      return;
    }

    setSubmitting(true);
    setFeedbackNotice(null);

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const res = await fetch(apiUrl("/feedback"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          feature_key: featureKey,
          feature_custom: featureKey === "other" ? featureCustom : "",
          rating,
          feedback_text: feedbackText,
          tags,
          source: "web",
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setFeedbackNotice({ type: "error", text: data.detail || "Unable to submit feedback." });
      } else {
        setFeedbackNotice({ type: "success", text: "Feedback submitted. Thank you!" });
        setFeedbackText("");
        setTagsInput("");
        setFeatureCustom("");
        setRating(4);
        setPage(1);
        await loadFeedback(1);
      }
    } catch (err) {
      setFeedbackNotice({ type: "error", text: `Submission failed: ${err.message}` });
    }

    setSubmitting(false);
  };

  const noticeClasses = feedbackNotice?.type === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100"
    : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Feature Feedback Hub</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Share product feedback feature-by-feature so we can prioritize improvements with real user signals.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75 lg:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquareHeart size={18} className="text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Submit Feedback</h2>
            </div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Feature
            </label>
            <select
              value={featureKey}
              onChange={(e) => setFeatureKey(e.target.value)}
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            >
              {featureOptions.map((option) => (
                <option
                  key={option.key}
                  value={option.key}
                  className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                >
                  {option.label}
                </option>
              ))}
            </select>

            {featureKey === "other" && (
              <input
                value={featureCustom}
                onChange={(e) => setFeatureCustom(e.target.value)}
                placeholder="Custom feature name"
                className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              />
            )}

            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Rating ({rating}/5)
            </label>
            <div className="mb-3 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="rounded-full p-1"
                  aria-label={`Set rating ${value}`}
                >
                  <Star
                    size={20}
                    className={value <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}
                  />
                </button>
              ))}
            </div>

            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Feedback
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={6}
              placeholder="What worked? What should be better?"
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />

            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Tags (comma-separated)
            </label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ux, bug, speed"
              className="mb-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>

            {feedbackNotice && (
              <div className={`mt-3 rounded-lg border p-3 text-sm ${noticeClasses}`}>
                {feedbackNotice.text}
              </div>
            )}
          </form>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
              <div className="mb-3 flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-indigo-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Filters</h2>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <select
                  value={filterFeature}
                  onChange={(e) => {
                    setFilterFeature(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                >
                  <option value="all" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">All features</option>
                  {featureOptions.map((option) => (
                    <option
                      key={`filter_${option.key}`}
                      value={option.key}
                      className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="1"
                  max="5"
                  value={filterMinRating}
                  onChange={(e) => {
                    setFilterMinRating(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Min rating"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                />

                <input
                  type="number"
                  min="1"
                  max="5"
                  value={filterMaxRating}
                  onChange={(e) => {
                    setFilterMaxRating(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Max rating"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5"
                />

                <button
                  type="button"
                  onClick={() => {
                    setFilterFeature("all");
                    setFilterMinRating("");
                    setFilterMaxRating("");
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Feedback</h2>
                {summary && (
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Total: {summary.total_feedback} | Avg: {summary.overall_average_rating}/5
                  </div>
                )}
              </div>

              {loadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                </div>
              ) : items.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No feedback available for current filters.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.feature_label}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="mb-2 text-xs text-amber-500">
                        {"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-200">{item.feedback_text}</p>

                      {Array.isArray(item.tags) && item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span key={`${item.id}_${tag}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loadingList}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500 dark:text-slate-400">Page {page}</span>
                <button
                  type="button"
                  disabled={loadingList || items.length < limit}
                  onClick={() => setPage((prev) => prev + 1)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
