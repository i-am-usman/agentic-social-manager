import React, { useState, useEffect, useCallback } from "react";
import { Loader2, ThumbsUp, MessageCircle, Share2, ExternalLink, Instagram, Facebook, Linkedin } from "lucide-react";

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState("all"); // all, facebook, instagram, linkedin (shows both personal & company)
  const [error, setError] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyState, setReplyState] = useState({});
  const [expandedReplies, setExpandedReplies] = useState({});
  const [linkedinSettings, setLinkedinSettings] = useState({
    auto_reply_enabled: false,
    reply_tone: "professional",
    reply_delay_minutes: 5
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  const token = localStorage.getItem("token");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let endpoint = "http://127.0.0.1:8000/analytics/all";
      if (filter === "facebook") {
        endpoint = "http://127.0.0.1:8000/analytics/facebook";
      } else if (filter === "instagram") {
        endpoint = "http://127.0.0.1:8000/analytics/instagram";
      } else if (filter === "linkedin") {
        endpoint = "http://127.0.0.1:8000/analytics/linkedin/posts";
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      
      if (data.status === "success") {
        // Normalize LinkedIn posts to match FB/IG format
        if (filter === "linkedin" && data.posts) {
          const normalizedPosts = data.posts.map(post => ({
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
      } else {
        setError(data.detail || "Failed to fetch analytics");
        setPosts([]);
      }
    } catch (err) {
      setError("Error fetching analytics: " + err.message);
      setPosts([]);
    }

    setLoading(false);
  }, [filter, token]);

  const fetchLinkedInSettings = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/analytics/linkedin/auto-reply/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.status === "success" && data.settings) {
        setLinkedinSettings(data.settings);
      }
    } catch (err) {
      console.error("Failed to fetch LinkedIn settings:", err);
    }
  }, [token]);

  useEffect(() => {
    fetchAnalytics();
    if (filter === "linkedin") {
      fetchLinkedInSettings();
    }
  }, [filter, fetchAnalytics, fetchLinkedInSettings]);

  const updateLinkedInSettings = async (newSettings) => {
    setSettingsLoading(true);
    try {
      // Update toggle
      if ("auto_reply_enabled" in newSettings) {
        await fetch("http://127.0.0.1:8000/analytics/linkedin/auto-reply/toggle", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ enabled: newSettings.auto_reply_enabled })
        });
      }
      
      // Update settings (tone, delay)
      if ("reply_tone" in newSettings || "reply_delay_minutes" in newSettings) {
        await fetch("http://127.0.0.1:8000/analytics/linkedin/auto-reply/settings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            reply_tone: newSettings.reply_tone || linkedinSettings.reply_tone,
            reply_delay_minutes: newSettings.reply_delay_minutes || linkedinSettings.reply_delay_minutes
          })
        });
      }
      
      setLinkedinSettings((prev) => ({ ...prev, ...newSettings }));
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
    setSettingsLoading(false);
  };

  const fetchComments = async (postId, platform) => {
    setLoadingComments(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/analytics/comments/${postId}?platform=${platform}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await res.json();
      if (data.status === "success") {
        setComments(data.comments || []);
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
    setComments([]);
    setReplyDrafts({});
    setReplyState({});
    setExpandedReplies({});
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

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
        `http://127.0.0.1:8000/analytics/comments/${commentId}/reply?${params.toString()}`,
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
    return (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Social Media Analytics</h1>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {["all", "facebook", "instagram", "linkedin"].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-6 py-3 text-sm font-semibold capitalize flex items-center gap-2 ${
              filter === tab
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-gray-600 hover:text-indigo-600"
            }`}
          >
            {tab === "facebook" && <Facebook size={18} />}
            {tab === "instagram" && <Instagram size={18} />}
            {tab === "linkedin" && <Linkedin size={18} />}
            {tab}
          </button>
        ))}
      </div>

      {/* LinkedIn Auto-Reply Settings (shows only on LinkedIn tab) */}
      {filter === "linkedin" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Auto-Reply Settings</h3>
          
          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Auto-Reply</label>
                <p className="text-xs text-gray-500 mt-1">Automatically reply to comments using AI</p>
              </div>
              <button
                onClick={() => updateLinkedInSettings({ auto_reply_enabled: !linkedinSettings.auto_reply_enabled })}
                disabled={settingsLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  linkedinSettings.auto_reply_enabled ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    linkedinSettings.auto_reply_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Reply Tone Selector */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Reply Tone</label>
              <select
                value={linkedinSettings.reply_tone}
                onChange={(e) => updateLinkedInSettings({ reply_tone: e.target.value })}
                disabled={settingsLoading}
                className="w-full md:w-64 border rounded-lg p-2 text-sm"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
              </select>
            </div>

            {/* Reply Delay Slider */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Reply Delay: {linkedinSettings.reply_delay_minutes} minutes
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={linkedinSettings.reply_delay_minutes}
                onChange={(e) => updateLinkedInSettings({ reply_delay_minutes: parseInt(e.target.value) })}
                disabled={settingsLoading}
                className="w-full md:w-96"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long to wait before replying to new comments (1-30 minutes)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts found</p>
          <p className="text-gray-400 text-sm mt-2">
            Make sure your Facebook and Instagram accounts are properly configured
          </p>
        </div>
      ) : (
        /* Posts Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Platform Badge */}
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
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
                    className="text-gray-500 hover:text-indigo-600"
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
                <p className="text-gray-700 text-sm line-clamp-3 mb-3">
                  {post.message || post.caption || "No caption"}
                </p>

                <p className="text-xs text-gray-500 mb-3">
                  {formatDate(post.created_time)}
                </p>

                {/* Engagement Metrics */}
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <ThumbsUp size={16} className="text-blue-500" />
                    <span>{post.likes || 0}</span>
                  </div>
                  <button
                    onClick={() => openCommentsModal(post)}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-indigo-600"
                  >
                    <MessageCircle size={16} className="text-green-500" />
                    <span>{post.comments || post.comments_count || 0}</span>
                  </button>
                  {(post.platform === "facebook" || post.platform === "linkedin") && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Share2 size={16} className="text-purple-500" />
                      <span>{post.shares || 0}</span>
                    </div>
                  )}
                </div>

                {/* LinkedIn-specific metrics */}
                {post.platform === "linkedin" && (post.impressions || post.clicks) && (
                  <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
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
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} className="text-indigo-600" />
                <h3 className="text-lg font-bold">
                  Comments ({comments.length})
                </h3>
              </div>
              <button
                onClick={closeCommentsModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4">
              {/* Post Preview */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {selectedPost.message || selectedPost.caption || "No caption"}
                </p>
              </div>

              {/* Comments List */}
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-indigo-600" size={30} />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No comments yet</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="bg-white border rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-semibold text-sm text-gray-800">
                          {comment.author}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_time)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">
                        {comment.message}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <ThumbsUp size={12} />
                        <span>{comment.likes || 0}</span>
                      </div>
                      {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                        <div className="mt-3 ml-4 border-l-2 border-gray-100 pl-3">
                          <button
                            onClick={() => toggleReplies(comment.id)}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                          >
                            {expandedReplies[comment.id]
                              ? `Hide Replies (${comment.replies.length})`
                              : `Show Replies (${comment.replies.length})`}
                          </button>
                          {expandedReplies[comment.id] && (
                            <div className="mt-2 space-y-2">
                              {comment.replies.map((reply) => (
                                <div key={reply.id} className="bg-gray-50 border rounded-md p-2">
                                  <div className="flex items-start justify-between mb-1">
                                    <p className="font-semibold text-xs text-gray-800">{reply.author}</p>
                                    <p className="text-[11px] text-gray-500">{formatDate(reply.created_time)}</p>
                                  </div>
                                  <p className="text-xs text-gray-700 mb-1">{reply.message}</p>
                                  <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                    <ThumbsUp size={10} />
                                    <span>{reply.likes || 0}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyDrafts[comment.id] || ""}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [comment.id]: e.target.value }))
                            }
                            placeholder="Write a reply..."
                            className="border rounded px-2 py-1 text-sm flex-1"
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
    </div>
  );
}
