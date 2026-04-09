import React from "react";

export default function DeletePostConfirmModal({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-6 text-slate-100 shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
        <h3 className="text-lg font-bold text-white">Delete Post</h3>
        <p className="mt-2 text-sm text-slate-300">
          This action cannot be undone. Are you sure you want to delete this post?
        </p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 rounded bg-rose-600 px-4 py-2 text-white hover:bg-rose-500"
          >
            Yes, Delete
          </button>
          <button
            onClick={onCancel}
            className="flex-1 rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
