import React, { useCallback, useEffect, useState } from "react";
import { Facebook, Instagram, Loader2, MessageCircle, Sparkles } from "lucide-react";

export default function CommentAnalysis() {
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [filter, setFilter] = useState("all");
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

  const fetchComments = async (post) => {
    if (!post?.id || !post?.platform) return;

    setSelectedPost(post);
    setLoadingComments(true);
    setComments([]);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/analytics/comments/${post.id}?platform=${post.platform}&include_analysis=true`,
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

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Comment Analysis</h1>
          <p className="text-sm text-gray-500 mt-1">Analyze sentiment and emotions for Facebook and Instagram comments.</p>
        </div>
        <div className="flex gap-2 border rounded-lg p-1 bg-white">
          {["all", "facebook", "instagram"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-sm rounded-md capitalize ${
                filter === tab ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-yellow-200 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Posts</h2>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-indigo-600" size={26} />
            </div>
          ) : posts.length === 0 ? (
            <p className="text-sm text-gray-500">No posts available.</p>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => fetchComments(post)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedPost?.id === post.id
                      ? "border-indigo-400 bg-indigo-50"
                      : "border-gray-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {post.platform === "facebook" ? (
                      <Facebook size={14} className="text-blue-600" />
                    ) : (
                      <Instagram size={14} className="text-pink-600" />
                    )}
                    <span className="text-xs font-semibold capitalize text-gray-700">{post.platform}</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{post.message || post.caption || "No caption"}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(post.created_time)}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={18} className="text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">Comments with Analysis</h2>
          </div>

          {!selectedPost ? (
            <p className="text-sm text-gray-500">Select a post to view and analyze comments.</p>
          ) : loadingComments ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="animate-spin text-indigo-600" size={26} />
              <span className="text-sm text-gray-600">Analyzing comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-sm text-gray-500">No comments found for this post.</p>
          ) : (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-800">{comment.author}</p>
                    <p className="text-xs text-gray-500">{formatDate(comment.created_time)}</p>
                  </div>

                  <p className="text-sm text-gray-700 mb-2">{comment.message}</p>

                  {comment.analysis ? (
                    <div className={`rounded-md border p-2 ${sentimentStyle(comment.analysis.sentiment)}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={14} />
                        <span className="text-xs font-semibold capitalize">{comment.analysis.sentiment}</span>
                        <span className="text-xs">Confidence: {Math.round((comment.analysis.confidence || 0) * 100)}%</span>
                      </div>

                      {Array.isArray(comment.analysis.emotions) && comment.analysis.emotions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {comment.analysis.emotions.map((emotion, idx) => (
                            <span key={`${comment.id}_emotion_${idx}`} className="text-[11px] px-2 py-0.5 rounded border border-current/20">
                              {emotion.name} ({Math.round((emotion.score || 0) * 100)}%)
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs">{comment.analysis.summary}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No analysis available.</p>
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
