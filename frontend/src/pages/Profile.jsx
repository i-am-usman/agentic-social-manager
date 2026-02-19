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
                          onChange={() => togglePlatform(p._id, "facebook")}
                        />
                        Facebook Page
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={(selectedPlatforms[p._id] || []).includes("instagram")}
                          onChange={() => togglePlatform(p._id, "instagram")}
                        />
                        Instagram
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
                  onChange={() => {
                    const updated = scheduleModal.platforms.includes("facebook")
                      ? scheduleModal.platforms.filter(p => p !== "facebook")
                      : [...scheduleModal.platforms, "facebook"];
                    setScheduleModal(prev => ({ ...prev, platforms: updated }));
                  }}
                />
                Facebook Page
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scheduleModal.platforms.includes("instagram")}
                  onChange={() => {
                    const updated = scheduleModal.platforms.includes("instagram")
                      ? scheduleModal.platforms.filter(p => p !== "instagram")
                      : [...scheduleModal.platforms, "instagram"];
                    setScheduleModal(prev => ({ ...prev, platforms: updated }));
                  }}
                />
                Instagram
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
    </div>
  );
}