import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

export default function EditAIGeneratedModal({ isOpen, content, hashtags, onSave, onClose }) {
  const [editedContent, setEditedContent] = useState(content || "");
  const [editedHashtags, setEditedHashtags] = useState(hashtags || []);
  const [newHashtag, setNewHashtag] = useState("");

  // Update state when props change (when modal opens with new data)
  useEffect(() => {
    if (isOpen) {
      setEditedContent(content || "");
      setEditedHashtags(hashtags || []);
    }
  }, [isOpen, content, hashtags]);

  const handleAddHashtag = () => {
    if (newHashtag.trim()) {
      const tag = newHashtag.startsWith("#") ? newHashtag : `#${newHashtag}`;
      if (!editedHashtags.includes(tag)) {
        setEditedHashtags([...editedHashtags, tag]);
        setNewHashtag("");
      }
    }
  };

  const handleRemoveHashtag = (tag) => {
    setEditedHashtags(editedHashtags.filter((h) => h !== tag));
  };

  const handleSave = () => {
    onSave({
      content: editedContent,
      hashtags: editedHashtags,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 text-slate-100">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 p-6">
          <h2 className="text-xl font-bold text-white">Edit AI-Generated Content</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Caption/Content */}
          <div>
            <label className="mb-2 block font-semibold text-slate-100">Caption</label>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Edit the AI-generated caption..."
              className="h-40 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-400">{editedContent.length} characters</p>
          </div>

          {/* Hashtags */}
          <div>
            <label className="mb-2 block font-semibold text-slate-100">Hashtags</label>
            
            {/* Add Hashtag */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add hashtag (e.g., #travel)"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHashtag();
                  }
                }}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-slate-100"
              />
              <button
                onClick={handleAddHashtag}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 text-sm"
              >
                Add
              </button>
            </div>

            {/* Hashtag Display */}
            {editedHashtags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {editedHashtags.map((tag, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-full bg-indigo-500/15 px-3 py-1 text-sm text-indigo-200"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveHashtag(tag)}
                      className="text-indigo-300 hover:text-indigo-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic text-slate-400">No hashtags added yet</p>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 font-semibold text-slate-100">Preview</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-200">{editedContent}</p>
            {editedHashtags.length > 0 && (
              <p className="mt-2 text-sm text-slate-300">{editedHashtags.join(" ")}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-white/10 bg-slate-950/95 p-6">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-6 py-2 font-semibold text-slate-200 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-indigo-700"
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
