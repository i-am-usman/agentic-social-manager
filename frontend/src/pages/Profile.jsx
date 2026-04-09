import React, { useEffect, useState } from "react";
import DeletePostConfirmModal from "../components/profile/DeletePostConfirmModal";
import EditPostModal from "../components/profile/EditPostModal";
import ProfileForm from "../components/profile/ProfileForm";
import ProfilePostCard from "../components/profile/ProfilePostCard";
import SavedContentTabs from "../components/profile/SavedContentTabs";
import SchedulePostModal from "../components/profile/SchedulePostModal";
import { apiUrl } from "../config/api";

export default function Profile() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [profileStatus, setProfileStatus] = useState({ loading: false, message: "", type: "info" });

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
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, postId: null });

  const [connectedAccounts, setConnectedAccounts] = useState({
    facebook: { connected: false },
    instagram: { connected: false },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(apiUrl("/profile/me"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setBio(data.bio || "");
          setInterests((data.interests || []).join(", "));
        }
      } catch (error) {
        setProfileStatus({ loading: false, message: "Failed to fetch profile.", type: "error" });
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(apiUrl("/accounts/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setConnectedAccounts(
            data.accounts || {
              facebook: { connected: false },
              instagram: { connected: false },
            }
          );
        }
      } catch (error) {
        setProfileStatus({ loading: false, message: "Failed to fetch connected accounts.", type: "error" });
      }
    };

    fetchAccounts();
  }, []);

  const fetchPosts = async () => {
    const token = localStorage.getItem("token");
    setLoadingPosts(true);

    try {
      const res = await fetch(apiUrl("/posts/user-posts"), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      setProfileStatus({ loading: false, message: "Error fetching posts.", type: "error" });
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
      setPublishStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Select at least one platform before publishing." },
      }));
      return;
    }

    const missing = platforms.filter((platform) => !connectedAccounts[platform]?.connected);
    if (missing.length > 0) {
      setPublishStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Connect the selected social account(s) before publishing." },
      }));
      return;
    }

    const token = localStorage.getItem("token");
    setPublishStatus((prev) => ({
      ...prev,
      [postId]: { loading: true, message: "Publishing..." },
    }));

    try {
      const res = await fetch(apiUrl("/posts/publish"), {
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
    } catch (error) {
      setPublishStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Publish failed." },
      }));
    }
  };

  const handleCancelSchedule = async (postId) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(apiUrl(`/posts/${postId}/schedule`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ scheduled_at: null }),
      });

      if (res.ok) {
        setScheduleStatus((prev) => ({
          ...prev,
          [postId]: { loading: false, message: "Schedule cancelled successfully." },
        }));
        fetchPosts();
      } else {
        setScheduleStatus((prev) => ({
          ...prev,
          [postId]: { loading: false, message: "Failed to cancel schedule." },
        }));
      }
    } catch (error) {
      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Failed to cancel schedule." },
      }));
    }
  };

  const toLocalInputValue = (dateString) => {
    if (!dateString) return "";
    return dateString.substring(0, 16);
  };

  const toPakistaniTime = (localDateTimeString) => {
    if (!localDateTimeString) return null;
    return `${localDateTimeString}:00`;
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

  const toggleSchedulePlatform = (platform) => {
    setScheduleModal((prev) => {
      const updated = prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];
      return { ...prev, platforms: updated };
    });
  };

  const handleScheduleSubmit = async () => {
    const { postId, scheduledAt, platforms } = scheduleModal;

    if (!scheduledAt) {
      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Select a date and time to schedule this post." },
      }));
      return;
    }

    if (platforms.length === 0) {
      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Select at least one platform for scheduling." },
      }));
      return;
    }

    const token = localStorage.getItem("token");
    setScheduleStatus((prev) => ({ ...prev, [postId]: { loading: true, message: "Scheduling..." } }));

    try {
      const res = await fetch(apiUrl(`/posts/${postId}/schedule`), {
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
    } catch (error) {
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
      setEditStatus({ loading: false, message: "Please provide a caption." });
      return;
    }

    if (platforms.includes("instagram") && !image) {
      setEditStatus({ loading: false, message: "Instagram requires an image. Add an image before saving." });
      return;
    }

    const token = localStorage.getItem("token");
    setEditStatus({ loading: true, message: "Updating post..." });

    try {
      const requestBody = {
        caption,
        hashtags: hashtags.trim() ? hashtags.split(/\s+/).filter((tag) => tag) : [],
      };

      if (image) requestBody.image = image;

      const res = await fetch(apiUrl(`/posts/${postId}/edit`), {
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
    } catch (error) {
      setEditStatus({ loading: false, message: "Failed to update post." });
    }
  };

  const handleDeletePost = async (postId) => {
    const token = localStorage.getItem("token");
    setDeleteStatus((prev) => ({ ...prev, [postId]: { loading: true } }));

    try {
      const res = await fetch(apiUrl(`/posts/${postId}`), {
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
    } catch (error) {
      setDeleteStatus((prev) => ({ ...prev, [postId]: { loading: false, message: "Failed to delete." } }));
    }
  };

  const requestDeletePost = (postId) => {
    setDeleteConfirm({ open: true, postId });
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirm({ open: false, postId: null });
  };

  const confirmDeletePost = async () => {
    if (!deleteConfirm.postId) return;
    await handleDeletePost(deleteConfirm.postId);
    closeDeleteConfirm();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditModal((prev) => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");

    if (!name.trim()) {
      setProfileStatus({ loading: false, message: "Name is required.", type: "error" });
      return;
    }

    if (bio.length > 280) {
      setProfileStatus({ loading: false, message: "Bio must be 280 characters or less.", type: "error" });
      return;
    }

    setProfileStatus({ loading: true, message: "Saving profile...", type: "info" });

    try {
      const res = await fetch(apiUrl("/profile/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          interests: interests
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileStatus({ loading: false, message: data.message || "Profile saved successfully.", type: "success" });
      } else {
        setProfileStatus({ loading: false, message: data.detail || "Failed to save profile.", type: "error" });
      }
    } catch (error) {
      setProfileStatus({ loading: false, message: "Failed to save profile.", type: "error" });
    }
  };

  const formatPakistaniTime = (dateString) => {
    if (!dateString) return "";

    let isoString = dateString;
    if (typeof dateString === "object" && dateString.$date) isoString = dateString.$date;
    if (dateString instanceof Date) isoString = dateString.toISOString();

    const parts = isoString.substring(0, 19).split("T");
    const datePart = parts[0];
    const timePart = parts[1];

    const [year, month, day] = datePart.split("-");
    const formattedDate = `${day}/${month}/${year}`;

    const [hours, minutes, seconds] = timePart.split(":");
    const hour24 = parseInt(hours, 10);
    const hour12 = hour24 % 12 || 12;
    const ampm = hour24 >= 12 ? "pm" : "am";

    return `${formattedDate}, ${hour12}:${minutes}:${seconds} ${ampm}`;
  };

  const formatScheduledTime = (scheduledAt) => {
    if (!scheduledAt) return null;
    const date = new Date(scheduledAt);
    const now = new Date();
    const diff = date - now;

    if (diff < 0) return "Past due";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) return `in ${Math.floor(hours / 24)} days`;
    if (hours > 0) return `in ${hours}h ${minutes}m`;
    return `in ${minutes}m`;
  };

  const renderPlatformResults = (results) => {
    if (!results || typeof results !== "object") return null;
    const entries = Object.entries(results);
    if (entries.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-2">
        {entries.map(([platform, result]) => {
          const ok = result?.status === "success";
          const label = ok ? "Published" : "Failed";
          const color = ok ? "bg-emerald-500/15 text-emerald-200" : "bg-rose-500/15 text-rose-200";
          return (
            <span key={platform} className={`rounded px-2 py-1 text-xs ${color}`}>
              {platform}: {label}
            </span>
          );
        })}
      </div>
    );
  };

  const filteredPosts = posts.filter((post) => {
    if (filterStatus === "all") return true;
    return post.status === filterStatus;
  });

  const totalAccounts = Object.keys(connectedAccounts || {}).length;
  const connectedCount = Object.values(connectedAccounts || {}).filter((account) => account?.connected).length;
  const profileCompletion = [name.trim(), bio.trim(), interests.trim()].filter(Boolean).length * 33;

  return (
    <div className="mx-auto max-w-6xl p-6 text-slate-100">
      <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 px-6 py-6 text-white shadow-[0_30px_80px_rgba(2,6,23,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(45,212,191,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.14),_transparent_26%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative">
          <p className="creator-workspace-label inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">Creator Workspace</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Profile Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Manage your identity, publishing profile, and saved content in one control surface.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
      <ProfileForm
        name={name}
        bio={bio}
        interests={interests}
        profileStatus={profileStatus}
        profileCompletion={profileCompletion}
        connectedCount={connectedCount}
        totalAccounts={totalAccounts}
        savedPosts={posts.length}
        onNameChange={setName}
        onBioChange={setBio}
        onInterestsChange={setInterests}
        onSave={handleSaveProfile}
      />
        </div>

      <section className="rounded-3xl border border-white/10 bg-slate-900/45 p-5 shadow-[0_22px_70px_-46px_rgba(30,41,59,1)] backdrop-blur-xl">
        <h2 className="mb-4 text-xl font-bold text-white">Your Saved Content</h2>
        <SavedContentTabs filterStatus={filterStatus} onChange={setFilterStatus} />

        {loadingPosts ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <span>Loading saved content...</span>
          </div>
        ) : filteredPosts.length === 0 ? (
          <p className="text-slate-400">No {filterStatus === "all" ? "" : filterStatus} posts found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredPosts.map((post) => {
              const thumbnail = post.media && post.media.length > 0 ? post.media[0].url : post.image;
              return (
                <ProfilePostCard
                  key={post._id}
                  post={post}
                  thumbnail={thumbnail}
                  connectedAccounts={connectedAccounts}
                  selectedPlatforms={selectedPlatforms[post._id] || []}
                  publishStatus={publishStatus[post._id]}
                  deleteStatus={deleteStatus[post._id]}
                  scheduleStatus={scheduleStatus[post._id]}
                  onTogglePlatform={togglePlatform}
                  onPublish={handlePublish}
                  onOpenSchedule={openScheduleModal}
                  onCancelSchedule={handleCancelSchedule}
                  onOpenEdit={openEditModal}
                  onRequestDelete={requestDeletePost}
                  renderPlatformResults={renderPlatformResults}
                  formatPakistaniTime={formatPakistaniTime}
                  formatScheduledTime={formatScheduledTime}
                />
              );
            })}
          </div>
        )}
      </section>
      </div>

      <SchedulePostModal
        open={scheduleModal.open}
        scheduleModal={scheduleModal}
        connectedAccounts={connectedAccounts}
        scheduleStatus={scheduleStatus}
        onChangeDate={(value) => setScheduleModal((prev) => ({ ...prev, scheduledAt: value }))}
        onTogglePlatform={toggleSchedulePlatform}
        onSubmit={handleScheduleSubmit}
        onCancel={closeScheduleModal}
      />

      <EditPostModal
        open={editModal.open}
        editModal={editModal}
        editStatus={editStatus}
        onChangeField={(field, value) => setEditModal((prev) => ({ ...prev, [field]: value }))}
        onImageUpload={handleImageUpload}
        onSubmit={handleEditSubmit}
        onCancel={closeEditModal}
      />

      <DeletePostConfirmModal
        open={deleteConfirm.open}
        onConfirm={confirmDeletePost}
        onCancel={closeDeleteConfirm}
      />
    </div>
  );
}
