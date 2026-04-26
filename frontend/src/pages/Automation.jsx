import React, { useCallback, useEffect, useState } from "react";
import { Activity, Loader2, RefreshCw } from "lucide-react";
import AutoReplySettingsPanel from "../components/AutoReplySettingsPanel";
import { apiUrl } from "../config/api";

const DEFAULT_SETTINGS = {
  auto_reply_enabled: false,
  reply_mode: "ai",
  reply_tone: "professional",
  reply_delay_minutes: 0,
  dm_enabled: false,
  dm_reply_mode: "ai",
  dm_reply_tone: "professional",
  dm_reply_delay_minutes: 0,
};

export default function Automation() {
  const token = localStorage.getItem("token");
  const [facebookSettings, setFacebookSettings] = useState(DEFAULT_SETTINGS);
  const [instagramSettings, setInstagramSettings] = useState(DEFAULT_SETTINGS);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const fetchFacebookSettings = useCallback(async () => {
    const res = await fetch(apiUrl("/analytics/facebook/auto-reply/settings"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.status === "success" && data.settings) {
      setFacebookSettings((prev) => ({ ...prev, ...data.settings }));
    }
  }, [token]);

  const fetchInstagramSettings = useCallback(async () => {
    const res = await fetch(apiUrl("/analytics/instagram/auto-reply/settings"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.status === "success" && data.settings) {
      setInstagramSettings((prev) => ({ ...prev, ...data.settings }));
    }
  }, [token]);

  const fetchHealth = useCallback(async () => {
    const res = await fetch(apiUrl("/analytics/dashboard?range_days=7"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.status === "success") {
      setHealth(data.dashboard?.automation_health || null);
    }
  }, [token]);

  const loadAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) {
      setRefreshing(true);
    }
    setError("");
    try {
      await Promise.all([fetchFacebookSettings(), fetchInstagramSettings(), fetchHealth()]);
    } catch (err) {
      setError(err?.message || "Failed to load automation settings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchFacebookSettings, fetchInstagramSettings, fetchHealth]);

  useEffect(() => {
    loadAll();

    // Backend automation runs continuously via scheduler; this interval only refreshes UI status.
    const timer = setInterval(() => {
      loadAll(false);
    }, 20000);

    return () => clearInterval(timer);
  }, [loadAll]);

  const updateFacebookSettings = async (newSettings) => {
    setSettingsLoading(true);
    try {
      if ("auto_reply_enabled" in newSettings) {
        await fetch(apiUrl("/analytics/facebook/auto-reply/toggle"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ enabled: newSettings.auto_reply_enabled }),
        });
      }

      if (
        "reply_mode" in newSettings ||
        "reply_tone" in newSettings ||
        "reply_delay_minutes" in newSettings ||
        "dm_enabled" in newSettings ||
        "dm_reply_mode" in newSettings ||
        "dm_reply_tone" in newSettings ||
        "dm_reply_delay_minutes" in newSettings
      ) {
        await fetch(apiUrl("/analytics/facebook/auto-reply/settings"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            reply_mode: newSettings.reply_mode || facebookSettings.reply_mode || "ai",
            reply_tone: newSettings.reply_tone || facebookSettings.reply_tone,
            reply_delay_minutes: newSettings.reply_delay_minutes ?? facebookSettings.reply_delay_minutes,
            dm_enabled: newSettings.dm_enabled ?? facebookSettings.dm_enabled,
            dm_reply_mode: newSettings.dm_reply_mode || facebookSettings.dm_reply_mode || "ai",
            dm_reply_tone: newSettings.dm_reply_tone || facebookSettings.dm_reply_tone,
            dm_reply_delay_minutes: newSettings.dm_reply_delay_minutes ?? facebookSettings.dm_reply_delay_minutes,
          }),
        });
      }

      setFacebookSettings((prev) => ({ ...prev, ...newSettings }));
    } catch (err) {
      setError(err?.message || "Failed to update Facebook automation settings.");
    }
    setSettingsLoading(false);
  };

  const updateInstagramSettings = async (newSettings) => {
    setSettingsLoading(true);
    try {
      if ("auto_reply_enabled" in newSettings) {
        await fetch(apiUrl("/analytics/instagram/auto-reply/toggle"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ enabled: newSettings.auto_reply_enabled }),
        });
      }

      if (
        "reply_mode" in newSettings ||
        "reply_tone" in newSettings ||
        "reply_delay_minutes" in newSettings ||
        "dm_enabled" in newSettings ||
        "dm_reply_mode" in newSettings ||
        "dm_reply_tone" in newSettings ||
        "dm_reply_delay_minutes" in newSettings
      ) {
        await fetch(apiUrl("/analytics/instagram/auto-reply/settings"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            reply_mode: newSettings.reply_mode || instagramSettings.reply_mode || "ai",
            reply_tone: newSettings.reply_tone || instagramSettings.reply_tone,
            reply_delay_minutes: newSettings.reply_delay_minutes ?? instagramSettings.reply_delay_minutes,
            dm_enabled: newSettings.dm_enabled ?? instagramSettings.dm_enabled,
            dm_reply_mode: newSettings.dm_reply_mode || instagramSettings.dm_reply_mode || "ai",
            dm_reply_tone: newSettings.dm_reply_tone || instagramSettings.dm_reply_tone,
            dm_reply_delay_minutes: newSettings.dm_reply_delay_minutes ?? instagramSettings.dm_reply_delay_minutes,
          }),
        });
      }

      setInstagramSettings((prev) => ({ ...prev, ...newSettings }));
    } catch (err) {
      setError(err?.message || "Failed to update Instagram automation settings.");
    }
    setSettingsLoading(false);
  };

  return (
    <div className="mx-auto max-w-7xl p-6 text-slate-900 dark:text-slate-100">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Automation Center</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Auto-comment and auto-DM run in backend background jobs, even when this page is closed.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadAll(true)}
          disabled={refreshing}
          aria-label="Refresh status"
          title="Refresh status"
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white p-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        >
          {refreshing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      {health && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900/70">
          <div className="mb-2 flex items-center gap-2 text-slate-700 dark:text-slate-200">
            <Activity size={16} className="text-emerald-500" />
            <span className="text-sm font-semibold">Live Automation Health (last 7 days)</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Replies Sent</p>
              <p className="text-lg font-bold">{health.sent_replies ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Pending Queue</p>
              <p className="text-lg font-bold">{health.pending_actions ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Failed Actions</p>
              <p className="text-lg font-bold">{health.failed_actions ?? 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <p className="text-xs text-slate-500 dark:text-slate-400">Skipped Actions</p>
              <p className="text-lg font-bold">{health.skipped_actions ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-300/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading automation settings...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <AutoReplySettingsPanel
            platform="facebook"
            settings={facebookSettings}
            onToggle={(enabled) => updateFacebookSettings({ auto_reply_enabled: enabled })}
            onUpdateReplyMode={(mode) => updateFacebookSettings({ reply_mode: mode })}
            onUpdateTone={(tone) => updateFacebookSettings({ reply_tone: tone })}
            onUpdateDelay={(delay) => updateFacebookSettings({ reply_delay_minutes: delay })}
            onToggleDM={(enabled) => updateFacebookSettings({ dm_enabled: enabled })}
            onUpdateDMReplyMode={(mode) => updateFacebookSettings({ dm_reply_mode: mode })}
            onUpdateDMTone={(tone) => updateFacebookSettings({ dm_reply_tone: tone })}
            onUpdateDMDelay={(delay) => updateFacebookSettings({ dm_reply_delay_minutes: delay })}
            isLoading={settingsLoading}
          />

          <AutoReplySettingsPanel
            platform="instagram"
            settings={instagramSettings}
            onToggle={(enabled) => updateInstagramSettings({ auto_reply_enabled: enabled })}
            onUpdateReplyMode={(mode) => updateInstagramSettings({ reply_mode: mode })}
            onUpdateTone={(tone) => updateInstagramSettings({ reply_tone: tone })}
            onUpdateDelay={(delay) => updateInstagramSettings({ reply_delay_minutes: delay })}
            onToggleDM={(enabled) => updateInstagramSettings({ dm_enabled: enabled })}
            onUpdateDMReplyMode={(mode) => updateInstagramSettings({ dm_reply_mode: mode })}
            onUpdateDMTone={(tone) => updateInstagramSettings({ dm_reply_tone: tone })}
            onUpdateDMDelay={(delay) => updateInstagramSettings({ dm_reply_delay_minutes: delay })}
            isLoading={settingsLoading}
          />
        </div>
      )}
    </div>
  );
}
