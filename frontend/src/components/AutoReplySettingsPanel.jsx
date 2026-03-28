import React from "react";
import { Facebook, Instagram, Linkedin } from "lucide-react";

export default function AutoReplySettingsPanel({
  platform,
  settings,
  onToggle,
  onUpdateReplyMode,
  onUpdateTone,
  onUpdateDelay,
  isLoading,
}) {
  const platformColors = {
    facebook: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", icon: Facebook },
    instagram: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600", icon: Instagram },
    linkedin: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: Linkedin },
  };

  const colors = platformColors[platform] || platformColors.linkedin;
  const Icon = colors.icon;

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-6 mb-6`}>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={24} className={colors.text} />
        <h3 className="text-lg font-semibold text-gray-800">Auto-Reply Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-700">Enable Auto-Reply</label>
            <p className="text-xs text-gray-500 mt-1">Automatically reply to comments using AI</p>
          </div>
          <button
            onClick={() => onToggle(!settings.auto_reply_enabled)}
            disabled={isLoading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.auto_reply_enabled ? "bg-indigo-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.auto_reply_enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {onUpdateReplyMode && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Reply Mode</label>
            <select
              value={settings.reply_mode || "ai"}
              onChange={(e) => onUpdateReplyMode(e.target.value)}
              disabled={isLoading}
              className="w-full md:w-64 border rounded-lg p-2 text-sm"
            >
              <option value="ai">AI</option>
              <option value="template">Template</option>
            </select>
          </div>
        )}

        {/* Reply Tone Selector */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Reply Tone</label>
          <select
            value={settings.reply_tone}
            onChange={(e) => onUpdateTone(e.target.value)}
            disabled={isLoading}
            className="w-full md:w-64 border rounded-lg p-2 text-sm"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="casual">Casual</option>
          </select>
        </div>

        {/* Reply Delay Slider */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Reply Delay: {settings.reply_delay_minutes} minutes
          </label>
          <input
            type="range"
            min="0"
            max="30"
            value={settings.reply_delay_minutes}
            onChange={(e) => onUpdateDelay(parseInt(e.target.value))}
            disabled={isLoading}
            className="w-full md:w-96"
          />
          <p className="text-xs text-gray-500 mt-1">
            How long to wait before replying to new comments (0-30 minutes)
          </p>
        </div>
      </div>
    </div>
  );
}
