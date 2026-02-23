import React, { useState, useEffect } from "react";

export default function Profile() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState({});
  const [publishStatus, setPublishStatus] = useState({});
  const [filterStatus, setFilterStatus] = useState("all");
  const [scheduleModal, setScheduleModal] = useState({ open: false, postId: null, scheduledAt: "", platforms: [] });
  const [scheduleStatus, setScheduleStatus] = useState({});
  const [editModal, setEditModal] = useState({ open: false, postId: null, caption: "", hashtags: "", image: "", platforms: [] });
  const [editStatus, setEditStatus] = useState({});
  const [deleteStatus, setDeleteStatus] = useState({});
  const [connectedAccounts, setConnectedAccounts] = useState({
    facebook: { connected: false },
    instagram: { connected: false },
  });

  // ✅ Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      const res = await fetch("http://127.0.0.1:8000/profile/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setBio(data.bio || "");
        setInterests((data.interests || []).join(", "));
      } else {
        console.warn("Failed to fetch profile");
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch("http://127.0.0.1:8000/accounts/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConnectedAccounts(data.accounts || connectedAccounts);
        }
      } catch (err) {
        console.warn("Failed to fetch connected accounts");
      }
    };

    fetchAccounts();
  }, []);

  // Fetch user's saved posts
  const fetchPosts = async () => {
    const token = localStorage.getItem("token");
    setLoadingPosts(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/posts/user-posts", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      } else {
        console.warn("Failed to fetch user posts");
      }
    } catch (err) {
      console.error("Error fetching posts:", err);
    }
    setLoadingPosts(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const togglePlatform = (postId, platform) => {
    setSelectedPlatforms((prev) => {
      const current = prev[postId] || [];
      const next = current.includes(platform)
        ? current.filter((p) => p !== platform)
        : [...current, platform];
      return { ...prev, [postId]: next };
    });
  };

  const handlePublish = async (postId) => {
    const platforms = selectedPlatforms[postId] || [];
    if (platforms.length === 0) {
      alert("Please select at least one platform.");
      return;
    }

    const missing = platforms.filter((platform) => !connectedAccounts[platform]?.connected);
    if (missing.length > 0) {
      alert("Please connect your social accounts before publishing.");
      return;
    }

    const token = localStorage.getItem("token");
    setPublishStatus((prev) => ({
      ...prev,
      [postId]: { loading: true, message: "Publishing..." },
    }));

    try {
      const res = await fetch("http://127.0.0.1:8000/posts/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ post_id: postId, platforms }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setPublishStatus((prev) => ({
          ...prev,
          [postId]: { loading: false, message: "Published successfully." },
        }));
        fetchPosts();
      } else {
        setPublishStatus((prev) => ({
          ...prev,
          [postId]: {
            loading: false,
            message: data.detail || "Publish failed.",
          },
        }));
      }
    } catch (err) {
      setPublishStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Publish failed." },
      }));
    }
  };

  const handleCancelSchedule = async (postId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`http://127.0.0.1:8000/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scheduled_at: null }),
      });

      if (res.ok) {
        alert("Schedule cancelled successfully");
        fetchPosts();
      } else {
        alert("Failed to cancel schedule");
      }
    } catch (err) {
      alert("Failed to cancel schedule");
    }
  };

  // Helper: Convert Pakistani time ISO string to datetime-local format
  const toLocalInputValue = (dateString) => {
    if (!dateString) return "";
    // Backend sends "2026-02-19T23:57:00" (Pakistani time without offset)
    // datetime-local input needs "2026-02-19T23:57" format
    // Just extract the date and time portion (first 16 characters)
    return dateString.substring(0, 16);
  };

  // Helper: Convert datetime-local string to ISO format
  const toPakistaniTime = (localDateTimeString) => {
    if (!localDateTimeString) return null;
    // Datetime-local gives us "2026-02-19T23:57" (timezone-naive)
    // Backend will treat this as Pakistani time, so just append seconds
    return localDateTimeString + ":00";
  };

  const openScheduleModal = (postId, existingScheduledAt = null, existingPlatforms = []) => {
    setScheduleModal({
      open: true,
      postId,
      scheduledAt: existingScheduledAt ? toLocalInputValue(existingScheduledAt) : "",
      platforms: existingPlatforms || [],
    });
  };

  const closeScheduleModal = () => {
    setScheduleModal({ open: false, postId: null, scheduledAt: "", platforms: [] });
  };

  const handleScheduleSubmit = async () => {
    const { postId, scheduledAt, platforms } = scheduleModal;
    
    if (!scheduledAt) {
      alert("Please select a date and time.");
      return;
    }
    
    if (platforms.length === 0) {
      alert("Please select at least one platform.");
      return;
    }

    const token = localStorage.getItem("token");
    setScheduleStatus((prev) => ({ ...prev, [postId]: { loading: true, message: "Scheduling..." } }));

    try {
      const res = await fetch(`http://127.0.0.1:8000/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scheduled_at: toPakistaniTime(scheduledAt),
          platforms,
        }),
      });

      if (res.ok) {
        setScheduleStatus((prev) => ({
          ...prev,
          [postId]: { loading: false, message: "Scheduled successfully." },
        }));
        closeScheduleModal();
        fetchPosts();
      } else {
        setScheduleStatus((prev) => ({
          ...prev,
          [postId]: { loading: false, message: "Failed to schedule." },
        }));
      }
    } catch (err) {
      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Failed to schedule." },
      }));
    }
  };

  const openEditModal = (post) => {
    setEditModal({
      open: true,
      postId: post._id,
      caption: post.caption || "",
      hashtags: post.hashtags ? post.hashtags.join(" ") : "",
      image: post.image || "",
      platforms: post.platforms || [],
    });
  };

  const closeEditModal = () => {
    setEditModal({ open: false, postId: null, caption: "", hashtags: "", image: "", platforms: [] });
    setEditStatus({});
  };

  const handleEditSubmit = async () => {
    const { postId, caption, hashtags, image, platforms } = editModal;
    
    if (!caption.trim()) {
      alert("Please provide a caption.");
      return;
    }

    // Validate Instagram requires an image
    if (platforms.includes("instagram") && !image) {
      alert("Instagram requires an image. Please add an image.");
      return;
    }

    const token = localStorage.getItem("token");
    setEditStatus({ loading: true, message: "Updating post..." });

    try {
      // Build request body with only changed fields
      const requestBody = {
        caption,
        hashtags: hashtags.trim() ? hashtags.split(/\s+/).filter(tag => tag) : [],
      };
      
      if (image) {
        requestBody.image = image;
      }

      const res = await fetch(`http://127.0.0.1:8000/posts/${postId}/edit`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setEditStatus({ loading: false, message: "Post updated successfully!" });
        setTimeout(() => {
          closeEditModal();
          fetchPosts();
        }, 1000);
      } else {
        setEditStatus({ loading: false, message: data.detail || "Failed to update post." });
      }
    } catch (err) {
      setEditStatus({ loading: false, message: "Failed to update post." });
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }

    const token = localStorage.getItem("token");
    setDeleteStatus((prev) => ({ ...prev, [postId]: { loading: true } }));

    try {
      const res = await fetch(`http://127.0.0.1:8000/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setDeleteStatus((prev) => ({ ...prev, [postId]: { loading: false, message: "Deleted successfully!" } }));
        fetchPosts();
      } else {
        setDeleteStatus((prev) => ({ ...prev, [postId]: { loading: false, message: data.detail || "Failed to delete." } }));
      }
    } catch (err) {
      setDeleteStatus((prev) => ({ ...prev, [postId]: { loading: false, message: "Failed to delete." } }));
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditModal(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const filteredPosts = posts.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  // Helper: Format Pakistani time for display without timezone conversion
  const formatPakistaniTime = (dateString) => {
    if (!dateString) return "";
    
    // Handle different date formats from backend
    let isoString = dateString;
    
    // If it's a plain object with $date, extract the ISO string
    if (typeof dateString === 'object' && dateString.$date) {
      isoString = dateString.$date;
    }
    
    // If dateString is actually a Date object, convert to ISO
    if (dateString instanceof Date) {
      isoString = dateString.toISOString();
    }
    
    // Extract the date and time without timezone conversion
    // Backend sends "2026-02-19T17:52:00" (already in Pakistani time)
    const parts = isoString.substring(0, 19).split('T');
    const datePart = parts[0]; // "2026-02-19"
    const timePart = parts[1]; // "17:52:00"
    
    // Format date as DD/MM/YYYY
    const [year, month, day] = datePart.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    
    // Format time as 12-hour with am/pm
    const [hours, minutes, seconds] = timePart.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 % 12 || 12;
    const ampm = hour24 >= 12 ? 'pm' : 'am';
    const formattedTime = `${hour12}:${minutes}:${seconds} ${ampm}`;
    
    return `${formattedDate}, ${formattedTime}`;
  };

  const formatScheduledTime = (scheduledAt) => {
    if (!scheduledAt) return null;
    const date = new Date(scheduledAt);
    const now = new Date();
    const diff = date - now;
    
    if (diff < 0) return "Past due";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      return `in ${Math.floor(hours / 24)} days`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  const renderPlatformResults = (results) => {
    if (!results || typeof results !== "object") return null;
    const entries = Object.entries(results);
    if (entries.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {entries.map(([platform, result]) => {
          const ok = result?.status === "success";
          const label = ok ? "Published" : "Failed";
          const color = ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
          return (
            <span
              key={platform}
              className={`text-xs px-2 py-1 rounded ${color}`}
            >
              {platform}: {label}
            </span>
          );
        })}
      </div>
    );
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch("http://127.0.0.1:8000/profile/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        bio,
        interests: interests.split(",").map(i => i.trim()),
      }),
    });

    const data = await res.json();
    alert(data.message || "Profile saved!");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <textarea
        placeholder="Bio"
        value={bio}
        onChange={e => setBio(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <input
        type="text"
        placeholder="Interests (comma separated)"
        value={interests}
        onChange={e => setInterests(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <button
        onClick={handleSaveProfile}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Save Profile
      </button>
      {/* Saved Content Section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Your Saved Content</h2>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 border-b">
          {["all", "draft", "scheduled", "published"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 text-sm font-semibold capitalize ${
                filterStatus === status
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-600 hover:text-indigo-600"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {loadingPosts ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading saved content...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <p className="text-gray-500">No {filterStatus === "all" ? "" : filterStatus} posts found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPosts.map((p) => (
              <div key={p._id} className="border rounded-lg p-4 bg-white shadow-sm">
                {p.image && (
                  <img src={p.image} alt="post" className="w-full h-40 object-cover rounded mb-3" />
                )}
                <p className="text-gray-700 mb-2">{p.caption}</p>
                {p.hashtags && Array.isArray(p.hashtags) && (
                  <p className="text-indigo-600 mb-2">{p.hashtags.join(' ')}</p>
                )}
                {renderPlatformResults(p.platform_results)}
                
                {/* Scheduled Info */}
                {p.status === "scheduled" && p.scheduled_at && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-sm">
                    <p className="text-yellow-800 font-semibold">
                      ⏰ Scheduled {formatScheduledTime(p.scheduled_at)}
                    </p>
                    <p className="text-yellow-600 text-xs">
                      {formatPakistaniTime(p.scheduled_at)}
                    </p>
                    {p.platforms && p.platforms.length > 0 && (
                      <p className="text-yellow-600 text-xs mt-1">
                        Platforms: {p.platforms.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Publish Controls - Only for draft posts */}
                {p.status === "draft" && (
                  <div className="border-t pt-3 mt-3">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Publish to:</p>
                    <div className="flex items-center gap-4 mb-3">
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={(selectedPlatforms[p._id] || []).includes("facebook")}
                          disabled={!connectedAccounts.facebook?.connected}
                          onChange={() => togglePlatform(p._id, "facebook")}
                        />
                        Facebook Page
                        {!connectedAccounts.facebook?.connected && (
                          <span className="text-xs text-gray-400">(connect)</span>
                        )}
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={(selectedPlatforms[p._id] || []).includes("instagram")}
                          disabled={!connectedAccounts.instagram?.connected}
                          onChange={() => togglePlatform(p._id, "instagram")}
                        />
                        Instagram
                        {!connectedAccounts.instagram?.connected && (
                          <span className="text-xs text-gray-400">(connect)</span>
                        )}
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePublish(p._id)}
                        className="bg-indigo-600 text-white px-3 py-2 rounded text-sm disabled:opacity-60"
                        disabled={publishStatus[p._id]?.loading}
                      >
                        {publishStatus[p._id]?.loading ? "Publishing..." : "Publish Now"}
                      </button>
                      <button
                        onClick={() => openScheduleModal(p._id)}
                        className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700"
                      >
                        Schedule Post
                      </button>
                    </div>
                    {publishStatus[p._id]?.message && (
                      <p className="text-xs text-gray-600 mt-2">{publishStatus[p._id].message}</p>
                    )}
                  </div>
                )}

                {/* Cancel Schedule Button - Only for scheduled posts */}
                {p.status === "scheduled" && (
                  <div className="border-t pt-3 mt-3 flex gap-2">
                    <button
                      onClick={() => openScheduleModal(p._id, p.scheduled_at, p.platforms)}
                      className="bg-amber-500 text-white px-3 py-2 rounded text-sm hover:bg-amber-600"
                    >
                      Edit Schedule
                    </button>
                    <button
                      onClick={() => handleCancelSchedule(p._id)}
                      className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600"
                    >
                      Cancel Schedule
                    </button>
                  </div>
                )}

                {/* Edit and Delete Buttons - For all posts except published */}
                {p.status !== "published" && (
                  <div className="border-t pt-3 mt-3 flex gap-2">
                    <button
                      onClick={() => openEditModal(p)}
                      className="bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 flex-1"
                    >
                      Edit Post
                    </button>
                    <button
                      onClick={() => handleDeletePost(p._id)}
                      className="bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 disabled:opacity-60"
                      disabled={deleteStatus[p._id]?.loading}
                    >
                      {deleteStatus[p._id]?.loading ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mt-3">
                  <span className="font-semibold capitalize">{p.status || 'draft'}</span>
                  <span>{p.created_at ? formatPakistaniTime(p.created_at) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {scheduleModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Schedule Post</h3>
            
            <label className="block text-sm font-semibold mb-2">
              Schedule Date & Time:
            </label>
            <input
              type="datetime-local"
              value={scheduleModal.scheduledAt}
              onChange={(e) => setScheduleModal(prev => ({ ...prev, scheduledAt: e.target.value }))}
              className="border p-2 w-full mb-4 rounded"
            />

            <label className="block text-sm font-semibold mb-2">Select Platforms:</label>
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scheduleModal.platforms.includes("facebook")}
                  disabled={!connectedAccounts.facebook?.connected}
                  onChange={() => {
                    const updated = scheduleModal.platforms.includes("facebook")
                      ? scheduleModal.platforms.filter(p => p !== "facebook")
                      : [...scheduleModal.platforms, "facebook"];
                    setScheduleModal(prev => ({ ...prev, platforms: updated }));
                  }}
                />
                Facebook Page
                {!connectedAccounts.facebook?.connected && (
                  <span className="text-xs text-gray-400">(connect)</span>
                )}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scheduleModal.platforms.includes("instagram")}
                  disabled={!connectedAccounts.instagram?.connected}
                  onChange={() => {
                    const updated = scheduleModal.platforms.includes("instagram")
                      ? scheduleModal.platforms.filter(p => p !== "instagram")
                      : [...scheduleModal.platforms, "instagram"];
                    setScheduleModal(prev => ({ ...prev, platforms: updated }));
                  }}
                />
                Instagram
                {!connectedAccounts.instagram?.connected && (
                  <span className="text-xs text-gray-400">(connect)</span>
                )}
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleScheduleSubmit}
                className="bg-indigo-600 text-white px-4 py-2 rounded flex-1 disabled:opacity-60"
                disabled={scheduleStatus[scheduleModal.postId]?.loading}
              >
                {scheduleStatus[scheduleModal.postId]?.loading ? "Scheduling..." : "Schedule"}
              </button>
              <button
                onClick={closeScheduleModal}
                className="bg-gray-500 text-white px-4 py-2 rounded flex-1"
              >
                Cancel
              </button>
            </div>
            {scheduleStatus[scheduleModal.postId]?.message && (
              <p className="text-xs text-gray-600 mt-2 text-center">{scheduleStatus[scheduleModal.postId].message}</p>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Edit Post</h3>
            
            <label className="block text-sm font-semibold mb-2">
              Caption:
            </label>
            <textarea
              value={editModal.caption}
              onChange={(e) => setEditModal(prev => ({ ...prev, caption: e.target.value }))}
              className="border p-2 w-full mb-4 rounded h-32 resize-none"
              placeholder="Enter post caption..."
            />

            <label className="block text-sm font-semibold mb-2">
              Hashtags (space separated):
            </label>
            <input
              type="text"
              value={editModal.hashtags}
              onChange={(e) => setEditModal(prev => ({ ...prev, hashtags: e.target.value }))}
              className="border p-2 w-full mb-4 rounded"
              placeholder="#hashtag1 #hashtag2"
            />

            <label className="block text-sm font-semibold mb-2">
              Image:
            </label>
            {editModal.platforms.includes("instagram") && editModal.image && (
              <div className="bg-blue-50 border border-blue-300 rounded p-2 mb-2 text-xs text-blue-800">
                ℹ️ File uploads will be automatically converted to public URLs for Instagram
              </div>
            )}
            {editModal.image && (
              <div className="mb-2">
                <img src={editModal.image} alt="preview" className="w-full h-40 object-cover rounded mb-1" />
                <p className="text-xs text-gray-600">
                  {editModal.image.startsWith('data:') ? '📁 Uploaded file (auto-converted)' : '🔗 URL (direct)'}
                </p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="border p-2 w-full mb-2 rounded text-sm"
            />
            <p className="text-xs text-gray-500 mb-2">File uploads will be converted to public URLs for Instagram</p>
            <input
              type="text"
              value={editModal.image.startsWith('data:') ? '' : editModal.image}
              onChange={(e) => setEditModal(prev => ({ ...prev, image: e.target.value }))}
              className="border p-2 w-full mb-4 rounded text-sm"
              placeholder="Or paste image URL (works with both platforms)"
            />

            <div className="flex gap-2">
              <button
                onClick={handleEditSubmit}
                className="bg-indigo-600 text-white px-4 py-2 rounded flex-1 disabled:opacity-60"
                disabled={editStatus.loading}
              >
                {editStatus.loading ? "Updating..." : "Update Post"}
              </button>
              <button
                onClick={closeEditModal}
                className="bg-gray-500 text-white px-4 py-2 rounded flex-1"
              >
                Cancel
              </button>
            </div>
            {editStatus.message && (
              <p className={`text-xs mt-2 text-center ${editStatus.message.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {editStatus.message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}