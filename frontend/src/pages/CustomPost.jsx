import React, { useState, useEffect } from "react";
import { Loader2, Upload, X, Save } from "lucide-react";
import ProgressModal from "../components/ProgressModal";

export default function CustomPost() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaItems, setMediaItems] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [publishJobId, setPublishJobId] = useState(null);
  const [showProgress, setShowProgress] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState({
    facebook: { connected: false },
    instagram: { connected: false },
    linkedin_personal: { connected: false },
    linkedin_company: { connected: false },
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/accounts/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setConnectedAccounts(data.accounts || {
            facebook: { connected: false },
            instagram: { connected: false },
            linkedin_personal: { connected: false },
            linkedin_company: { connected: false },
          });
        }
      } catch (err) {
        console.warn("Failed to fetch connected accounts");
      }
    };

    if (token) {
      fetchAccounts();
    }
  }, [token]);  // ✅ Removed connectedAccounts to prevent infinite loop

  const toPakistaniTime = (localDateTimeString) => {
    if (!localDateTimeString) return null;
    return localDateTimeString + ":00";
  };

  const getFileValidation = (file) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const maxImageSize = 8 * 1024 * 1024;
    const maxVideoSize = 500 * 1024 * 1024;

    if (!isImage && !isVideo) {
      return { valid: false, error: "Only images and videos are supported" };
    }

    if (isImage && file.size > maxImageSize) {
      return { valid: false, error: "Image size exceeds 8MB limit" };
    }

    if (isVideo && file.size > maxVideoSize) {
      return { valid: false, error: "Video size exceeds 500MB limit" };
    }

    return { valid: true };
  };

  const handleMediaFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (mediaItems.length + files.length > 10) {
      alert("Maximum 10 media items per post");
      return;
    }

    for (const file of files) {
      const validation = getFileValidation(file);
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error}`);
        return;
      }
    }

    setUploadingMedia(true);

    try {
      const newMediaItems = [];

      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const isVideo = file.type.startsWith("video/");

        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64data = reader.result;
            const mediaId = `media_${Date.now()}_${idx}`;

            newMediaItems.push({
              id: mediaId,
              type: isVideo ? "video" : "image",
              file: file,
              preview: base64data,
              order: mediaItems.length + idx,
              name: file.name,
            });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }

      setMediaItems((prev) => [...prev, ...newMediaItems]);
      e.target.value = "";
    } catch (err) {
      alert(`Error processing files: ${err.message}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  const deleteMediaItem = (mediaId) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== mediaId));
  };

  const moveMediaItem = (mediaId, direction) => {
    const idx = mediaItems.findIndex((item) => item.id === mediaId);
    if (idx === -1) return;

    if (direction === "up" && idx > 0) {
      const newItems = [...mediaItems];
      [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
      newItems.forEach((item, i) => {
        item.order = i;
      });
      setMediaItems(newItems);
    } else if (direction === "down" && idx < mediaItems.length - 1) {
      const newItems = [...mediaItems];
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      newItems.forEach((item, i) => {
        item.order = i;
      });
      setMediaItems(newItems);
    }
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const getAccountKey = (platform) => platform.replace(/-/g, "_");

  const handleSavePost = async () => {
    if (!title.trim() && !content.trim()) {
      alert("Please enter a title or content");
      return;
    }

    if (scheduledAt && selectedPlatforms.length === 0) {
      alert("Please select at least one platform for scheduled posts");
      return;
    }

    const missing = selectedPlatforms.filter((platform) => {
      const key = getAccountKey(platform);
      return !connectedAccounts[key]?.connected;
    });
    if (missing.length > 0) {
      alert("Please connect your social accounts before scheduling");
      return;
    }

    if (selectedPlatforms.includes("instagram") && mediaItems.length === 0) {
      alert("Instagram requires images or videos");
      return;
    }

    setSaving(true);

    try {
      const media = mediaItems.map((item) => ({
        type: item.type,
        url: item.preview,
        order: item.order,
      }));

      const res = await fetch("http://127.0.0.1:8000/content/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: title,
          language: "english",
          caption: content,
          hashtags: hashtags
            .split(" ")
            .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
            .filter((tag) => tag.length > 1),
          media: media.length > 0 ? media : undefined,
          status: "draft",
          scheduled_at: toPakistaniTime(scheduledAt),
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        alert("Post created successfully! ID: " + data.id);
        // Reset form
        setTitle("");
        setContent("");
        setHashtags("");
        setMediaItems([]);
        setScheduledAt("");
        setSelectedPlatforms([]);
      } else {
        alert("Failed to create post");
      }
    } catch (err) {
      alert("Error creating post: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePostNow = async () => {
    if (!selectedPlatforms || selectedPlatforms.length === 0) {
      alert("Please select at least one platform to post");
      return;
    }

    const missing = selectedPlatforms.filter((platform) => {
      const key = getAccountKey(platform);
      return !connectedAccounts[key]?.connected;
    });
    if (missing.length > 0) {
      alert(`Please connect your ${missing.join(" and ")} account(s) before posting`);
      return;
    }

    if (selectedPlatforms.includes("instagram") && mediaItems.length === 0) {
      alert("Instagram requires images or videos");
      return;
    }

    setPosting(true);

    try {
      // Step 1: Save the post
      const media = mediaItems.map((item) => ({
        type: item.type,
        url: item.preview,
        order: item.order,
      }));

      const saveRes = await fetch(
        "http://127.0.0.1:8000/content/save",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic: title,
            language: "english",
            caption: content,
            hashtags: hashtags
              .split(" ")
              .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
              .filter((tag) => tag.length > 1),
            media: media.length > 0 ? media : undefined,
            status: "published",
          }),
        }
      );

      const saveData = await saveRes.json();
      if (saveData.status !== "success") {
        alert("Failed to save post");
        setPosting(false);
        return;
      }

      const postId = saveData.id;

      // Step 2: Start publishing job
      const publishRes = await fetch(
        "http://127.0.0.1:8000/posts/publish",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            post_id: postId,
            caption: content,
            hashtags: hashtags
              .split(" ")
              .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
              .filter((tag) => tag.length > 1),
            media: media.length > 0 ? media : undefined,
            platforms: selectedPlatforms,
          }),
        }
      );

      const publishData = await publishRes.json();
      
      // Show progress modal with job ID
      if (publishData.job_id) {
        setPublishJobId(publishData.job_id);
        setShowProgress(true);
        setPosting(false);
      } else {
        // Fallback for old response format
        setPosting(false);
        if (publishData.status === "success") {
          alert(
            `🚀 Post published successfully to ${selectedPlatforms.join(", ")}!`
          );
          // Reset form
          setTitle("");
          setContent("");
          setHashtags("");
          setMediaItems([]);
          setSelectedPlatforms([]);
        } else {
          alert(`❌ Failed to publish: ${publishData.detail || publishData.message}`);
        }
      }
    } catch (err) {
      alert("Error posting: " + err.message);
      setPosting(false);
    }
  };

  const handleProgressComplete = (jobResult) => {
    // Handle completion
    if (jobResult.result?.status === "success" || jobResult.result?.status === "partial") {
      // Reset form on success
      setTitle("");
      setContent("");
      setHashtags("");
      setMediaItems([]);
      setSelectedPlatforms([]);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    setPublishJobId(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">📝 Create Custom Post</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT: Content Editor */}
        <div className="md:col-span-2 space-y-6">
          {/* Title */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">Post Title</label>
            <input
              type="text"
              placeholder="Enter post title (e.g., 'My Amazing Trip')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">Content/Caption</label>
            <textarea
              placeholder="Write your post content here... You can include emojis and multiple paragraphs!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-3 border rounded-lg h-32"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">Hashtags</label>
            <input
              type="text"
              placeholder="Enter hashtags separated by spaces (#travel #photography #adventure)"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className="w-full p-3 border rounded-lg"
            />
          </div>

          {/* Media Upload */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-2">Upload Media</label>
            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-100 mb-2">
              <Upload size={18} className="text-indigo-600" />
              <span className="text-sm text-indigo-600">Click to upload or drag files</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaFileUpload}
                disabled={uploadingMedia}
                className="hidden"
              />
            </label>
            <p className="text-xs text-gray-600">Images ≤8MB | Videos ≤500MB | Max 10 items</p>

            {/* Media Grid */}
            {mediaItems.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {mediaItems.map((item) => (
                  <div key={item.id} className="relative group">
                    {item.type === "image" ? (
                      <img src={item.preview} alt={item.name} className="w-full h-20 object-cover rounded-lg" />
                    ) : (
                      <div className="w-full h-20 bg-gray-300 rounded-lg flex items-center justify-center">
                        <span className="text-xs text-gray-700">🎥 Video</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex gap-1 justify-center items-center opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => moveMediaItem(item.id, "up")}
                        className="bg-gray-500 text-white p-1 rounded text-xs"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveMediaItem(item.id, "down")}
                        className="bg-gray-500 text-white p-1 rounded text-xs"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => deleteMediaItem(item.id)}
                        className="bg-red-600 text-white p-1 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      {item.order + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {uploadingMedia && <p className="text-sm text-indigo-600 mt-2 animate-pulse">Uploading...</p>}
            
            {/* Instagram Carousel Warning */}
            {selectedPlatforms.includes("instagram") && mediaItems.length > 1 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Instagram Carousel Requirements:</p>
                <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                  <li>All images and videos must have the <strong>same aspect ratio</strong></li>
                  <li>Mismatched aspect ratios will cause publishing to fail</li>
                  <li>Tip: Crop/resize your media to match (e.g., all 1:1 square or all 16:9)</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Post Settings */}
        <div className="space-y-6">

          {/* Schedule */}
          <div>
            <label className="block font-semibold text-gray-800 mb-2">Schedule (Optional)</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full p-2 border rounded-lg"
            />
          </div>

          {/* Platforms */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
            <label className="block font-semibold text-gray-800 mb-2 text-sm">Platforms to Post</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("facebook")}
                  disabled={!connectedAccounts.facebook?.connected}
                  onChange={() => togglePlatform("facebook")}
                />
                Facebook {!connectedAccounts.facebook?.connected && <span className="text-xs text-red-600">(not connected)</span>}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("instagram")}
                  disabled={!connectedAccounts.instagram?.connected}
                  onChange={() => togglePlatform("instagram")}
                />
                Instagram {!connectedAccounts.instagram?.connected && <span className="text-xs text-red-600">(not connected)</span>}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("linkedin-personal")}
                  disabled={!connectedAccounts.linkedin_personal?.connected}
                  onChange={() => togglePlatform("linkedin-personal")}
                />
                LinkedIn Personal {!connectedAccounts.linkedin_personal?.connected && <span className="text-xs text-red-600">(not connected)</span>}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("linkedin-company")}
                  disabled={!connectedAccounts.linkedin_company?.connected}
                  onChange={() => togglePlatform("linkedin-company")}
                />
                LinkedIn Company {!connectedAccounts.linkedin_company?.connected && <span className="text-xs text-red-600">(not connected)</span>}
              </label>
            </div>
          </div>

          {/* Instagram Carousel Warning */}
          {selectedPlatforms.includes("instagram") && mediaItems.length > 1 && (
            <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Instagram Carousel Requirements:</p>
              <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                <li>All images and videos must have the <strong>same aspect ratio</strong></li>
                <li>Mismatched aspect ratios will cause publishing to fail</li>
                <li>Tip: Crop/resize your media to match (e.g., all 1:1 square or all 16:9)</li>
              </ul>
            </div>
          )}

          {/* LinkedIn Mixed Media Warning */}
          {selectedPlatforms.includes("linkedin") && mediaItems.length > 0 && (
            (() => {
              const hasImages = mediaItems.some(m => m.type === "image");
              const hasVideos = mediaItems.some(m => m.type === "video");
              if (hasImages && hasVideos) {
                return (
                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ LinkedIn Media Limitation:</p>
                    <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                      <li>LinkedIn doesn't support mixing images and videos in a single post</li>
                      <li>Only images will be published (videos will be omitted)</li>
                    </ul>
                  </div>
                );
              }
              return null;
            })()
          )}

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={handlePostNow}
              disabled={posting || selectedPlatforms.length === 0}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50"
            >
              {posting ? <Loader2 className="animate-spin" size={18} /> : "🚀"}
              {posting ? "Posting..." : "Post Now"}
            </button>
            <button
              onClick={handleSavePost}
              disabled={saving}
              className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {saving ? "Saving..." : "Save as Draft"}
            </button>
          </div>
        </div>
      </div>

      {/* Progress Modal */}
      {showProgress && (
        <ProgressModal
          jobId={publishJobId}
          onComplete={handleProgressComplete}
          onClose={handleProgressClose}
        />
      )}
    </div>
  );
}
