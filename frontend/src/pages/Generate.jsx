import React, { useState } from "react";
import { Loader2, Image as ImageIcon, Wand2, Sparkles } from "lucide-react";

export default function Generate() {
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [language, setLanguage] = useState("english"); // 👈 Language state
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);

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
        body: JSON.stringify({ topic, language }), // 👈 use selected language
      });
      const data = await res.json();
      setCaption(data.caption);
    } catch (err) {
      alert("Error generating caption!");
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
      setHashtags(data.hashtags);
    } catch (err) {
      alert("Error generating hashtags!");
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
        body: JSON.stringify({ topic, language }), // 👈 use selected language
      });
      const data = await res.json();

      setCaption(data.data.caption);
      setHashtags(data.data.hashtags);
      setGeneratedImage(data.data.image);
    } catch (err) {
      alert("Error generating full content!");
    }

    setLoadingAll(false);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Page Title */}
      <h1 className="text-3xl font-bold mb-8 text-gray-800">
        AI Content Generator ✨
      </h1>

      {/* TOPIC INPUT */}
      <input
        type="text"
        placeholder="Enter a topic, e.g., 'Sunset photography'"
        className="w-full p-3 border rounded-lg mb-4"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      {/* LANGUAGE SELECTION */}
      <div className="flex gap-6 mb-6">
        <label className="flex items-center gap-2"> Select the Language :  
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

      {/* BUTTONS */}
      <div className="flex flex-wrap gap-4 mb-8">
        <button
          onClick={handleGenerateCaption}
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          disabled={loadingCaption}
        >
          {loadingCaption ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
          {loadingCaption ? "Generating..." : "Generate Caption"}
        </button>

        <button
          onClick={handleGenerateHashtags}
          className="bg-purple-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          disabled={loadingHashtags}
        >
          {loadingHashtags ? <Loader2 className="animate-spin" /> : <Wand2 size={18} />}
          {loadingHashtags ? "Generating..." : "Generate Hashtags"}
        </button>

        <button
          onClick={handleGenerateImage}
          className="bg-green-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          disabled={loadingImage}
        >
          {loadingImage ? <Loader2 className="animate-spin" /> : <ImageIcon size={18} />}
          {loadingImage ? "Generating..." : "Generate Image"}
        </button>

        <button
          onClick={handleGenerateAll}
          className="bg-orange-600 text-white px-5 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
          disabled={loadingAll}
        >
          {loadingAll ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
          {loadingAll ? "Generating..." : "Generate All Content"}
        </button>
      </div>

      {/* OUTPUTS */}
      
      {caption && (
        <div className="mt-6 bg-gray-100 p-4 rounded-lg">
          <p className="font-semibold text-gray-800">Caption ({language}):</p>
          <p
            className={`mt-1 ${
              language === "urdu" ? "text-right font-noto text-lg" : "text-left"
            } text-gray-700`}
          >
            {caption}
          </p>
        </div>
      )}

      {hashtags && (
        <div className="mt-4 bg-gray-100 p-4 rounded-lg">
          <p className="font-semibold text-gray-800">Hashtags:</p>
          <p className="text-indigo-600 mt-1">{hashtags}</p>
        </div>
      )}

      {generatedImage && (
        <div className="mt-6">
          <p className="font-semibold text-gray-800 mb-2">Generated Image:</p>
          <img
            src={generatedImage}
            alt="Generated"
            className="rounded-lg shadow-md border"
          />
        </div>
      )}
    </div>
  );
}