import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Image as ImageIcon, Wand2, Sparkles, X, Upload } from "lucide-react";
import EditAIGeneratedModal from "../components/EditAIGeneratedModal";
import ProgressModal from "../components/ProgressModal";
import useSessionStorageState from "../hooks/useSessionStorageState";
import { apiUrl } from "../config/api";

export default function Generate() {
  const [topic, setTopic] = useSessionStorageState("generate.topic", "");
  const [caption, setCaption] = useSessionStorageState("generate.caption", "");
  const [hashtags, setHashtags] = useSessionStorageState("generate.hashtags", []);
  const [imagePrompt, setImagePrompt] = useSessionStorageState("generate.imagePrompt", "");
  const [generatedImage, setGeneratedImage] = useSessionStorageState("generate.generatedImage", "");
  const [language, setLanguage] = useSessionStorageState("generate.language", "english");
  const [loadingCaption, setLoadingCaption] = useState(false);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [loadingImage, setLoadingImage] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [scheduledAt, setScheduledAt] = useSessionStorageState("generate.scheduledAt", "");
  const [selectedPlatforms, setSelectedPlatforms] = useSessionStorageState("generate.selectedPlatforms", []);
  const [mediaItems, setMediaItems] = useSessionStorageState("generate.mediaItems", []);  // ✅ New: array of {id, type, file, preview, order}
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [posting, setPosting] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState({
    facebook: { connected: false },
    instagram: { connected: false },
    linkedin_personal: { connected: false },
    linkedin_company: { connected: false },
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCaption, setEditCaption] = useSessionStorageState("generate.editCaption", "");
  const [editHashtags, setEditHashtags] = useSessionStorageState("generate.editHashtags", []);
  const [analysis, setAnalysis] = useSessionStorageState("generate.analysis", null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [publishJobId, setPublishJobId] = useSessionStorageState("generate.publishJobId", null);
  const [showProgress, setShowProgress] = useSessionStorageState("generate.showProgress", false);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const generationControllersRef = useRef({
    caption: null,
    hashtags: null,
    image: null,
    all: null,
  });

  const token = localStorage.getItem("token"); // ✅ get JWT
  const isGenerating = loadingCaption || loadingHashtags || loadingImage || loadingAll;

  const setGenerationController = (key, controller) => {
    generationControllersRef.current[key] = controller;
  };

  const clearGenerationController = (key) => {
    generationControllersRef.current[key] = null;
  };

  const isAbortError = (err) => err?.name === "AbortError";

  const showToast = useCallback((message, tone = "info") => {
    setToast({ message, tone });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 2200);
  }, []);

  const stopGeneration = () => {
    if (!isGenerating) {
      return;
    }

    Object.values(generationControllersRef.current).forEach((controller) => {
      if (controller) {
        controller.abort();
      }
    });
    setLoadingCaption(false);
    setLoadingHashtags(false);
    setLoadingImage(false);
    setLoadingAll(false);
    showToast("Generation stopped.", "warning");
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const fetchAccounts = useCallback(async () => {
      try {
        const res = await fetch(apiUrl("/accounts/me"), {
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
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAccounts();
    }
  }, [token, fetchAccounts]);  // ✅ Removed connectedAccounts to prevent infinite loop

  // ✅ Helper: Convert datetime-local string to ISO format
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

  const promptTokens = (value) => {
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "with", "by",
      "is", "are", "be", "this", "that", "it", "my", "your", "our", "from", "as", "about",
      "create", "make", "generate", "image", "caption", "post",
    ]);

    return (value || "")
      .toLowerCase()
      .match(/[a-z0-9]+/g)?.filter((token) => !stopWords.has(token)) || [];
  };

  const looksLikeGibberish = (token) => {
    if (!token) return true;
    const lowered = token.toLowerCase();

    if (/(.)\1{3,}/.test(lowered)) {
      return true;
    }

    if (lowered.length >= 5) {
      const uniqueRatio = new Set(lowered).size / lowered.length;
      const hasVowel = /[aeiou]/.test(lowered);
      if (uniqueRatio < 0.35) {
        return true;
      }
      if (!hasVowel && uniqueRatio < 0.5) {
        return true;
      }
    }

    return false;
  };

  const validatePromptQuality = (value) => {
    const text = (value || "").trim();
    if (text.length < 12) {
      return "Prompt is too short. Add a clear subject and context.";
    }

    const tokens = promptTokens(text);
    if (tokens.length < 3) {
      return "Prompt needs at least 3 meaningful words.";
    }

    if (new Set(tokens).size < 2) {
      return "Prompt is too repetitive. Add more detail.";
    }

    const gibberishCount = tokens.filter((token) => looksLikeGibberish(token)).length;
    if (gibberishCount >= Math.max(2, Math.ceil(tokens.length / 2))) {
      return "Prompt looks invalid or gibberish. Use clear words describing a real idea.";
    }

    return null;
  };

  const validatePromptAlignment = (topicValue, imagePromptValue) => {
    const topicText = (topicValue || "").trim();
    const imageText = (imagePromptValue || "").trim();
    if (!topicText || !imageText) {
      return null;
    }

    const topicSet = new Set(promptTokens(topicText));
    const imageSet = new Set(promptTokens(imageText));
    const hasOverlap = [...topicSet].some((token) => imageSet.has(token));
    if (!hasOverlap) {
      return "Image prompt should align with topic so caption and image describe the same idea.";
    }
    return null;
  };

  // ✅ Helper: File size validation
  const getFileValidation = (file) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const maxImageSize = 8 * 1024 * 1024;  // 8MB
    const maxVideoSize = 500 * 1024 * 1024; // 500MB
    
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

  // ✅ Handle multiple media file upload
  const handleMediaFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (mediaItems.length + files.length > 10) {
      alert("Maximum 10 media items per post");
      return;
    }

    // Validate files
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
        
        // Read file as base64
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
              name: file.name
            });
            resolve();
          };
          reader.readAsDataURL(file);
        });
      }

      setMediaItems((prev) => [...prev, ...newMediaItems]);
      // Clear the input
      e.target.value = "";
    } catch (err) {
      alert(`Error processing files: ${err.message}`);
    } finally {
      setUploadingMedia(false);
    }
  };

  // ✅ Delete media item
  const deleteMediaItem = (mediaId) => {
    setMediaItems((prev) => prev.filter((item) => item.id !== mediaId));
  };

  // ✅ Reorder media items (basic: move up/down)
  const moveMediaItem = (mediaId, direction) => {
    const idx = mediaItems.findIndex((item) => item.id === mediaId);
    if (idx === -1) return;
    
    if (direction === "up" && idx > 0) {
      const newItems = [...mediaItems];
      [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
      // Update orders
      newItems.forEach((item, i) => {
        item.order = i;
      });
      setMediaItems(newItems);
    } else if (direction === "down" && idx < mediaItems.length - 1) {
      const newItems = [...mediaItems];
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      // Update orders
      newItems.forEach((item, i) => {
        item.order = i;
      });
      setMediaItems(newItems);
    }
  };

  // -------------------------------
  // 📌 Analysis — Sentiment & Emotion
  // -------------------------------
  const analyzeCaption = async (textToAnalyze) => {
    const value = (textToAnalyze || "").trim();
    if (!value) {
      setAnalysis(null);
      return;
    }

    setLoadingAnalysis(true);
    try {
      const res = await fetch(apiUrl("/content/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value, language }),
      });

      const data = await res.json();
      if (data.status === "success" && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis(null);
      }
    } catch (err) {
      setAnalysis(null);
    }
    setLoadingAnalysis(false);
  };

  const sentimentStyle = (sentiment) => {
    if (sentiment === "positive") {
      return "bg-green-100 text-green-700 border-green-200";
    }
    if (sentiment === "negative") {
      return "bg-red-100 text-red-700 border-red-200";
    }
    return "bg-slate-500/10 text-slate-700 border-slate-400/20 dark:bg-slate-700/40 dark:text-slate-200 dark:border-slate-500/50";
  };

  // -------------------------------
  // 📌 1 — Generate Caption
  // -------------------------------
  const handleGenerateCaption = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    const promptError = validatePromptQuality(topic);
    if (promptError) return alert(promptError);
    setLoadingCaption(true);
    const controller = new AbortController();
    setGenerationController("caption", controller);

    try {
      const res = await fetch(apiUrl("/content/caption"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.status === "success" && data.caption) {
        const generatedCaption = extractOriginalCaption(data.caption, language);
        setCaption(generatedCaption);
        await analyzeCaption(generatedCaption);
      } else {
        alert(data.detail || "Failed to generate caption");
      }
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      alert("Error generating caption: " + err.message);
    } finally {
      clearGenerationController("caption");
      setLoadingCaption(false);
    }
  };

  // -------------------------------
  // 📌 2 — Generate Hashtags
  // -------------------------------
  const handleGenerateHashtags = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    const promptError = validatePromptQuality(topic);
    if (promptError) return alert(promptError);
    setLoadingHashtags(true);
    const controller = new AbortController();
    setGenerationController("hashtags", controller);

    try {
      const res = await fetch(apiUrl("/content/hashtags"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count: 6 }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (data.status === "success" && Array.isArray(data.hashtags)) {
        setHashtags(data.hashtags);
      } else {
        alert(data.detail || "Failed to generate hashtags");
        setHashtags([]);
      }
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      alert("Error generating hashtags: " + err.message);
      setHashtags([]);
    } finally {
      clearGenerationController("hashtags");
      setLoadingHashtags(false);
    }
  };

  // -------------------------------
  // 📌 3 — Generate Image
  // -------------------------------
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() && !topic.trim()) {
      return alert("Please enter a topic or image prompt!");
    }
    const selectedPrompt = imagePrompt.trim() || topic.trim();
    const promptError = validatePromptQuality(selectedPrompt);
    if (promptError) return alert(promptError);
    const alignmentError = validatePromptAlignment(topic, imagePrompt);
    if (alignmentError) return alert(alignmentError);
    setLoadingImage(true);
    const controller = new AbortController();
    setGenerationController("image", controller);

    try {
      const res = await fetch(apiUrl("/content/image"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: imagePrompt.trim() || topic.trim() }),
        signal: controller.signal,
      });
      const data = await res.json();
      setGeneratedImage(data.image);
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      alert("Error generating image!");
    } finally {
      clearGenerationController("image");
      setLoadingImage(false);
    }
  };

  // -------------------------------
  // 📌 4 — Generate All Content
  // -------------------------------
  const handleGenerateAll = async () => {
    if (!topic.trim()) return alert("Please enter a topic!");
    const promptError = validatePromptQuality(topic);
    if (promptError) return alert(promptError);
    const alignmentError = validatePromptAlignment(topic, imagePrompt);
    if (alignmentError) return alert(alignmentError);
    setLoadingAll(true);
    const controller = new AbortController();
    setGenerationController("all", controller);

    try {
      const res = await fetch(apiUrl("/content/generate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, language }),
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.status === "success" && data.data) {
        const generatedCaption = extractOriginalCaption(data.data.caption, language);
        const generatedHashtags = data.data.hashtags || [];
        
        // Store in edit states and show modal
        setEditCaption(generatedCaption);
        setEditHashtags(generatedHashtags);
        setShowEditModal(true);
        
        // Also set in main states for preview
        setCaption(generatedCaption);
        setHashtags(generatedHashtags);
        if (data.data.analysis) {
          setAnalysis(data.data.analysis);
        } else {
          await analyzeCaption(generatedCaption);
        }
        // Only set generated image if no media is uploaded
        if (mediaItems.length === 0) {
          setGeneratedImage(data.data.image);
        }
      } else {
        alert(data.detail || "Failed to generate content");
      }
    } catch (err) {
      if (isAbortError(err)) {
        return;
      }
      alert("Error generating full content: " + err.message);
    } finally {
      clearGenerationController("all");
      setLoadingAll(false);
    }
  };

  // -------------------------------
  // 📌 5 — Save Content to MongoDB
  // -------------------------------
  const handleSaveContent = async () => {
    if (!caption && (!hashtags || hashtags.length === 0) && mediaItems.length === 0 && !generatedImage) {
      alert("No content to save. Please upload media or generate something first.");
      return;
    }

    // Validate platforms if scheduling
    if (scheduledAt && selectedPlatforms.length === 0) {
      alert("Please select at least one platform for scheduled posts.");
      return;
    }

    const missing = selectedPlatforms.filter((platform) => {
      const key = getAccountKey(platform);
      return !connectedAccounts[key]?.connected;
    });
    if (missing.length > 0) {
      alert("Please connect your social accounts before scheduling.");
      return;
    }

    // Validate Instagram requires media
    if (selectedPlatforms.includes("instagram") && mediaItems.length === 0 && !generatedImage) {
      alert("Instagram requires images or videos. Please upload media or generate an image.");
      return;
    }

    try {
      // Prepare media array (convert base64 to objects)
      const media = mediaItems.map((item) => ({
        type: item.type,
        url: item.preview,  // Base64 for uploading (backend will convert to Cloudinary)
        order: item.order
      }));

      // Use generated image as fallback if no media uploaded
      if (!media.length && generatedImage) {
        media.push({
          type: "image",
          url: generatedImage,
          order: 0
        });
      }

      const res = await fetch(apiUrl("/content/save"), {
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
          media: media.length > 0 ? media : undefined,  // ✅ New: send media array
          status: "draft",
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
        setMediaItems([]);
        setImagePrompt("");
        setAnalysis(null);
        setScheduledAt("");
        setSelectedPlatforms([]);
      } else {
        alert("Failed to save content.");
      }
    } catch (err) {
      alert("Error saving content: " + err.message);
    }
  };

  // Handler for saving edited AI-generated content
  const handleSaveEditedContent = ({ content, hashtags: editedHashtags }) => {
    setCaption(content);
    setHashtags(editedHashtags);
    setShowEditModal(false);
    analyzeCaption(content);
    // Now user can review and save to db with handleSaveContent
    alert("Content updated! Now you can save it to database or make more changes.");
  };

  const togglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const getAccountKey = (platform) => platform.replace(/-/g, "_");

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

    if (selectedPlatforms.includes("instagram") && mediaItems.length === 0 && !generatedImage) {
      alert("Instagram requires images or videos");
      return;
    }

    setPosting(true);

    try {
      // Step 1: Prepare and save content
      const media = mediaItems.map((item) => ({
        type: item.type,
        url: item.preview,
        order: item.order,
      }));

      // Use generated image as fallback if no media uploaded
      if (!media.length && generatedImage) {
        media.push({
          type: "image",
          url: generatedImage,
          order: 0,
        });
      }

      const saveRes = await fetch(apiUrl("/content/save"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            topic,
            language,
            caption,
            hashtags,
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
      const publishRes = await fetch(apiUrl("/posts/publish"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            post_id: postId,
            caption,
            hashtags,
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
          setTopic("");
          setCaption("");
          setHashtags([]);
          setGeneratedImage("");
          setMediaItems([]);
          setImagePrompt("");
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
      setTopic("");
      setCaption("");
      setHashtags([]);
      setGeneratedImage("");
      setMediaItems([]);
      setImagePrompt("");
      setAnalysis(null);
      setSelectedPlatforms([]);
    }
  };

  const handleProgressClose = () => {
    setShowProgress(false);
    setPublishJobId(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-6 text-slate-900 dark:text-slate-100">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          AI Content Generator ✨
        </h1>
        <button
          type="button"
          onClick={fetchAccounts}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          Refresh accounts
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* LEFT: Inputs & Actions */}
        <div>
          {/* TOPIC INPUT */}
          <input
            type="text"
            placeholder="Enter a topic, e.g., 'Sunset photography'"
            className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-white/10"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          {/* LANGUAGE SELECTION */}
          <div className="mb-4 flex items-center gap-6 font-semibold text-slate-700 dark:text-slate-200">
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
            className="mb-4 w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:bg-white/10"
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
          />

          {/* MEDIA UPLOAD - Images & Videos */}
          <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Upload Images & Videos (Max 10):</p>
            <label className="mb-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-indigo-300/40 p-3 hover:bg-slate-50 dark:hover:bg-white/10">
              <Upload size={18} className="text-indigo-300" />
              <span className="text-sm text-indigo-200">Click to upload or drag files here</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaFileUpload}
                disabled={uploadingMedia}
                className="hidden"
              />
            </label>
            <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Supported: JPG, PNG, WebP, GIF (images ≤8MB) | MP4, MOV, WebM (videos ≤500MB)</p>
            
            {/* Media Items Grid */}
            {mediaItems.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {mediaItems.map((item, idx) => (
                  <div key={item.id} className="relative group">
                    {item.type === "image" ? (
                      <img src={item.preview} alt={`Media ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center rounded-lg bg-slate-800">
                        <span className="text-xs text-slate-600 dark:text-slate-300">Video: {item.name}</span>
                      </div>
                    )}
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => moveMediaItem(item.id, "up")}
                        className="rounded bg-slate-600 p-1 text-xs text-white hover:bg-slate-500"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveMediaItem(item.id, "down")}
                        className="rounded bg-slate-600 p-1 text-xs text-white hover:bg-slate-500"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => deleteMediaItem(item.id)}
                        className="bg-red-600 text-white p-1 rounded"
                        title="Delete"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    
                    {/* Badge */}
                    <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      {item.order + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {uploadingMedia && <p className="mt-2 text-sm text-indigo-300 animate-pulse">Uploading...</p>}
            
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

            {/* LinkedIn Mixed Media Warning */}
            {selectedPlatforms.includes("linkedin") && mediaItems.length > 0 && (
              (() => {
                const hasImages = mediaItems.some(m => m.type === "image");
                const hasVideos = mediaItems.some(m => m.type === "video");
                if (hasImages && hasVideos) {
                  return (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
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
          </div>

          {/* SCHEDULED TIME */}
          <div className="mt-2 mb-4">
              <p className="mb-2 font-semibold text-slate-700 dark:text-slate-200">Schedule Post At (Optional):</p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:bg-white/10"
            />
          </div>

          {/* PLATFORM SELECTION */}
          <div className="mt-2 mb-6 rounded-2xl border border-slate-200 bg-white p-3 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
            <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Select Platforms to Post:</p>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("facebook")}
                  disabled={!connectedAccounts.facebook?.connected}
                  onChange={() => togglePlatform("facebook")}
                />
                Facebook Page
                {!connectedAccounts.facebook?.connected && (
                  <span className="text-xs text-red-600">(not connected)</span>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("instagram")}
                  disabled={!connectedAccounts.instagram?.connected}
                  onChange={() => togglePlatform("instagram")}
                />
                Instagram
                {!connectedAccounts.instagram?.connected && (
                  <span className="text-xs text-red-600">(not connected)</span>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("linkedin-personal")}
                  disabled={!connectedAccounts.linkedin_personal?.connected}
                  onChange={() => togglePlatform("linkedin-personal")}
                />
                LinkedIn Personal
                {!connectedAccounts.linkedin_personal?.connected && (
                  <span className="text-xs text-red-600">(not connected)</span>
                )}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes("linkedin-company")}
                  disabled={!connectedAccounts.linkedin_company?.connected}
                  onChange={() => togglePlatform("linkedin-company")}
                />
                LinkedIn Company
                {!connectedAccounts.linkedin_company?.connected && (
                  <span className="text-xs text-red-600">(not connected)</span>
                )}
              </label>
            </div>
          </div>

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

            <button
              onClick={stopGeneration}
              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
              disabled={!isGenerating}
            >
              <X size={18} />
              Stop
            </button>
          </div>

          {/* BUTTONS */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handlePostNow}
              disabled={posting || selectedPlatforms.length === 0}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 hover:bg-green-700"
            >
              {posting ? <Loader2 className="animate-spin" size={18} /> : "🚀"}
              {posting ? "Posting..." : "Post Now"}
            </button>
            <button
              onClick={handleSaveContent}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700"
            >
              Save as Draft
            </button>
          </div>
        </div>

        {/* RIGHT: Generated outputs */}
        <div className="space-y-6">
          {/* Caption */}
          <div className="min-h-[120px] rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/75">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Caption ({language}):</p>
              {caption && (
                <button
                  onClick={() => {
                    setEditCaption(caption);
                    setEditHashtags(hashtags);
                    setShowEditModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  title="Edit caption and hashtags"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
            <p
              className={`mt-2 ${language === "urdu" ? "text-right font-noto text-lg" : "text-left"} text-slate-700 dark:text-slate-200`}
            >
              {caption || <span className="italic text-slate-500">No caption yet.</span>}
            </p>
          </div>

          {/* Hashtags */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/75">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Hashtags:</p>
              {hashtags.length > 0 && (
                <button
                  onClick={() => {
                    setEditCaption(caption);
                    setEditHashtags(hashtags);
                    setShowEditModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                  title="Edit caption and hashtags"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
            <p className="mt-2 text-indigo-300">{hashtags.length ? hashtags.join(" ") : <span className="italic text-slate-500">No hashtags yet.</span>}</p>
          </div>

          {/* Sentiment & Emotion Analysis */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/75">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">Sentiment & Emotion Analysis:</p>
              <button
                onClick={() => analyzeCaption(caption)}
                disabled={loadingAnalysis || !caption.trim()}
                className="text-sm bg-indigo-600 text-white px-3 py-1 rounded disabled:opacity-50"
              >
                {loadingAnalysis ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            {!analysis ? (
              <p className="italic text-slate-500">No analysis yet. Generate or edit a caption, then analyze.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-sm rounded-full border capitalize ${sentimentStyle(analysis.sentiment)}`}>
                    {analysis.sentiment}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Confidence: {Math.round((analysis.confidence || 0) * 100)}%
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(analysis.emotions || []).length ? (
                    analysis.emotions.map((item, idx) => (
                      <span key={`${item.name}_${idx}`} className="rounded border border-blue-300/20 bg-blue-500/10 px-2 py-1 text-xs text-blue-200">
                        {item.name} ({Math.round((item.score || 0) * 100)}%)
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500 dark:text-slate-400">No dominant emotions detected.</span>
                  )}
                </div>

                <p className="text-sm text-slate-700 dark:text-slate-200">{analysis.summary}</p>
              </div>
            )}
          </div>

          {/* Media Preview */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900/75">
            <p className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Uploaded/Generated Media:</p>
            {mediaItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {mediaItems.map((item, idx) => (
                  <div key={item.id} className="relative">
                    {item.type === "image" ? (
                      <img src={item.preview} alt={`Media ${idx + 1}`} className="w-full h-20 object-cover rounded-lg" />
                    ) : (
                      <div className="flex h-20 w-full items-center justify-center rounded-lg bg-slate-700">
                        <span className="text-xs text-slate-600 dark:text-slate-200">Video</span>
                      </div>
                    )}
                    <div className="absolute top-0.5 left-0.5 bg-blue-600 text-white text-xs px-1 rounded">{item.order + 1}</div>
                  </div>
                ))}
              </div>
            ) : generatedImage ? (
              <div className="w-full">
                <img src={generatedImage} alt="Generated" className="rounded-lg shadow-md max-h-96 object-contain w-full" />
                <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">AI-generated image</p>
              </div>
            ) : (
              <div className="py-8 text-center italic text-slate-500">No media uploaded or generated yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Edit AI Generated Content Modal */}
      <EditAIGeneratedModal
        isOpen={showEditModal}
        content={editCaption}
        hashtags={editHashtags}
        onSave={handleSaveEditedContent}
        onClose={() => setShowEditModal(false)}
      />

      {/* Progress Modal */}
      {showProgress && (
        <ProgressModal
          jobId={publishJobId}
          onComplete={handleProgressComplete}
          onClose={handleProgressClose}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50">
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur ${
              toast.tone === "warning"
                ? "border-amber-300/40 bg-amber-500/15 text-amber-100"
                : "border-indigo-300/30 bg-indigo-500/15 text-indigo-100"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
