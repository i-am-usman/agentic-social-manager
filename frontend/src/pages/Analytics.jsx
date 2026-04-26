import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Loader2, ThumbsUp, MessageCircle, Share2, ExternalLink, Instagram, Facebook, Linkedin, RefreshCw } from "lucide-react";
import useSessionStorageState from "../hooks/useSessionStorageState";
import { apiUrl } from "../config/api";

const REACTION_EMOJI = {
  LIKE: "👍",
  LOVE: "❤️",
  HAHA: "😂",
  WOW: "😮",
  SAD: "😢",
  ANGRY: "😡",
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useSessionStorageState("analytics.posts", []);
  const [filter, setFilter] = useSessionStorageState("analytics.filter", "all"); // all, facebook, instagram, linkedin (shows both personal & company)
  const [sortBy, setSortBy] = useSessionStorageState("analytics.sortBy", "newest");
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useSessionStorageState("analytics.selectedPost", null);
  const [comments, setComments] = useSessionStorageState("analytics.comments", []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [selectedLikesPost, setSelectedLikesPost] = useState(null);
  const [likesUsers, setLikesUsers] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [likesError, setLikesError] = useState("");
  const [replyDrafts, setReplyDrafts] = useSessionStorageState("analytics.replyDrafts", {});
  const [replyState, setReplyState] = useState({});
  const [expandedReplies, setExpandedReplies] = useSessionStorageState("analytics.expandedReplies", {});
  const [prefetchRepliesEnabled, setPrefetchRepliesEnabled] = useSessionStorageState("analytics.prefetchRepliesEnabled", false);
  const [prefetchingReplies, setPrefetchingReplies] = useState(false);
  const [searchQuery, setSearchQuery] = useSessionStorageState("analytics.searchQuery", "");
  const [hasLoadedAnalytics, setHasLoadedAnalytics] = useSessionStorageState("analytics.hasLoaded", false);

  const token = localStorage.getItem("token");

  const fetchAnalytics = useCallback(async (options = {}) => {
    const background = Boolean(options.background);
    if (!background) {
      setLoading(true);
    }
    setError(null);

    try {
      let endpoint = apiUrl("/analytics/all");
      if (filter === "facebook") {
        endpoint = apiUrl("/analytics/facebook");
      } else if (filter === "instagram") {
        endpoint = apiUrl("/analytics/instagram");
      } else if (filter === "linkedin") {
        endpoint = apiUrl("/analytics/linkedin/posts");
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.status === "success") {
        // Normalize LinkedIn posts to match FB/IG format
        if (filter === "linkedin" && data.posts) {
          const normalizedPosts = data.posts.map((post) => ({
            id: post.post_id,
            platform: "linkedin",
            message: post.text,
            created_time: new Date(post.created_at).toISOString(),
            likes: post.analytics?.likes || 0,
            comments_count: post.analytics?.comments || 0,
            shares: post.analytics?.shares || 0,
            impressions: post.analytics?.impressions || 0,
            clicks: post.analytics?.clicks || 0,
            engagement_rate: post.analytics?.engagement_rate || 0,
          }));
          setPosts(normalizedPosts);
        } else {
          setPosts(data.posts || []);
        }

        if (data.errors && data.errors.length > 0) {
          setError(`Warning: ${data.errors.join(", ")}`);
        }
        setHasLoadedAnalytics(true);
      } else {
        setError(data.detail || "Failed to fetch analytics");
        setPosts([]);
      }
    } catch (err) {
      setError("Error fetching analytics: " + err.message);
      setPosts([]);
    }

    if (!background) {
      setLoading(false);
    }
  }, [filter, token, setHasLoadedAnalytics]);

  useEffect(() => {
    if (hasLoadedAnalytics) {
      setLoading(false);
      fetchAnalytics({ background: true });
    } else {
      fetchAnalytics();
    }
  }, [filter, fetchAnalytics, hasLoadedAnalytics]);

  const refreshAnalytics = async () => {
    await fetchAnalytics();
  };

  const fetchComments = async (postId, platform) => {
    setLoadingComments(true);
    try {
      const res = await fetch(
        apiUrl(`/analytics/comments/${postId}?platform=${platform}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (data.status === "success") {
        setComments(
          (data.comments || []).map((comment) => ({
            ...comment,
            repliesLoaded: false,
            repliesLoading: false,
            repliesError: "",
          }))
        );
      } else {
        setComments([]);
      }
    } catch (err) {
      setComments([]);
    }
    setLoadingComments(false);
  };

  const openCommentsModal = (post) => {
    setSelectedPost(post);
    setComments([]);
    fetchComments(post.id, post.platform);
  };

  const closeCommentsModal = () => {
    setSelectedPost(null);
  };

  const fetchPostLikes = async (postId, platform) => {
    setLoadingLikes(true);
    setLikesError("");
    try {
      const res = await fetch(
        apiUrl(`/analytics/likes/${postId}?platform=${platform}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (data.status === "success") {
        setLikesUsers(data.likers || []);
      } else {
        setLikesUsers([]);
        setLikesError(data.detail || "Unable to fetch post likes.");
      }
    } catch (err) {
      setLikesUsers([]);
      setLikesError("Unable to fetch post likes.");
    }
    setLoadingLikes(false);
  };

  const openLikesModal = (post) => {
    setSelectedLikesPost(post);
    setLikesUsers([]);
    setLikesError("");
    fetchPostLikes(post.id, post.platform);
  };

  const closeLikesModal = () => {
    setSelectedLikesPost(null);
    setLikesUsers([]);
    setLikesError("");
  };

  const fetchCommentReplies = async (commentId) => {
    if (!selectedPost) return;

    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, repliesLoading: true, repliesError: "" }
          : comment
      )
    );

    try {
      const res = await fetch(
        apiUrl(`/analytics/comments/${commentId}/replies?platform=${selectedPost.platform}`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();

      if (data.status === "success") {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: data.replies || [],
                  repliesLoaded: true,
                  repliesLoading: false,
                  repliesError: "",
                }
              : comment
          )
        );
      } else {
        setComments((prev) =>
          prev.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  replies: [],
                  repliesLoaded: true,
                  repliesLoading: false,
                  repliesError: data.detail || "Failed to load replies.",
                }
              : comment
          )
        );
      }
    } catch (err) {
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                replies: [],
                repliesLoaded: true,
                repliesLoading: false,
                repliesError: "Failed to load replies.",
              }
            : comment
        )
      );
    }
  };

  const toggleReplies = async (commentId) => {
    const isExpanded = Boolean(expandedReplies[commentId]);
    if (isExpanded) {
      setExpandedReplies((prev) => ({
        ...prev,
        [commentId]: false,
      }));
      return;
    }

    const target = comments.find((comment) => comment.id === commentId);
    if (target && !target.repliesLoaded && !target.repliesLoading) {
      await fetchCommentReplies(commentId);
    }

    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: true,
    }));
  };

  useEffect(() => {
    if (!prefetchRepliesEnabled || !selectedPost || comments.length === 0) {
      return;
    }

    const pending = comments.filter((comment) => !comment.repliesLoaded && !comment.repliesLoading);
    if (pending.length === 0) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      setPrefetchingReplies(true);
      await Promise.all(pending.map((comment) => fetchCommentReplies(comment.id)));
      if (!cancelled) {
        setPrefetchingReplies(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [prefetchRepliesEnabled, selectedPost, comments]);

  const handleReply = async (commentId) => {
    if (!selectedPost) return;
    const message = (replyDrafts[commentId] || "").trim();
    if (!message) return;

    setReplyState((prev) => ({
      ...prev,
      [commentId]: { loading: true, message: "Replying...", isError: false },
    }));

    try {
      const params = new URLSearchParams({
        platform: selectedPost.platform,
        message,
      });

      const res = await fetch(
        apiUrl(`/analytics/comments/${commentId}/reply?${params.toString()}`),
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();

      if (data.status === "success") {
        setReplyDrafts((prev) => ({ ...prev, [commentId]: "" }));
        setReplyState((prev) => ({
          ...prev,
          [commentId]: { loading: false, message: "Reply sent", isError: false },
        }));
        fetchComments(selectedPost.id, selectedPost.platform);
      } else {
        setReplyState((prev) => ({
          ...prev,
          [commentId]: { loading: false, message: data.detail || "Reply failed", isError: true },
        }));
      }
    } catch (err) {
      setReplyState((prev) => ({
        ...prev,
        [commentId]: { loading: false, message: "Reply failed", isError: true },
      }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTotalEngagement = (post) => {
    const reactions = post.reactions_total ?? post.likes ?? 0;
    return reactions + (post.comments || 0) + (post.shares || 0);
  };

  const getReactionCount = (post) => {
    return post.reactions_total ?? post.likes ?? 0;
  };

  const getReactionSummary = (items = []) => {
    const counts = {};
    for (const item of items) {
      const type = (item?.reaction || "LIKE").toUpperCase();
      counts[type] = (counts[type] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));
  };

  const getReactionEmoji = (type) => {
    return REACTION_EMOJI[(type || "LIKE").toUpperCase()] || "👍";
  };

  const getReactionSummaryFromPost = (post) => {
    const counts = post?.reaction_counts || {};
    return Object.entries(counts)
      .filter(([, count]) => Number(count) > 0)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .map(([type, count]) => ({ type, count: Number(count) }));
  };

  const buildSearchableText = (post) => {
    const content = `${post?.message || ""} ${post?.caption || ""}`;
    const hashtagList = Array.isArray(post?.hashtags) ? post.hashtags.join(" ") : "";
    const inlineHashtags = (content.match(/#[\p{L}\p{N}_]+/gu) || []).join(" ");
    return `${content} ${hashtagList} ${inlineHashtags}`.toLowerCase();
  };

  const filteredPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = !query ? posts : posts.filter((post) => buildSearchableText(post).includes(query));

    const parseDate = (value) => {
      const timestamp = value ? new Date(value).getTime() : 0;
      return Number.isNaN(timestamp) ? 0 : timestamp;
    };

    const reactionsValue = (post) => post.reactions_total ?? post.likes ?? 0;
    const commentsValue = (post) => post.comments || post.comments_count || 0;

    return [...filtered].sort((left, right) => {
      if (sortBy === "reactions") {
        const reactionDelta = reactionsValue(right) - reactionsValue(left);
        if (reactionDelta !== 0) return reactionDelta;
        return parseDate(right.created_time) - parseDate(left.created_time);
      }

      if (sortBy === "comments") {
        const commentDelta = commentsValue(right) - commentsValue(left);
        if (commentDelta !== 0) return commentDelta;
        return parseDate(right.created_time) - parseDate(left.created_time);
      }

      return parseDate(right.created_time) - parseDate(left.created_time);
    });
  }, [posts, searchQuery, sortBy]);

  return (
    <div className="mx-auto max-w-7xl p-6 text-slate-900 dark:text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Social Media Analytics</h1>
          <button
            type="button"
            onClick={refreshAnalytics}
            aria-label="Refresh analytics"
            title="Refresh analytics"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw size={16} />
          </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-white/10">
        {["all", "facebook", "instagram", "linkedin"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-3 text-sm font-semibold capitalize flex items-center gap-2 ${
              filter === tab
                ? "border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
            }`}
          >
            {tab === "facebook" && <Facebook size={18} />}
            {tab === "instagram" && <Instagram size={18} />}
            {tab === "linkedin" && <Linkedin size={18} />}
            {tab}
          </button>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Search posts by caption or hashtags
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Try: launch, #sale, eid, growth..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10"
            />
          </div>

          <div className="min-w-56">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Sort
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <option value="newest">Newest</option>
              <option value="reactions">Most reactions</option>
              <option value="comments">Most comments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10">
          <p className="text-sm text-amber-700 dark:text-amber-100">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading analytics...</span>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-slate-500 dark:text-slate-400">No posts match your search</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">Try different words or hashtag terms.</p>
        </div>
      ) : (
        /* Posts Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_-24px_rgba(2,6,23,0.12)] transition-all hover:-translate-y-0.5 hover:border-slate-300 dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] dark:hover:border-white/20"
            >
              {/* Platform Badge */}
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-2">
                  {post.platform === "facebook" ? (
                    <>
                      <Facebook size={16} className="text-blue-600" />
                      <span className="text-sm font-semibold text-blue-600">Facebook</span>
                    </>
                  ) : post.platform === "instagram" ? (
                    <>
                      <Instagram size={16} className="text-pink-600" />
                      <span className="text-sm font-semibold text-pink-600">Instagram</span>
                    </>
                  ) : (
                    <>
                      <Linkedin size={16} className="text-blue-700" />
                      <span className="text-sm font-semibold text-blue-700">LinkedIn</span>
                    </>
                  )}
                </div>
                {post.permalink && (
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              {/* Image */}
              {post.image && (
                <img
                  src={post.image}
                  alt="Post"
                  className="w-full h-48 object-cover"
                />
              )}

              {/* Content */}
              <div className="p-4">
                <p className="mb-3 line-clamp-3 text-sm text-slate-700 dark:text-slate-200">
                  {post.message || post.caption || "No caption"}
                </p>

                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(post.created_time)}
                </p>

                {/* Engagement Metrics */}
                <div className="flex items-center gap-4 mb-3">
                  <button
                    type="button"
                    onClick={() => openLikesModal(post)}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
                  >
                    <ThumbsUp size={16} className="text-blue-500" />
                    <span>{getReactionCount(post)}</span>
                  </button>
                  <button
                    onClick={() => openCommentsModal(post)}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300"
                  >
                    <MessageCircle size={16} className="text-green-500" />
                    <span>{post.comments || post.comments_count || 0}</span>
                  </button>
                  {(post.platform === "facebook" || post.platform === "linkedin") && (
                    <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                      <Share2 size={16} className="text-purple-500" />
                      <span>{post.shares || 0}</span>
                    </div>
                  )}
                </div>

                {/* LinkedIn-specific metrics */}
                {post.platform === "linkedin" && (post.impressions || post.clicks) && (
                  <div className="mb-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
                    {post.impressions > 0 && (
                      <div>Impressions: <span className="font-semibold">{post.impressions}</span></div>
                    )}
                    {post.clicks > 0 && (
                      <div>Clicks: <span className="font-semibold">{post.clicks}</span></div>
                    )}
                    {post.engagement_rate > 0 && (
                      <div>Engagement: <span className="font-semibold">{post.engagement_rate.toFixed(2)}%</span></div>
                    )}
                  </div>
                )}

                {/* Total Engagement */}
                <div className="border-t border-slate-200 pt-3 dark:border-white/10">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Total Engagement:{" "}
                    <span className="font-semibold text-indigo-600">
                      {getTotalEngagement(post)}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comments Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 shadow-[0_30px_80px_rgba(2,6,23,0.12)] dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-950/95">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Comments ({comments.length})
                </h3>
              </div>
              <button
                onClick={closeCommentsModal}
                className="text-2xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* Post Preview */}
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
                  {selectedPost.message || selectedPost.caption || "No caption"}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={prefetchRepliesEnabled}
                      onChange={(e) => setPrefetchRepliesEnabled(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Prefetch all replies
                  </label>
                  {prefetchingReplies && (
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Loader2 size={12} className="animate-spin" />
                      Fetching replies...
                    </span>
                  )}
                </div>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-600" size={30} />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-8 text-center text-slate-500 dark:text-slate-400">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-100">
                          {comment.author}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(comment.created_time)}
                        </p>
                      </div>
                      <p className="mb-2 text-sm text-slate-700 dark:text-slate-200">
                        {comment.message}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <ThumbsUp size={12} />
                        <span>{comment.likes || 0}</span>
                      </div>
                      <div className="mt-3 ml-4 border-l-2 border-slate-200 pl-3 dark:border-white/10">
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          {expandedReplies[comment.id]
                            ? "Hide Replies"
                            : comment.repliesLoaded
                              ? `Show Replies (${(comment.replies || []).length})`
                              : "Show Replies"}
                        </button>

                        {expandedReplies[comment.id] && (
                          <div className="mt-2 space-y-2">
                            {comment.repliesLoading ? (
                              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                <Loader2 size={12} className="animate-spin" />
                                Loading replies...
                              </div>
                            ) : comment.repliesError ? (
                              <p className="text-xs text-red-600">{comment.repliesError}</p>
                            ) : Array.isArray(comment.replies) && comment.replies.length > 0 ? (
                              comment.replies.map((reply) => (
                                <div key={reply.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/5">
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{reply.author}</p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(reply.created_time)}</p>
                                  </div>
                                  <p className="mb-1 text-xs text-slate-700 dark:text-slate-200">{reply.message}</p>
                                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                    <ThumbsUp size={10} />
                                    <span>{reply.likes || 0}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-500 dark:text-slate-400">No replies yet</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyDrafts[comment.id] || ""}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))
                            }
                            placeholder="Write a reply..."
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                          />
                          <button
                            onClick={() => handleReply(comment.id)}
                            disabled={replyState[comment.id]?.loading}
                            className="bg-indigo-600 text-white px-3 py-1 rounded text-sm disabled:opacity-60"
                          >
                            {replyState[comment.id]?.loading ? "Sending..." : "Reply"}
                          </button>
                        </div>
                        {replyState[comment.id]?.message && (
                          <p
                            className={`text-xs mt-1 ${
                              replyState[comment.id]?.isError ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {replyState[comment.id].message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Likes Modal */}
      {selectedLikesPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white/95 shadow-[0_30px_80px_rgba(2,6,23,0.12)] dark:border-white/10 dark:bg-slate-950/95 dark:shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white/95 p-4 dark:border-white/10 dark:bg-slate-950/95">
              <div className="flex items-center gap-2">
                <ThumbsUp size={20} className="text-blue-500" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Reactions ({likesUsers.length})
                </h3>
              </div>
              <button
                onClick={closeLikesModal}
                className="text-2xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="p-4">
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                <p className="line-clamp-2 text-sm text-slate-700 dark:text-slate-200">
                  {selectedLikesPost.message || selectedLikesPost.caption || "No caption"}
                </p>
              </div>

              {loadingLikes ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-600" size={30} />
                </div>
              ) : likesError ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                  {likesError}
                </p>
              ) : likesUsers.length === 0 ? (
                (() => {
                  const fallbackSummary = getReactionSummaryFromPost(selectedLikesPost);
                  if (fallbackSummary.length > 0) {
                    return (
                      <div className="space-y-3">
                        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
                          This platform did not return individual reactor identities. Showing reaction totals instead.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {fallbackSummary.map((item) => (
                            <span
                              key={item.type}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                            >
                              {getReactionEmoji(item.type)} {item.type}: {item.count}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return <p className="py-8 text-center text-slate-500 dark:text-slate-400">No reactions found</p>;
                })()
              ) : (
                <div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {getReactionSummary(likesUsers).map((item) => (
                      <span
                        key={item.type}
                        className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                      >
                        {getReactionEmoji(item.type)} {item.type}: {item.count}
                      </span>
                    ))}
                  </div>
                  <div className="space-y-2">
                  {likesUsers.map((person) => (
                    <div
                      key={person.id || `${person.name}-${person.reaction}`}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{person.name || "User"}</p>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                        {getReactionEmoji(person.reaction)} {(person.reaction || "LIKE").toUpperCase()}
                      </span>
                    </div>
                  ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
