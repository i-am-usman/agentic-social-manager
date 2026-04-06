import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  neutral: "#9ca3af",
  negative: "#ef4444",
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

function PieSummaryCard({ title, data, total, emptyLabel }) {
  const size = 176;
  const radius = 66;
  const center = size / 2;

  if (!total) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-xs text-gray-500">{emptyLabel}</p>
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
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-[0_18px_45px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-100/70 blur-2xl" />
      <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-fuchsia-100/70 blur-2xl" />
      <div className="relative">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</h3>
            <p className="text-xs text-slate-400 mt-1">Summary for the selected post</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-sm">100%</span>
        </div>

        <div className="flex justify-center">
          <div className="relative" style={{ width: 320, height: 260 }}>
            <svg width="320" height="260" viewBox="0 0 320 260" className="overflow-visible">
              <g transform="translate(72,36)">
                {slices.map((slice) => (
                  <path
                    key={slice.id}
                    d={slice.d}
                    fill={slice.color}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-transform duration-300 hover:scale-[1.03] origin-center"
                  />
                ))}
                <circle cx={center} cy={center} r="30" fill="#ffffff" />
              </g>

              <g transform="translate(72,36)">
                {slices.map((slice) => (
                  <g key={`${slice.id}_callout`}>
                    <circle cx={slice.connector.anchorX} cy={slice.connector.anchorY} r="3.5" fill={slice.color} />
                    <path
                      d={`M ${slice.connector.anchorX} ${slice.connector.anchorY} L ${slice.connector.bendX} ${slice.connector.bendY} L ${slice.connector.labelX} ${slice.connector.labelY}`}
                      stroke={slice.color}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                    />
                    <foreignObject
                      x={slice.connector.side > 0 ? slice.connector.labelX + 4 : slice.connector.labelX - 84}
                      y={slice.connector.labelY - 16}
                      width="80"
                      height="38"
                    >
                      <div
                        className="rounded-xl border-2 bg-white px-2 py-1 text-right shadow-sm"
                        style={{ borderColor: slice.color }}
                      >
                        <p className="text-[9px] uppercase tracking-[0.16em] text-slate-400">{slice.name}</p>
                        <p className="text-lg font-black leading-4 text-slate-900">{slice.percentage}%</p>
                      </div>
                    </foreignObject>
                  </g>
                ))}
              </g>
            </svg>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          {slices.map((slice) => (
            <div key={`${slice.id}_legend`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="capitalize text-slate-600">{slice.name}</span>
              <span className="ml-auto font-semibold text-slate-500">{formatPercent(slice.value, total)}</span>
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
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [includeReplies, setIncludeReplies] = useState(false);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("token");

  const fetchPosts = useCallback(async () => {
    setLoadingPosts(true);
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
      } else {
        setPosts([]);
        setError(data.detail || "Failed to fetch posts");
      }
    } catch (err) {
      setPosts([]);
      setError("Error fetching posts: " + err.message);
    }

    setLoadingPosts(false);
  }, [filter, token]);

  const fetchComments = async (post, replyFlag = includeReplies) => {
    if (!post?.id || !post?.platform) return;

    setSelectedPost(post);
    setLoadingComments(true);
    setComments([]);

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

    setLoadingComments(false);
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
    if (sentiment === "positive") return "bg-green-50 border-green-200 text-green-700";
    if (sentiment === "negative") return "bg-red-50 border-red-200 text-red-700";
    return "bg-gray-50 border-gray-200 text-gray-700";
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff,_#eef3ff_40%,_#f5f7fb_72%,_#eef2ff)]">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-5">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Comment Analysis</h1>
          <p className="mt-1 text-sm text-slate-500">Select a post first, then inspect the sliding detail panel, chart summary, and comments below.</p>
        </div>

        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Post selector</p>
              <p className="text-sm text-slate-600">Choose Facebook or Instagram content from the strip below.</p>
            </div>
            <div className="flex gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              {["all", "facebook", "instagram"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  className={`rounded-full px-4 py-2 text-sm capitalize transition ${
                    filter === tab ? "bg-slate-900 text-white shadow" : "text-slate-600 hover:bg-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Search by caption or hashtags
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try: #launch, eid campaign, discount..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="animate-spin text-indigo-600" size={24} />
            </div>
          ) : filteredPosts.length === 0 ? (
            <p className="text-sm text-slate-500">No posts match your search.</p>
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
                        ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.9)]"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${isSelected ? "border-white/30" : "border-slate-200"}`}>
                        {post.image ? (
                          <img src={post.image} alt="Post preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className={`flex h-full items-center justify-center text-[10px] font-semibold ${isSelected ? "bg-white/10 text-white/70" : "bg-slate-100 text-slate-400"}`}>
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${isSelected ? "bg-white/10 text-white/80" : "bg-slate-100 text-slate-500"}`}>
                            {post.platform}
                          </span>
                          <span className={`text-[11px] ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                            {formatDate(post.created_time)}
                          </span>
                        </div>
                        <p className={`line-clamp-2 text-sm ${isSelected ? "text-white" : "text-slate-700"}`}>
                          {post.message || post.caption || "No caption"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          className={`mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white/85 shadow-sm backdrop-blur transition-all duration-500 ${
            selectedPost ? "max-h-[260px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="p-4 md:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                  {selectedPost?.image ? (
                    <img src={selectedPost.image} alt="Selected post preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[11px] font-semibold text-slate-400">No Image</div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Selected post</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{selectedPost?.platform === "facebook" ? "Facebook" : "Instagram"}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-600">{selectedPost?.message || selectedPost?.caption || "No caption"}</p>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
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
        <div className="mb-4 p-3 border border-yellow-200 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          {error}
        </div>
      )}

        <div className="mx-auto mb-5 flex max-w-5xl justify-center gap-4">
          <div className="w-full max-w-[420px]">
            <PieSummaryCard
              title="Sentiment Distribution"
              data={commentSummary.sentimentData}
              total={commentSummary.sentimentTotal}
              emptyLabel="Select a post to see sentiment results."
            />
          </div>
          <div className="w-full max-w-[420px]">
            <PieSummaryCard
              title="Top Emotions"
              data={commentSummary.emotionData}
              total={commentSummary.emotionTotal}
              emptyLabel="Select a post to see emotion results."
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Comments with Analysis</h2>
          </div>

          {!selectedPost ? (
            <p className="text-sm text-slate-500">Select a post to view and analyze comments.</p>
          ) : loadingComments ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={26} />
              <span className="text-sm text-slate-600">Analyzing comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-slate-500">No comments found for this post.</p>
          ) : (
            <div className="space-y-3 max-h-[56vh] overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{comment.author}</p>
                    <p className="text-xs text-slate-500">{formatDate(comment.created_time)}</p>
                  </div>

                  <p className="mb-3 text-sm text-slate-700">{comment.message}</p>

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
                    <p className="text-xs text-slate-500">No analysis available.</p>
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
