import React from "react";

export default function ProfilePostCard({
  post,
  thumbnail,
  connectedAccounts,
  selectedPlatforms,
  publishStatus,
  deleteStatus,
  scheduleStatus,
  onTogglePlatform,
  onPublish,
  onOpenSchedule,
  onCancelSchedule,
  onOpenEdit,
  onRequestDelete,
  renderPlatformResults,
  formatPakistaniTime,
  formatScheduledTime,
}) {
  return (
    <div className="group rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/85 to-slate-950/85 p-4 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] transition-all hover:-translate-y-0.5 hover:border-indigo-300/35 hover:shadow-[0_26px_50px_-26px_rgba(79,70,229,0.7)]">
      {thumbnail && (
        <img
          src={thumbnail}
          alt="post"
          className="mb-3 h-40 w-full rounded-2xl object-cover ring-1 ring-white/10"
        />
      )}

      <p className="mb-2 line-clamp-2 text-slate-200">{post.caption}</p>
      {post.hashtags && Array.isArray(post.hashtags) && (
        <p className="mb-2 text-indigo-300">{post.hashtags.join(" ")}</p>
      )}
      {renderPlatformResults(post.platform_results)}

      {post.status === "scheduled" && post.scheduled_at && (
        <div className="mb-3 rounded border border-amber-400/30 bg-amber-500/10 p-2 text-sm">
          <p className="font-semibold text-amber-200">Scheduled {formatScheduledTime(post.scheduled_at)}</p>
          <p className="text-xs text-amber-100/80">{formatPakistaniTime(post.scheduled_at)}</p>
          {post.platforms && post.platforms.length > 0 && (
            <p className="mt-1 text-xs text-amber-100/80">Platforms: {post.platforms.join(", ")}</p>
          )}
        </div>
      )}

      {post.status === "draft" && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="mb-2 text-sm font-semibold text-slate-200">Publish to:</p>
          <div className="mb-3 grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes("facebook")}
                disabled={!connectedAccounts.facebook?.connected}
                onChange={() => onTogglePlatform(post._id, "facebook")}
              />
              Facebook Page
              {!connectedAccounts.facebook?.connected && <span className="text-xs text-slate-500">(connect)</span>}
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes("instagram")}
                disabled={!connectedAccounts.instagram?.connected}
                onChange={() => onTogglePlatform(post._id, "instagram")}
              />
              Instagram
              {!connectedAccounts.instagram?.connected && <span className="text-xs text-slate-500">(connect)</span>}
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes("linkedin-personal")}
                disabled={!connectedAccounts.linkedin_personal?.connected}
                onChange={() => onTogglePlatform(post._id, "linkedin-personal")}
              />
              LinkedIn Personal
              {!connectedAccounts.linkedin_personal?.connected && <span className="text-xs text-slate-500">(connect)</span>}
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={selectedPlatforms.includes("linkedin-company")}
                disabled={!connectedAccounts.linkedin_company?.connected}
                onChange={() => onTogglePlatform(post._id, "linkedin-company")}
              />
              LinkedIn Company
              {!connectedAccounts.linkedin_company?.connected && <span className="text-xs text-slate-500">(connect)</span>}
            </label>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onPublish(post._id)}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-14px_rgba(99,102,241,0.9)] disabled:opacity-60"
              disabled={publishStatus?.loading}
            >
              {publishStatus?.loading ? "Publishing..." : "Publish Now"}
            </button>
            <button
              onClick={() => onOpenSchedule(post._id)}
              className="rounded-xl border border-cyan-300/30 bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Schedule Post
            </button>
          </div>
          {publishStatus?.message && <p className="mt-2 text-xs text-slate-400">{publishStatus.message}</p>}
        </div>
      )}

      {post.status === "scheduled" && (
        <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
          <button
            onClick={() => onOpenSchedule(post._id, post.scheduled_at, post.platforms)}
            className="rounded-xl border border-amber-300/30 bg-amber-500/20 px-3 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/30"
          >
            Edit Schedule
          </button>
          <button
            onClick={() => onCancelSchedule(post._id)}
            className="rounded-xl border border-rose-300/35 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30"
          >
            Cancel Schedule
          </button>
        </div>
      )}

      {post.status !== "published" && (
        <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
          <button
            onClick={() => onOpenEdit(post)}
            className="flex-1 rounded-xl border border-blue-300/35 bg-blue-500/20 px-3 py-2 text-sm font-semibold text-blue-100 transition hover:bg-blue-500/30"
          >
            Edit Post
          </button>
          <button
            onClick={() => onRequestDelete(post._id)}
            className="rounded-xl border border-rose-300/35 bg-rose-500/20 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/30 disabled:opacity-60"
            disabled={deleteStatus?.loading}
          >
            {deleteStatus?.loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}

      {scheduleStatus?.message && post.status === "scheduled" && (
        <p className="mt-2 text-xs text-slate-400">{scheduleStatus.message}</p>
      )}

      <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
        <span className="font-semibold capitalize">{post.status || "draft"}</span>
        <span>{post.created_at ? formatPakistaniTime(post.created_at) : ""}</span>
      </div>
    </div>
  );
}
