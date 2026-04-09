import React from "react";

export default function SchedulePostModal({
  open,
  scheduleModal,
  connectedAccounts,
  scheduleStatus,
  onChangeDate,
  onTogglePlatform,
  onSubmit,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-[1.6rem] border border-white/10 bg-slate-950/95 p-6 text-slate-100 shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
        <h3 className="mb-4 text-lg font-bold text-white">Schedule Post</h3>

        <label className="mb-2 block text-sm font-semibold">Schedule Date & Time:</label>
        <input
          type="datetime-local"
          value={scheduleModal.scheduledAt}
          onChange={(e) => onChangeDate(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-100"
        />

        <label className="mb-2 block text-sm font-semibold">Select Platforms:</label>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={scheduleModal.platforms.includes("facebook")}
              disabled={!connectedAccounts.facebook?.connected}
              onChange={() => onTogglePlatform("facebook")}
            />
            Facebook Page
            {!connectedAccounts.facebook?.connected && <span className="text-xs text-slate-500">(connect)</span>}
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={scheduleModal.platforms.includes("instagram")}
              disabled={!connectedAccounts.instagram?.connected}
              onChange={() => onTogglePlatform("instagram")}
            />
            Instagram
            {!connectedAccounts.instagram?.connected && <span className="text-xs text-slate-500">(connect)</span>}
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={scheduleModal.platforms.includes("linkedin-personal")}
              disabled={!connectedAccounts.linkedin_personal?.connected}
              onChange={() => onTogglePlatform("linkedin-personal")}
            />
            LinkedIn Personal
            {!connectedAccounts.linkedin_personal?.connected && <span className="text-xs text-slate-500">(connect)</span>}
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={scheduleModal.platforms.includes("linkedin-company")}
              disabled={!connectedAccounts.linkedin_company?.connected}
              onChange={() => onTogglePlatform("linkedin-company")}
            />
            LinkedIn Company
            {!connectedAccounts.linkedin_company?.connected && <span className="text-xs text-slate-500">(connect)</span>}
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSubmit}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-white disabled:opacity-60"
            disabled={scheduleStatus[scheduleModal.postId]?.loading}
          >
            {scheduleStatus[scheduleModal.postId]?.loading ? "Scheduling..." : "Schedule"}
          </button>
          <button onClick={onCancel} className="flex-1 rounded-xl border border-white/15 bg-slate-700/80 px-4 py-2 text-white">
            Cancel
          </button>
        </div>

        {scheduleStatus[scheduleModal.postId]?.message && (
          <p className="mt-2 text-center text-xs text-slate-400">{scheduleStatus[scheduleModal.postId].message}</p>
        )}
      </div>
    </div>
  );
}
