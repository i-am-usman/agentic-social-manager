import React, { useState } from "react";
import { Loader2, Image as ImageIcon, Wand2, Sparkles } from "lucide-react";

export default function Generate() {
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState([]);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [language, setLanguage] = useState("english");
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState("pending");
  const [scheduledAt, setScheduledAt] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  const token = localStorage.getItem("token"); // ✅ get JWT

  // Helper: Convert datetime-local string to ISO format
  const toPakistaniTime = (localDateTimeString) => {
    if (!localDateTimeString) return null;
    // Datetime-local gives us "2026-02-19T23:57" (timezone-naive)
    // Backend will treat this as Pakistani time, so just append seconds
    return localDateTimeString + ":00";
  };

  // Helper: remove appended translation block (e.g. "Translation: ...") for non-English display
  const extractOriginalCaption = (text, lang) => {
    if (!text) return text;
    const marker = "Translation:";
    if (lang === "urdu" && text.includes(marker)) {
      return text.split(marker)[0].trim();
    }
    return text;
  };

  // -------------------------------
  // 📌 1 — Generate Caption
  // -------------------------------
  const handleGenerateCaption = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    setLoadingCaption(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/content/caption", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language }),
      });
      const data = await res.json();
      if (data.status === "success" && data.caption) {
        setCaption(extractOriginalCaption(data.caption, language));
      } else {
        alert(data.detail || "Failed to generate caption");
      }
    } catch (err) {
      alert("Error generating caption: " + err.message);
    }

    setLoadingCaption(false);
  };

  // -------------------------------
  // 📌 2 — Generate Hashtags
  // -------------------------------
  const handleGenerateHashtags = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    setLoadingHashtags(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/content/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: 6 }),
      });
      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.hashtags)) {
        setHashtags(data.hashtags);
      } else {
        alert(data.detail || "Failed to generate hashtags");
        setHashtags([]);
      }
    } catch (err) {
      alert("Error generating hashtags: " + err.message);
      setHashtags([]);
    }

    setLoadingHashtags(false);
  };

  // -------------------------------
  // 📌 3 — Generate Image
  // -------------------------------
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return alert("Please enter an image prompt!");
    setLoadingImage(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/content/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: imagePrompt }),
      });
      const data = await res.json();
      setGeneratedImage(data.image);
    } catch (err) {
      alert("Error generating image!");
    }

    setLoadingImage(false);
  };

  // -------------------------------
  // 📌 4 — Generate All Content
  // -------------------------------
  const handleGenerateAll = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    setLoadingAll(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language }),
      });
      const data = await res.json();

      if (data.status === "success" && data.data) {
        setCaption(extractOriginalCaption(data.data.caption, language));
        setHashtags(data.data.hashtags || []);
        setGeneratedImage(data.data.image);
      } else {
        alert(data.detail || "Failed to generate content");
      }
    } catch (err) {
      alert("Error generating full content: " + err.message);
    }

    setLoadingAll(false);
  };

  // -------------------------------
  // 📌 5 — Save Content to MongoDB
  // -------------------------------
  const handleSaveContent = async () => {
    if (!caption && (!hashtags || hashtags.length === 0) && !generatedImage) {
      alert("No content to save. Please generate something first.");
      return;
    }

    // Validate platforms if scheduling
    if (scheduledAt && selectedPlatforms.length === 0) {
      alert("Please select at least one platform for scheduled posts.");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/content/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // ✅ attach JWT
        },
        body: JSON.stringify({
          topic,
          language,
          caption,
          hashtags, // ✅ already array
          image: generatedImage,
          status: "draft",
          approval_status: approvalStatus,
          scheduled_at: toPakistaniTime(scheduledAt),
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : null,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        alert("Content saved successfully! ID: " + data.id);
        // Reset form
        setTopic("");
        setCaption("");
        setHashtags([]);
        setGeneratedImage("");
        setImagePrompt("");
        setScheduledAt("");
        setSelectedPlatforms([]);
      } else {
        alert("Failed to save content.");
      }
    } catch (err) {
      alert("Error saving content: " + err.message);
    }
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        AI Content Generator ✨
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* LEFT: Inputs & Actions */}
        <div>
          {/* TOPIC INPUT */}
          <input
            type="text"
            placeholder="Enter a topic, e.g., 'Sunset photography'"
            className="w-full p-3 border rounded-lg mb-4"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          {/* LANGUAGE SELECTION */}
          <div className="flex gap-6 mb-4 font-semibold text-gray-800 items-center">
            <span>Select Language:</span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="english"
                checked={language === "english"}
                onChange={(e) => setLanguage(e.target.value)}
              />
              English
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="urdu"
                checked={language === "urdu"}
                onChange={(e) => setLanguage(e.target.value)}
              />
              Urdu
            </label>
          </div>

          {/* IMAGE PROMPT INPUT */}
          <input
            type="text"
            placeholder="Enter an image prompt, e.g., 'Loyalty of a Dog'"
            className="w-full p-3 border rounded-lg mb-4"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
          />

          {/* APPROVAL STATUS */}
          <div className="mt-2 mb-4">
            <p className="font-semibold text-gray-800 mb-2">Approval Status:</p>
            <select
              value={approvalStatus}
              onChange={(e) => setApprovalStatus(e.target.value)}
              className="p-2 border rounded-lg w-full"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* SCHEDULED TIME */}
          <div className="mt-2 mb-4">
            <p className="font-semibold text-gray-800 mb-2">Schedule Post At:</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="p-2 border rounded-lg w-full"
            />
          </div>

          {/* PLATFORM SELECTION */}
          {scheduledAt && (
            <div className="mt-2 mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-semibold text-gray-800 mb-2">Select Platforms for Scheduled Post:</p>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes("facebook")}
                    onChange={() => togglePlatform("facebook")}
                  />
                  Facebook Page
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes("instagram")}
                    onChange={() => togglePlatform("instagram")}
                  />
                  Instagram
                </label>
              </div>
            </div>
          )}

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              onClick={handleGenerateCaption}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              disabled={loadingCaption}
            >
              {loadingCaption ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
              {loadingCaption ? "Generating..." : "Caption"}
            </button>

            <button
              onClick={handleGenerateHashtags}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              disabled={loadingHashtags}
            >
              {loadingHashtags ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
              {loadingHashtags ? "Generating..." : "Hashtags"}
            </button>

            <button
              onClick={handleGenerateImage}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              disabled={loadingImage}
            >
              {loadingImage ? <Loader2 className="animate-spin" /> : <ImageIcon size={18} />}
              {loadingImage ? "Generating..." : "Image"}
            </button>

            <button
              onClick={handleGenerateAll}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              disabled={loadingAll}
            >
              {loadingAll ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
              {loadingAll ? "Generating..." : "Generate All"}
            </button>
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={handleSaveContent}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg"
          >
            Save Content
          </button>
        </div>

        {/* RIGHT: Generated outputs */}
        <div className="space-y-6">
          {/* Caption */}
          <div className="bg-gray-100 p-4 rounded-lg min-h-[120px]">
            <p className="font-semibold text-gray-800">Caption ({language}):</p>
            <p
              className={`mt-2 ${language === "urdu" ? "text-right font-noto text-lg" : "text-left"} text-gray-700`}
            >
              {caption || <span className="text-gray-400 italic">No caption yet.</span>}
            </p>
          </div>

          {/* Hashtags */}
          <div className="bg-gray-100 p-4 rounded-lg">
            <p className="font-semibold text-gray-800">Hashtags:</p>
            <p className="text-indigo-600 mt-2">{hashtags.length ? hashtags.join(" ") : <span className="text-gray-400 italic">No hashtags yet.</span>}</p>
          </div>

          {/* Generated Image */}
          <div className="bg-white p-4 rounded-lg border flex items-center justify-center">
            {generatedImage ? (
              <img src={generatedImage} alt="Generated" className="rounded-lg shadow-md max-h-96 object-contain" />
            ) : (
              <div className="text-gray-400 italic">No image generated yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
