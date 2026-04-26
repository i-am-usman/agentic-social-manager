import React, { useCallback, useEffect, useMemo, useState } from "react";
import ProfilePostCard from "../components/profile/ProfilePostCard";
import EditPostModal from "../components/profile/EditPostModal";
import SchedulePostModal from "../components/profile/SchedulePostModal";
import DeletePostConfirmModal from "../components/profile/DeletePostConfirmModal";
import SavedContentTabs from "../components/profile/SavedContentTabs";
import { apiUrl } from "../config/api";
import useSessionStorageState from "../hooks/useSessionStorageState";
import { RefreshCw } from "lucide-react";

export default function SavedContent() {
  const [posts, setPosts] = useSessionStorageState("saved-content.posts", []);
  const [filterStatus, setFilterStatus] = useSessionStorageState("saved-content.filterStatus", "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectedAccounts, setConnectedAccounts] = useSessionStorageState("saved-content.connectedAccounts", {
    facebook: { connected: false },
    instagram: { connected: false },
    linkedin_personal: { connected: false },
    linkedin_company: { connected: false },
  });
  const [selectedPlatforms, setSelectedPlatforms] = useSessionStorageState("saved-content.selectedPlatforms", {});
  const [publishStatus, setPublishStatus] = useSessionStorageState("saved-content.publishStatus", {});
  const [deleteStatus, setDeleteStatus] = useSessionStorageState("saved-content.deleteStatus", {});
  const [scheduleStatus, setScheduleStatus] = useSessionStorageState("saved-content.scheduleStatus", {});
  const [hasLoadedSavedContent, setHasLoadedSavedContent] = useSessionStorageState("saved-content.hasLoaded", false);
  const [scheduleModal, setScheduleModal] = useSessionStorageState("saved-content.scheduleModal", {
    open: false,
    postId: "",
    scheduledAt: "",
    platforms: [],
  });
  const [editModal, setEditModal] = useSessionStorageState("saved-content.editModal", {
    open: false,
    postId: "",
    caption: "",
    hashtags: "",
    image: "",
    platforms: [],
  });
  const [editStatus, setEditStatus] = useSessionStorageState("saved-content.editStatus", { loading: false, message: "" });
  const [deleteConfirm, setDeleteConfirm] = useSessionStorageState("saved-content.deleteConfirm", { open: false, postId: "" });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchConnectedAccounts = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/accounts/me"), {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setConnectedAccounts(
        data.accounts || {
          facebook: { connected: false },
          instagram: { connected: false },
          linkedin_personal: { connected: false },
          linkedin_company: { connected: false },
        }
      );
    } catch (_err) {
      // Keep defaults on failure.
    }
  }, [setConnectedAccounts]);

  const fetchSavedPosts = useCallback(async (options = {}) => {
    const background = Boolean(options.background);
    if (!background) {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetch(apiUrl("/posts/user-posts"), {
        method: "GET",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.detail || "Failed to load saved content.");
        setPosts([]);
        return;
      }

      const normalizedPosts = Array.isArray(data?.posts) ? data.posts : [];
      setPosts(normalizedPosts);
      setHasLoadedSavedContent(true);

      const platformSelection = {};
      normalizedPosts.forEach((post) => {
        platformSelection[post._id] = Array.isArray(post.platforms) ? post.platforms : [];
      });
      setSelectedPlatforms(platformSelection);
    } catch (_fetchError) {
      setError("Failed to load saved content.");
      setPosts([]);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [setHasLoadedSavedContent, setPosts, setSelectedPlatforms]);

  useEffect(() => {
    if (hasLoadedSavedContent) {
      setLoading(false);
      fetchSavedPosts({ background: true });
    } else {
      fetchSavedPosts();
    }
    fetchConnectedAccounts();
  }, [fetchSavedPosts, fetchConnectedAccounts, hasLoadedSavedContent]);

  const refreshSavedContent = async () => {
    await Promise.all([fetchSavedPosts(), fetchConnectedAccounts()]);
  };

  const filteredPosts = useMemo(() => {
    if (filterStatus === "all") {
      return posts;
    }
    return posts.filter((post) => (post?.status || "draft") === filterStatus);
  }, [posts, filterStatus]);

  const formatPakistaniTime = (isoDate) => {
    if (!isoDate) {
      return "";
    }
    return new Date(isoDate).toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatScheduledTime = (isoDate) => {
    if (!isoDate) {
      return "";
    }
    return new Date(isoDate).toLocaleString("en-PK", {
      timeZone: "Asia/Karachi",
      weekday: "short",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPlatformResults = (platformResults) => {
    if (!platformResults || typeof platformResults !== "object") {
      return null;
    }

    const entries = Object.entries(platformResults);
    if (!entries.length) {
      return null;
    }

    return (
      <div className="mb-2 flex flex-wrap gap-2">
        {entries.map(([platform, result]) => {
          const status = result?.status || "unknown";
          const isSuccess = status === "success";
          return (
            <span
              key={platform}
              className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                isSuccess
                  ? "border border-emerald-300/30 bg-emerald-500/10 text-emerald-200"
                  : "border border-rose-300/30 bg-rose-500/10 text-rose-200"
              }`}
            >
              {platform.replace("-", " ")}: {status}
            </span>
          );
        })}
      </div>
    );
  };

  const togglePlatform = (postId, platform) => {
    setSelectedPlatforms((prev) => {
      const current = prev[postId] || [];
      const exists = current.includes(platform);
      return {
        ...prev,
        [postId]: exists ? current.filter((p) => p !== platform) : [...current, platform],
      };
    });
  };

  const handlePublish = async (postId) => {
    const platforms = selectedPlatforms[postId] || [];
    if (!platforms.length) {
      setPublishStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Select at least one account before publishing." },
      }));
      return;
    }

    setPublishStatus((prev) => ({ ...prev, [postId]: { loading: true, message: "Publishing..." } }));

    try {
      const response = await fetch(apiUrl("/posts/publish"), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ post_id: postId, platforms }),
      });
      const data = await response.json();

      if (!response.ok) {
        setPublishStatus((prev) => ({
          ...prev,
          [postId]: { loading: false, message: data?.detail || "Failed to start publishing." },
        }));
        return;
      }

      setPublishStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Publishing started. Refreshing list..." },
      }));
      fetchSavedPosts();
    } catch (_err) {
      setPublishStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Failed to start publishing." },
      }));
    }
  };

  const openSchedule = (postId, scheduledAt = "", platforms = []) => {
    const formattedDate = scheduledAt ? new Date(scheduledAt).toISOString().slice(0, 16) : "";
    setScheduleModal({
      open: true,
      postId,
      scheduledAt: formattedDate,
      platforms: Array.isArray(platforms) ? platforms : selectedPlatforms[postId] || [],
    });
  };

  const closeSchedule = () => {
    setScheduleModal({ open: false, postId: "", scheduledAt: "", platforms: [] });
  };

  const toggleSchedulePlatform = (platform) => {
    setScheduleModal((prev) => {
      const exists = prev.platforms.includes(platform);
      return {
        ...prev,
        platforms: exists ? prev.platforms.filter((p) => p !== platform) : [...prev.platforms, platform],
      };
    });
  };

  const submitSchedule = async () => {
    const { postId, scheduledAt, platforms } = scheduleModal;
    if (!postId) {
      return;
    }

    setScheduleStatus((prev) => ({ ...prev, [postId]: { loading: true, message: "Saving schedule..." } }));

    const payload = {
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      platforms,
    };

    try {
      const response = await fetch(apiUrl(`/posts/${postId}/schedule`), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setScheduleStatus((prev) => ({
          ...prev,
          [postId]: { loading: false, message: data?.detail || "Failed to update schedule." },
        }));
        return;
      }

      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: data?.message || "Schedule updated." },
      }));
      closeSchedule();
      fetchSavedPosts();
    } catch (_err) {
      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Failed to update schedule." },
      }));
    }
  };

  const cancelSchedule = async (postId) => {
    setScheduleStatus((prev) => ({ ...prev, [postId]: { loading: true, message: "Cancelling schedule..." } }));
    try {
      const response = await fetch(apiUrl(`/posts/${postId}/schedule`), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ scheduled_at: null }),
      });
      const data = await response.json();

      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: {
          loading: false,
          message: response.ok ? data?.message || "Schedule cancelled." : data?.detail || "Failed to cancel schedule.",
        },
      }));
      if (response.ok) {
        fetchSavedPosts();
      }
    } catch (_err) {
      setScheduleStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Failed to cancel schedule." },
      }));
    }
  };

  const openEdit = (post) => {
    setEditModal({
      open: true,
      postId: post._id,
      caption: post.caption || "",
      hashtags: Array.isArray(post.hashtags) ? post.hashtags.join(" ") : "",
      image: post.image || "",
      platforms: Array.isArray(post.platforms) ? post.platforms : [],
    });
    setEditStatus({ loading: false, message: "" });
  };

  const closeEdit = () => {
    setEditModal({ open: false, postId: "", caption: "", hashtags: "", image: "", platforms: [] });
    setEditStatus({ loading: false, message: "" });
  };

  const handleEditField = (field, value) => {
    setEditModal((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditImageUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditModal((prev) => ({ ...prev, image: typeof reader.result === "string" ? reader.result : "" }));
    };
    reader.readAsDataURL(file);
  };

  const submitEdit = async () => {
    if (!editModal.postId) {
      return;
    }

    setEditStatus({ loading: true, message: "Updating post..." });
    const hashtags = editModal.hashtags
      .split(" ")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`));

    try {
      const response = await fetch(apiUrl(`/posts/${editModal.postId}/edit`), {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          caption: editModal.caption,
          hashtags,
          image: editModal.image,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setEditStatus({ loading: false, message: data?.detail || "Failed to update post." });
        return;
      }

      setEditStatus({ loading: false, message: "Post updated successfully." });
      closeEdit();
      fetchSavedPosts();
    } catch (_err) {
      setEditStatus({ loading: false, message: "Failed to update post." });
    }
  };

  const requestDelete = (postId) => {
    setDeleteConfirm({ open: true, postId });
  };

  const cancelDelete = () => {
    setDeleteConfirm({ open: false, postId: "" });
  };

  const confirmDelete = async () => {
    const postId = deleteConfirm.postId;
    if (!postId) {
      return;
    }

    setDeleteStatus((prev) => ({ ...prev, [postId]: { loading: true, message: "Deleting..." } }));

    try {
      const response = await fetch(apiUrl(`/posts/${postId}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await response.json();
      setDeleteStatus((prev) => ({
        ...prev,
        [postId]: {
          loading: false,
          message: response.ok ? data?.message || "Deleted." : data?.detail || "Failed to delete post.",
        },
      }));
      cancelDelete();
      if (response.ok) {
        fetchSavedPosts();
      }
    } catch (_err) {
      setDeleteStatus((prev) => ({
        ...prev,
        [postId]: { loading: false, message: "Failed to delete post." },
      }));
    }
  };

  const getThumbnail = (post) => {
    if (post?.image) {
      return post.image;
    }
    if (Array.isArray(post?.media) && post.media.length > 0) {
      return post.media[0]?.url || "";
    }
    return "";
  };

  return (
    <div className="mx-auto max-w-6xl p-6 text-slate-100">
      <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 px-6 py-6 text-white shadow-[0_30px_80px_rgba(2,6,23,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(45,212,191,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.14),_transparent_26%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">
              Content Library
            </p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Saved Content</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              View and filter all your generated drafts, scheduled items, and published posts.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshSavedContent}
            aria-label="Refresh content"
            title="Refresh content"
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <SavedContentTabs filterStatus={filterStatus} onChange={setFilterStatus} />

      {loading && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          Loading saved content...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-5 text-sm text-rose-200">
          {error}
        </div>
      )}

      {!loading && !error && filteredPosts.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
          No content found for this filter.
        </div>
      )}

      {!loading && !error && filteredPosts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPosts.map((post) => (
            <ProfilePostCard
              key={post._id}
              post={post}
              thumbnail={getThumbnail(post)}
              connectedAccounts={connectedAccounts}
              selectedPlatforms={selectedPlatforms[post._id] || []}
              publishStatus={publishStatus[post._id] || {}}
              deleteStatus={deleteStatus[post._id] || {}}
              scheduleStatus={scheduleStatus[post._id] || {}}
              onTogglePlatform={togglePlatform}
              onPublish={handlePublish}
              onOpenSchedule={openSchedule}
              onCancelSchedule={cancelSchedule}
              onOpenEdit={openEdit}
              onRequestDelete={requestDelete}
              renderPlatformResults={renderPlatformResults}
              formatPakistaniTime={formatPakistaniTime}
              formatScheduledTime={formatScheduledTime}
            />
          ))}
        </div>
      )}

      <SchedulePostModal
        open={scheduleModal.open}
        scheduleModal={scheduleModal}
        connectedAccounts={connectedAccounts}
        scheduleStatus={scheduleStatus}
        onChangeDate={(value) => setScheduleModal((prev) => ({ ...prev, scheduledAt: value }))}
        onTogglePlatform={toggleSchedulePlatform}
        onSubmit={submitSchedule}
        onCancel={closeSchedule}
      />

      <EditPostModal
        open={editModal.open}
        editModal={editModal}
        editStatus={editStatus}
        onChangeField={handleEditField}
        onImageUpload={handleEditImageUpload}
        onSubmit={submitEdit}
        onCancel={closeEdit}
      />

      <DeletePostConfirmModal
        open={deleteConfirm.open}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
