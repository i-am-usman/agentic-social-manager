import React from "react";

export default function EditPostModal({
  open,
  editModal,
  editStatus,
  onChangeField,
  onImageUpload,
  onSubmit,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[1.6rem] border border-white/10 bg-slate-950/95 p-6 text-slate-100 shadow-[0_30px_80px_rgba(2,6,23,0.6)]">
        <h3 className="mb-4 text-lg font-bold text-white">Edit Post</h3>

        <label className="mb-2 block text-sm font-semibold">Caption:</label>
        <textarea
          value={editModal.caption}
          onChange={(e) => onChangeField("caption", e.target.value)}
          className="mb-4 h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-100"
          placeholder="Enter post caption..."
        />

        <label className="mb-2 block text-sm font-semibold">Hashtags (space separated):</label>
        <input
          type="text"
          value={editModal.hashtags}
          onChange={(e) => onChangeField("hashtags", e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-100"
          placeholder="#hashtag1 #hashtag2"
        />

        <label className="mb-2 block text-sm font-semibold">Image:</label>
        {editModal.platforms.includes("instagram") && editModal.image && (
          <div className="mb-2 rounded border border-blue-300/20 bg-blue-500/10 p-2 text-xs text-blue-100">
            File uploads will be automatically converted to public URLs for Instagram
          </div>
        )}

        {editModal.image && (
          <div className="mb-2">
            <img src={editModal.image} alt="preview" className="mb-1 h-40 w-full rounded object-cover" />
            <p className="text-xs text-slate-400">
              {editModal.image.startsWith("data:") ? "Uploaded file (auto-converted)" : "URL (direct)"}
            </p>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          onChange={onImageUpload}
          className="mb-2 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-slate-100"
        />
        <p className="mb-2 text-xs text-slate-500">File uploads will be converted to public URLs for Instagram</p>

        <input
          type="text"
          value={editModal.image.startsWith("data:") ? "" : editModal.image}
          onChange={(e) => onChangeField("image", e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-slate-100"
          placeholder="Or paste image URL (works with both platforms)"
        />

        <div className="flex gap-2">
          <button
            onClick={onSubmit}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-white disabled:opacity-60"
            disabled={editStatus.loading}
          >
            {editStatus.loading ? "Updating..." : "Update Post"}
          </button>
          <button onClick={onCancel} className="flex-1 rounded-xl border border-white/15 bg-slate-700/80 px-4 py-2 text-white">
            Cancel
          </button>
        </div>

        {editStatus.message && (
          <p className={`mt-2 text-center text-xs ${editStatus.message.includes("success") ? "text-green-300" : "text-rose-300"}`}>
            {editStatus.message}
          </p>
        )}
      </div>
    </div>
  );
}
