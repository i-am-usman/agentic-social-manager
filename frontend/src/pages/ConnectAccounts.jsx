import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Facebook, Instagram, Link, Linkedin, Loader2, Unplug } from "lucide-react";
import { API_BASE_URL, apiUrl } from "../config/api";

const INITIAL_ACCOUNTS = {
  facebook: { connected: false },
  instagram: { connected: false },
  linkedin_personal: { connected: false },
  linkedin_company: { connected: false },
};

export default function ConnectAccounts() {
  const token = localStorage.getItem("token");
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [pageError, setPageError] = useState("");
  const [status, setStatus] = useState({});
  const [isMetaRedirecting, setIsMetaRedirecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState({});
  const [oauthSetupHint, setOauthSetupHint] = useState("");

  const metaConnected = accounts.facebook?.connected || accounts.instagram?.connected;

  const toMessage = (detail) => {
    if (!detail) return "Unexpected error.";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || item?.message || JSON.stringify(item))
        .join(" ")
        .trim();
    }
    if (typeof detail === "object") {
      if (detail.message) return detail.message;
      if (detail.msg) return detail.msg;
      return JSON.stringify(detail);
    }
    return String(detail);
  };

  const flashMessage = useMemo(() => {
    const raw = sessionStorage.getItem("accounts_oauth_flash");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/accounts/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Unable to fetch account status.");
      }
      const data = await res.json();
      setAccounts(data.accounts || INITIAL_ACCOUNTS);
    } catch (_) {
      setPageError("Failed to fetch connected accounts. Please refresh.");
    }
  }, [token]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (!flashMessage) return;

    const kind = flashMessage.type === "error" ? "error" : "success";
    setStatus((prev) => ({
      ...prev,
      meta: { type: kind, message: flashMessage.message || "Connection updated." },
    }));
    sessionStorage.removeItem("accounts_oauth_flash");
  }, [flashMessage]);

  const beginMetaOAuth = async () => {
    if (!token) {
      setStatus((prev) => ({
        ...prev,
        meta: { type: "error", message: "Please sign in again before connecting accounts." },
      }));
      return;
    }

    setPageError("");
    setOauthSetupHint("");
    setIsMetaRedirecting(true);
    setStatus((prev) => ({ ...prev, meta: { type: "info", message: "Preparing Meta secure login..." } }));

    try {
      const res = await fetch(apiUrl("/accounts/meta/login-url"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.auth_url) {
        const message = toMessage(data?.detail || data?.message || "Unable to start Meta login.");
        if (message.toLowerCase().includes("meta oauth configuration")) {
          setOauthSetupHint(
            "Check backend/.env for META_APP_ID and META_APP_SECRET, then ensure Meta App Dashboard uses the ngrok callback URL exactly."
          );
        }
        throw new Error(message);
      }
      window.location.href = data.auth_url;
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        meta: { type: "error", message: err?.message || "Unable to start Meta login." },
      }));
      setIsMetaRedirecting(false);
    }
  };

  const disconnectAccount = async (platform) => {
    if (!token) return;
    setDisconnecting((prev) => ({ ...prev, [platform]: true }));
    setStatus((prev) => ({ ...prev, [platform]: { type: "info", message: "Disconnecting..." } }));

    try {
      const res = await fetch(apiUrl(`/accounts/${platform}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(toMessage(data?.detail || "Failed to disconnect."));
      }
      setStatus((prev) => ({ ...prev, [platform]: { type: "success", message: "Disconnected." } }));
      await fetchAccounts();
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        [platform]: { type: "error", message: err?.message || "Failed to disconnect." },
      }));
    } finally {
      setDisconnecting((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const Status = ({ slot }) => {
    const entry = status[slot];
    if (!entry) return null;
    const tone =
      entry.type === "error"
        ? "text-rose-600 dark:text-rose-300"
        : entry.type === "success"
          ? "text-emerald-600 dark:text-emerald-300"
          : "text-slate-500 dark:text-slate-400";
    return <p className={`mt-2 text-xs ${tone}`}>{entry.message}</p>;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 dark:bg-transparent dark:text-slate-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Connect Social Accounts</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            One-click Meta OAuth for Facebook and Instagram, with secure redirect handling.
          </p>
          {pageError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{pageError}</p>}
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-900/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200">
                <Link size={14} /> Meta OAuth
              </div>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Connect Facebook and Instagram
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Click once to open official Meta login, approve permissions, and automatically link your page assets.
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Redirect URI expected: <span className="font-semibold">http://localhost:3000/connect/callback</span>
              </p>
            </div>

            <button
              type="button"
              onClick={beginMetaOAuth}
              disabled={isMetaRedirecting}
              className="inline-flex min-w-64 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(79,70,229,0.75)] transition-all hover:translate-y-[-1px] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isMetaRedirecting ? <Loader2 size={18} className="animate-spin" /> : <Facebook size={18} />}
              {isMetaRedirecting ? "Opening Meta Login..." : "Connect Facebook and Instagram"}
            </button>
          </div>

          <Status slot="meta" />
          {oauthSetupHint && (
            <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
              {oauthSetupHint}
            </p>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/70">
            <div className="mb-2 flex items-center gap-2">
              <Facebook size={18} className="text-blue-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Facebook</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {accounts.facebook?.connected
                ? `Connected page: ${accounts.facebook?.page_id || "-"}`
                : "Not connected"}
            </p>
            {accounts.facebook?.connected && (
              <button
                type="button"
                onClick={() => disconnectAccount("facebook")}
                disabled={disconnecting.facebook}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-300/40 dark:bg-rose-500/10 dark:text-rose-200"
              >
                {disconnecting.facebook ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                Disconnect
              </button>
            )}
            <Status slot="facebook" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/70">
            <div className="mb-2 flex items-center gap-2">
              <Instagram size={18} className="text-pink-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Instagram</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {accounts.instagram?.connected
                ? `Connected IG user: ${accounts.instagram?.ig_user_id || "-"}`
                : "Not connected"}
            </p>
            {accounts.instagram?.connected && (
              <button
                type="button"
                onClick={() => disconnectAccount("instagram")}
                disabled={disconnecting.instagram}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60 dark:border-rose-300/40 dark:bg-rose-500/10 dark:text-rose-200"
              >
                {disconnecting.instagram ? <Loader2 size={14} className="animate-spin" /> : <Unplug size={14} />}
                Disconnect
              </button>
            )}
            <Status slot="instagram" />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/70">
          <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">LinkedIn</h3>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            LinkedIn remains on your existing flow. Meta OAuth changes only affect Facebook and Instagram.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="mb-2 flex items-center gap-2">
                <Linkedin size={16} className="text-blue-700" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Personal Profile</p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {accounts.linkedin_personal?.connected
                  ? `Connected: ${accounts.linkedin_personal?.linkedin_user_id || "LinkedIn user"}`
                  : "Not connected"}
              </p>
              {accounts.linkedin_personal?.connected && (
                <button
                  type="button"
                  onClick={() => disconnectAccount("linkedin-personal")}
                  disabled={disconnecting["linkedin-personal"]}
                  className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-300"
                >
                  {disconnecting["linkedin-personal"] ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
              <Status slot="linkedin-personal" />
            </div>

            <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <div className="mb-2 flex items-center gap-2">
                <Linkedin size={16} className="text-blue-700" />
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Company Page</p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {accounts.linkedin_company?.connected
                  ? `Connected: ${accounts.linkedin_company?.organization_id || accounts.linkedin_company?.linkedin_user_id || "Company page"}`
                  : "Not connected"}
              </p>
              {accounts.linkedin_company?.connected && (
                <button
                  type="button"
                  onClick={() => disconnectAccount("linkedin-company")}
                  disabled={disconnecting["linkedin-company"]}
                  className="mt-3 text-xs font-semibold text-rose-600 dark:text-rose-300"
                >
                  {disconnecting["linkedin-company"] ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
              <Status slot="linkedin-company" />
            </div>
          </div>
        </section>

        {metaConnected && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-300/30 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 size={14} /> Meta account linked successfully
          </div>
        )}

        <p className="text-xs text-slate-500 dark:text-slate-400">API base: {API_BASE_URL}</p>
      </div>
    </div>
  );
}
