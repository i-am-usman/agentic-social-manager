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
  const platformLabel = platform ? `${platform.charAt(0).toUpperCase()}${platform.slice(1)}` : "Platform";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 dark:shadow-none">
      <div className="mb-3 flex items-center gap-2">
        <Icon size={20} className={colors.text} />
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{platformLabel} Auto-Reply</h3>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Comments</p>
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

          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable Auto-Reply</label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Automatically reply to comments using AI</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {onUpdateReplyMode && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Reply Mode</label>
                <select
                  value={settings.reply_mode || "ai"}
                  onChange={(e) => onUpdateReplyMode(e.target.value)}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                >
                  <option value="ai">AI</option>
                  <option value="template">Template</option>
                </select>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">Reply Tone</label>
              <select
                value={settings.reply_tone}
                onChange={(e) => onUpdateTone(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Reply Delay: {settings.reply_delay_minutes} min
            </label>
            <input
              type="range"
              min="0"
              max="30"
              value={settings.reply_delay_minutes}
              onChange={(e) => onUpdateDelay(parseInt(e.target.value, 10))}
              disabled={isLoading}
              className="w-full"
            />
          </div>
        </div>

        {showDMSettings && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Direct Messages</p>
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

            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Enable DM Auto-Reply</label>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Automatically reply to direct messages</p>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {onUpdateDMReplyMode && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">DM Reply Mode</label>
                  <select
                    value={settings.dm_reply_mode || "ai"}
                    onChange={(e) => onUpdateDMReplyMode(e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  >
                    <option value="ai">AI</option>
                    <option value="template">Template</option>
                  </select>
                </div>
              )}

              {onUpdateDMTone && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">DM Reply Tone</label>
                  <select
                    value={settings.dm_reply_tone || "professional"}
                    onChange={(e) => onUpdateDMTone(e.target.value)}
                    disabled={isLoading}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>
              )}
            </div>

            {onUpdateDMDelay && (
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                  DM Reply Delay: {settings.dm_reply_delay_minutes ?? 0} min
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={settings.dm_reply_delay_minutes ?? 0}
                  onChange={(e) => onUpdateDMDelay(parseInt(e.target.value, 10))}
                  disabled={isLoading}
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
