import React from "react";
import { Facebook, Instagram, Linkedin } from "lucide-react";

export default function AutoReplySettingsPanel({
  platform,
  settings,
  onToggle,
  onUpdateReplyMode,
  onUpdateTone,
  onUpdateDelay,
  onToggleDM,
  onUpdateDMReplyMode,
  onUpdateDMTone,
  onUpdateDMDelay,
  isLoading,
}) {
  const platformColors = {
    facebook: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-600", icon: Facebook },
    instagram: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-600", icon: Instagram },
    linkedin: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: Linkedin },
  };

  const colors = platformColors[platform] || platformColors.linkedin;
  const Icon = colors.icon;
  const showDMSettings = Boolean(onToggleDM || onUpdateDMReplyMode || onUpdateDMTone || onUpdateDMDelay);

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/75 p-6 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={24} className={colors.text} />
        <h3 className="text-lg font-semibold text-slate-100">Auto-Reply Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-200">Enable Auto-Reply</label>
            <p className="mt-1 text-xs text-slate-400">Automatically reply to comments using AI</p>
          </div>
          <button
            onClick={() => onToggle(!settings.auto_reply_enabled)}
            disabled={isLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.auto_reply_enabled ? "bg-indigo-600" : "bg-slate-600"
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
            <label className="mb-2 block text-sm font-medium text-slate-200">Reply Mode</label>
            <select
              value={settings.reply_mode || "ai"}
              onChange={(e) => onUpdateReplyMode(e.target.value)}
              disabled={isLoading}
              className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-slate-100 md:w-64"
            >
              <option value="ai">AI</option>
              <option value="template">Template</option>
            </select>
          </div>
        )}

        {/* Reply Tone Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">Reply Tone</label>
          <select
            value={settings.reply_tone}
            onChange={(e) => onUpdateTone(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-slate-100 md:w-64"
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="casual">Casual</option>
          </select>
        </div>

        {/* Reply Delay Slider */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200">
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
          <p className="mt-1 text-xs text-slate-400">
            How long to wait before replying to new comments (0-30 minutes)
          </p>
        </div>

        {showDMSettings && (
          <div className="border-t pt-4 mt-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-slate-200">Enable DM Auto-Reply</label>
                <p className="mt-1 text-xs text-slate-400">Automatically reply to direct messages</p>
              </div>
              <button
                onClick={() => onToggleDM(!settings.dm_enabled)}
                disabled={isLoading || !onToggleDM}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.dm_enabled ? "bg-indigo-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.dm_enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {onUpdateDMReplyMode && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">DM Reply Mode</label>
                <select
                  value={settings.dm_reply_mode || "ai"}
                  onChange={(e) => onUpdateDMReplyMode(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-slate-100 md:w-64"
                >
                  <option value="ai">AI</option>
                  <option value="template">Template</option>
                </select>
              </div>
            )}

            {onUpdateDMTone && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">DM Reply Tone</label>
                <select
                  value={settings.dm_reply_tone || "professional"}
                  onChange={(e) => onUpdateDMTone(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm text-slate-100 md:w-64"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            )}

            {onUpdateDMDelay && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  DM Reply Delay: {settings.dm_reply_delay_minutes ?? 0} minutes
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={settings.dm_reply_delay_minutes ?? 0}
                  onChange={(e) => onUpdateDMDelay(parseInt(e.target.value, 10))}
                  disabled={isLoading}
                  className="w-full md:w-96"
                />
                <p className="mt-1 text-xs text-slate-400">
                  How long to wait before replying to new direct messages (0-30 minutes)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
