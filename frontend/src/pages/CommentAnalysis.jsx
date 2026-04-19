import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Facebook, Instagram, Loader2, MessageCircle, RefreshCw, Sparkles, ThumbsUp } from "lucide-react";
import useSessionStorageState from "../hooks/useSessionStorageState";

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#9ca3af",
  negative: "#ef4444",
};

const REACTION_COLORS = {
  LIKE: "#3b82f6",
  LOVE: "#ef4444",
  HAHA: "#f59e0b",
  WOW: "#8b5cf6",
  SAD: "#06b6d4",
  ANGRY: "#f97316",
};

const EMOTION_COLORS = ["#0ea5e9", "#f97316", "#a855f7", "#10b981", "#eab308", "#ec4899"];

function collectAnalyzedComments(items) {
  const collected = [];

  const walk = (comments) => {
    for (const comment of comments || []) {
      if (comment?.analysis) {
        collected.push(comment);
      }
      if (Array.isArray(comment?.replies) && comment.replies.length > 0) {
        walk(comment.replies);
      }
    }
  };

  walk(items);
  return collected;
}

function formatPercent(value, total) {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function getPlatformFrameClasses(platform) {
  if (platform === "facebook") {
    return {
      outer: "border-blue-500/35 bg-gradient-to-br from-blue-500/15 via-blue-500/10 to-sky-500/15",
      inner: "border-blue-600/40 bg-slate-950/90",
      label: "Facebook frame",
      labelClasses: "bg-blue-600 text-white",
    };
  }

  return {
    outer: "border-fuchsia-500/35 bg-gradient-to-br from-fuchsia-500/15 via-orange-400/10 to-amber-300/15",
    inner: "border-fuchsia-500/40 bg-slate-950/90",
    label: "Instagram frame",
    labelClasses: "bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white",
  };
}

function PlatformLogoBadge({ platform, compact = false }) {
  const isFacebook = platform === "facebook";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full border shadow ${
        isFacebook
          ? "border-blue-500/60 bg-blue-600 text-white"
          : "border-fuchsia-500/60 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-orange-400 text-white"
      } ${compact ? "h-4 w-4" : "h-5 w-5"}`}
      aria-label={isFacebook ? "Facebook" : "Instagram"}
      title={isFacebook ? "Facebook" : "Instagram"}
    >
      {isFacebook ? <Facebook size={compact ? 10 : 12} /> : <Instagram size={compact ? 10 : 12} />}
    </span>
  );
}

function PieSummaryCard({ title, data, total, emptyLabel }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const size = 154;
  const radius = 56;
  const center = size / 2;

  if (!total) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/75">
        <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  let running = 0;
  const slices = data.map((item, idx) => {
    const startAngle = (running / total) * Math.PI * 2 - Math.PI / 2;
    running += item.value;
    const endAngle = (running / total) * Math.PI * 2 - Math.PI / 2;
    const midAngle = (startAngle + endAngle) / 2;

    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);
    const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;

    const outerR = radius + 6;
    const anchorX = center + outerR * Math.cos(midAngle);
    const anchorY = center + outerR * Math.sin(midAngle);
    const bendX = center + (radius + 24) * Math.cos(midAngle);
    const bendY = center + (radius + 24) * Math.sin(midAngle);
    const side = Math.cos(midAngle) >= 0 ? 1 : -1;
    const labelX = bendX + side * 26;
    const labelY = bendY;

    return {
      id: `${item.name}_${idx}`,
      d: `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      color: item.color,
      name: item.name,
      value: item.value,
      percentage: Math.round((item.value / total) * 100),
      connector: { anchorX, anchorY, bendX, bendY, labelX, labelY, side },
    };
  });

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_45px_-24px_rgba(2,6,23,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_18px_45px_-24px_rgba(2,6,23,0.8)]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-fuchsia-400/10 blur-2xl" />
      <div className="relative flex h-full flex-col">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">{title}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Summary for the selected post</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="relative" style={{ width: 252, height: 174 }}>
            {hoveredSlice && (
              <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full border border-slate-200 bg-slate-950/95 px-3 py-1 text-xs font-semibold text-white shadow-lg dark:border-white/10">
                <span className="capitalize">{hoveredSlice.name}</span>
                <span className="ml-2 text-slate-300">{hoveredSlice.percentage}%</span>
              </div>
            )}
            <svg width="252" height="174" viewBox="0 0 252 174" className="overflow-visible">
              <g transform="translate(49,9)">
                {slices.map((slice) => (
                  <path
                    key={slice.id}
                    d={slice.d}
                    fill={slice.color}
                    stroke="rgba(15,23,42,0.55)"
                    strokeWidth="2"
                    className="origin-center transition-transform duration-300 hover:scale-[1.03]"
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    onFocus={() => setHoveredSlice(slice)}
                    onBlur={() => setHoveredSlice(null)}
                    tabIndex={0}
                    role="img"
                    aria-label={`${slice.name} ${slice.percentage}%`}
                  />
                ))}
                <circle cx={center} cy={center} r="30" fill="rgba(2,6,23,0.92)" />
              </g>

            </svg>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {slices.map((slice) => (
            <div key={`${slice.id}_legend`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 dark:bg-white/5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="capitalize text-slate-700 dark:text-slate-300">{slice.name}</span>
              <span className="ml-auto font-semibold text-slate-500 dark:text-slate-400">{formatPercent(slice.value, total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CommentAnalysis() {
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [posts, setPosts] = useSessionStorageState("comment-analysis.posts", []);
  const [selectedPost, setSelectedPost] = useSessionStorageState("comment-analysis.selectedPost", null);
  const [comments, setComments] = useSessionStorageState("comment-analysis.comments", []);
  const [filter, setFilter] = useSessionStorageState("comment-analysis.filter", "all");
  const [searchQuery, setSearchQuery] = useSessionStorageState("comment-analysis.searchQuery", "");
  const [includeReplies, setIncludeReplies] = useSessionStorageState("comment-analysis.includeReplies", false);
  const [hasLoadedPosts, setHasLoadedPosts] = useSessionStorageState("comment-analysis.hasLoadedPosts", false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  const fetchPosts = useCallback(async (options = {}) => {
    const background = Boolean(options.background);
    if (!background) {
      setLoadingPosts(true);
    }
    setError(null);

    try {
      let endpoint = "http://127.0.0.1:8000/analytics/all";
      if (filter === "facebook") {
        endpoint = "http://127.0.0.1:8000/analytics/facebook";
      } else if (filter === "instagram") {
        endpoint = "http://127.0.0.1:8000/analytics/instagram";
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.status === "success") {
        const filtered = (data.posts || []).filter(
          (post) => post.platform === "facebook" || post.platform === "instagram"
        );
        setPosts(filtered);
        setHasLoadedPosts(true);
      } else {
        setPosts([]);
        setError(data.detail || "Failed to fetch posts");
      }
    } catch (err) {
      setPosts([]);
      setError("Error fetching posts: " + err.message);
    }

    if (!background) {
      setLoadingPosts(false);
    }
  }, [filter, token, setHasLoadedPosts]);

  const fetchComments = async (post, replyFlag = includeReplies, options = {}) => {
    const background = Boolean(options.background);
    if (!post?.id || !post?.platform) return;

    setSelectedPost(post);
    if (!background) {
      setLoadingComments(true);
      setComments([]);
    }

    try {
      const replyQuery = replyFlag ? "&include_replies=true" : "";
      const res = await fetch(
        `http://127.0.0.1:8000/analytics/comments/${post.id}?platform=${post.platform}&include_analysis=true${replyQuery}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (data.status === "success") {
        setComments(data.comments || []);
      } else {
        setComments([]);
        setError(data.detail || "Failed to fetch comments");
      }
    } catch (err) {
      setComments([]);
      setError("Error fetching comments: " + err.message);
    }

    if (!background) {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    if (hasLoadedPosts) {
      setLoadingPosts(false);
      fetchPosts({ background: true });
    } else {
      fetchPosts();
    }
  }, [fetchPosts, hasLoadedPosts]);

  const refreshCommentAnalysis = async () => {
    await fetchPosts();
    if (selectedPost?.id && selectedPost?.platform) {
      await fetchComments(selectedPost, includeReplies);
    }
  };
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sentimentStyle = (sentiment) => {
    if (sentiment === "positive") return "bg-emerald-500/10 border-emerald-400/20 text-emerald-800 dark:text-emerald-100";
    if (sentiment === "negative") return "bg-rose-500/10 border-rose-400/20 text-rose-800 dark:text-rose-100";
    return "bg-slate-500/10 border-slate-400/20 text-slate-700 dark:text-slate-200";
  };

  const commentSummary = useMemo(() => {
    const analyzedComments = collectAnalyzedComments(comments);

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    const emotionScores = {};

    for (const comment of analyzedComments) {
      const sentiment = (comment.analysis?.sentiment || "neutral").toLowerCase();
      if (sentimentCounts[sentiment] !== undefined) {
        sentimentCounts[sentiment] += 1;
      } else {
        sentimentCounts.neutral += 1;
      }

      const emotions = Array.isArray(comment.analysis?.emotions) ? comment.analysis.emotions : [];
      for (const emotion of emotions) {
        const name = String(emotion?.name || "unknown").toLowerCase();
        const score = Number(emotion?.score ?? 0);
        emotionScores[name] = (emotionScores[name] || 0) + (Number.isFinite(score) && score > 0 ? score : 0.2);
      }
    }

    const sentimentData = [
      { name: "positive", value: sentimentCounts.positive, color: SENTIMENT_COLORS.positive },
      { name: "neutral", value: sentimentCounts.neutral, color: SENTIMENT_COLORS.neutral },
      { name: "negative", value: sentimentCounts.negative, color: SENTIMENT_COLORS.negative },
    ].filter((item) => item.value > 0);

    const emotionData = Object.entries(emotionScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name,
        value,
        color: EMOTION_COLORS[index % EMOTION_COLORS.length],
      }));

    return {
      analyzedCount: analyzedComments.length,
      sentimentData,
      sentimentTotal: sentimentData.reduce((sum, item) => sum + item.value, 0),
      emotionData,
      emotionTotal: emotionData.reduce((sum, item) => sum + item.value, 0),
    };
  }, [comments]);

  const reactionSummary = useMemo(() => {
    const reactionCounts = selectedPost?.reaction_counts || {};

    const reactionData = Object.entries(reactionCounts)
      .map(([name, value]) => ({
        name: name.toLowerCase(),
        value: Number(value) || 0,
        color: REACTION_COLORS[name] || "#94a3b8",
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    return {
      reactionData,
      reactionTotal: reactionData.reduce((sum, item) => sum + item.value, 0),
    };
  }, [selectedPost]);

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return posts;

    return posts.filter((post) => {
      const content = `${post?.message || ""} ${post?.caption || ""}`;
      const hashtagList = Array.isArray(post?.hashtags) ? post.hashtags.join(" ") : "";
      const inlineHashtags = (content.match(/#[\p{L}\p{N}_]+/gu) || []).join(" ");
      const searchable = `${content} ${hashtagList} ${inlineHashtags}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [posts, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-transparent">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Comment Analysis</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Select a post first, then inspect the sliding detail panel, chart summary, and comments below.</p>
          </div>
          <button
            type="button"
            onClick={refreshCommentAnalysis}
            aria-label="Refresh comments"
            title="Refresh comments"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Post selector</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">Choose Facebook or Instagram content from the strip below.</p>
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-200 dark:border-white/10">
            {["all", "facebook", "instagram"].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold capitalize transition ${
                  filter === tab
                    ? "border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
                }`}
              >
                {tab === "all" && <Sparkles size={18} />}
                {tab === "facebook" && <Facebook size={18} />}
                {tab === "instagram" && <Instagram size={18} />}
                {tab}
              </button>
            ))}
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              Search by caption or hashtags
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try: #launch, eid campaign, discount..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            />
          </div>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No posts match your search.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {filteredPosts.map((post) => {
                const isSelected = selectedPost?.id === post.id;
                return (
                  <button
                    key={post.id}
                    onClick={() => fetchComments(post)}
                    className={`group min-w-[250px] rounded-2xl border p-3 text-left transition-all duration-300 ${
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)] dark:border-white/10 dark:bg-white dark:text-slate-900"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-slate-900/70"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 rounded-xl border p-0.5 ${getPlatformFrameClasses(post.platform).outer}`}>
                        <div className={`relative h-16 w-16 overflow-hidden rounded-[10px] border ${getPlatformFrameClasses(post.platform).inner}`}>
                          {post.image ? (
                            <img src={post.image} alt="Post preview" className="h-full w-full object-cover" />
                          ) : (
                            <div className={`flex h-full items-center justify-center text-[10px] font-semibold ${isSelected ? "bg-white/10 text-white/70 dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-500 dark:bg-slate-800/70 dark:text-slate-300"}`}>
                              No Image
                            </div>
                          )}
                          <div className="absolute left-1 top-1">
                            <PlatformLogoBadge platform={post.platform} compact />
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "bg-white/10 text-white/80 dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-500 dark:bg-slate-800/70 dark:text-slate-300"}`}>
                            {post.platform}
                          </span>
                          <span className={`text-[11px] ${isSelected ? "text-white/70 dark:text-slate-500" : "text-slate-500 dark:text-slate-400"}`}>
                            {formatDate(post.created_time)}
                          </span>
                        </div>
                        <p className={`line-clamp-2 text-sm ${isSelected ? "text-white dark:text-slate-900" : "text-slate-700 dark:text-slate-200"}`}>
                          {post.message || post.caption || "No caption"}
                        </p>
                        <div className={`mt-1 flex items-center gap-3 text-[11px] ${isSelected ? "text-white/80 dark:text-slate-700" : "text-slate-500 dark:text-slate-400"}`}>
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp size={12} />
                            <span>{post.reactions_total ?? post.likes ?? 0}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageCircle size={12} />
                            <span>{post.comments ?? post.comments_count ?? 0}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className={`mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm backdrop-blur transition-all duration-500 dark:border-white/10 dark:bg-slate-900/75 ${
            selectedPost ? "max-h-[260px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className={`rounded-2xl border p-1 shadow-lg ${getPlatformFrameClasses(selectedPost?.platform).outer}`}>
                  <div className={`relative h-20 w-20 overflow-hidden rounded-[14px] border ${getPlatformFrameClasses(selectedPost?.platform).inner}`}>
                    {selectedPost?.image ? (
                      <img src={selectedPost.image} alt="Selected post preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[11px] font-semibold text-slate-400 dark:text-slate-200">No Image</div>
                    )}
                    <div className="absolute left-1 top-1">
                      <PlatformLogoBadge platform={selectedPost?.platform} />
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Selected post</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{selectedPost?.platform === "facebook" ? "Facebook" : "Instagram"}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{selectedPost?.message || selectedPost?.caption || "No caption"}</p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={includeReplies}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIncludeReplies(checked);
                    if (selectedPost) {
                      fetchComments(selectedPost, checked);
                    }
                  }}
                />
                Include replies
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
            {error}
          </div>
        )}

        <div className="mx-auto mb-5 grid max-w-6xl grid-cols-1 items-stretch gap-4 lg:grid-cols-3 lg:items-stretch">
          <div className="w-full">
            <PieSummaryCard
              title="Sentiment Distribution"
              data={commentSummary.sentimentData}
              total={commentSummary.sentimentTotal}
              emptyLabel="Select a post to see sentiment results."
            />
          </div>
          <div className="w-full">
            <PieSummaryCard
              title="Top Emotions"
              data={commentSummary.emotionData}
              total={commentSummary.emotionTotal}
              emptyLabel="Select a post to see emotion results."
            />
          </div>
          <div className="w-full">
            <PieSummaryCard
              title="Reactions"
              data={reactionSummary.reactionData}
              total={reactionSummary.reactionTotal}
              emptyLabel="Select a Facebook post to see reaction breakdown."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/75">
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Comments with Analysis</h2>
          </div>

          {!selectedPost ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a post to view and analyze comments.</p>
          ) : loadingComments ? (
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="animate-spin text-indigo-600" size={26} />
              <span className="text-sm text-slate-600 dark:text-slate-300">Analyzing comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No comments found for this post.</p>
          ) : (
            <div className="max-h-[56vh] space-y-3 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{comment.author}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(comment.created_time)}</p>
                  </div>

                  <p className="mb-3 text-sm text-slate-700 dark:text-slate-200">{comment.message}</p>

                  {comment.analysis ? (
                    <div className={`rounded-2xl border p-3 ${sentimentStyle(comment.analysis.sentiment)}`}>
                      <div className="mb-1 flex items-center gap-2">
                        <Sparkles size={14} />
                        <span className="text-xs font-semibold capitalize">{comment.analysis.sentiment}</span>
                        <span className="text-xs">Confidence: {Math.round((comment.analysis.confidence || 0) * 100)}%</span>
                      </div>

                      {Array.isArray(comment.analysis.emotions) && comment.analysis.emotions.length > 0 && (
                        <div className="mb-1 flex flex-wrap gap-1">
                          {comment.analysis.emotions.map((emotion, idx) => (
                            <span key={`${comment.id}_emotion_${idx}`} className="rounded-full border border-current/20 px-2 py-0.5 text-[11px]">
                              {emotion.name} ({Math.round((emotion.score || 0) * 100)}%)
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs">{comment.analysis.summary}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No analysis available.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
