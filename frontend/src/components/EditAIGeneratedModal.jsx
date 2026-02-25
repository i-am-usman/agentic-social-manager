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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-800">Edit AI-Generated Content</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Caption/Content */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">Caption</label>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              placeholder="Edit the AI-generated caption..."
              className="w-full p-3 border rounded-lg h-40"
            />
            <p className="text-xs text-gray-500 mt-1">{editedContent.length} characters</p>
          </div>

          {/* Hashtags */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">Hashtags</label>
            
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
                className="flex-1 p-2 border rounded-lg text-sm"
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
                    className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleRemoveHashtag(tag)}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm italic">No hashtags added yet</p>
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="font-semibold text-gray-800 mb-2">Preview</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{editedContent}</p>
            {editedHashtags.length > 0 && (
              <p className="text-gray-600 text-sm mt-2">{editedHashtags.join(" ")}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t sticky bottom-0 bg-white justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 border rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
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
