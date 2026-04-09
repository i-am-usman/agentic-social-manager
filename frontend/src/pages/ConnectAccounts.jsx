import React, { useCallback, useEffect, useState } from "react";
import { Facebook, Instagram, Linkedin } from "lucide-react";

export default function ConnectAccounts() {
  const [accounts, setAccounts] = useState({
    facebook: { connected: false },
    instagram: { connected: false },
    linkedin_personal: { connected: false },
    linkedin_company: { connected: false },
  });

  const [fbForm, setFbForm] = useState({ pageId: "", accessToken: "" });
  const [igForm, setIgForm] = useState({ igUserId: "", accessToken: "" });
  const [liPersonalForm, setLiPersonalForm] = useState({ linkedinUserId: "", accessToken: "" });
  const [liCompanyForm, setLiCompanyForm] = useState({
    linkedinUserId: "",
    accessToken: "",
    organizationId: "",
  });

  const [status, setStatus] = useState({});
  const [formErrors, setFormErrors] = useState({
    facebook: "",
    instagram: "",
    linkedin_personal: "",
    linkedin_company: "",
  });
  const [loadState, setLoadState] = useState({
    facebook: false,
    instagram: false,
    linkedin_personal: false,
    linkedin_company: false,
  });
  const [pageError, setPageError] = useState("");

  const token = localStorage.getItem("token");

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

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/accounts/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setAccounts(
        data.accounts || {
          facebook: { connected: false },
          instagram: { connected: false },
          linkedin_personal: { connected: false },
          linkedin_company: { connected: false },
        }
      );
    } catch (err) {
      setPageError("Failed to fetch connected accounts. Please refresh.");
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchAccounts();
    }
  }, [token, fetchAccounts]);

  const connectAccount = async (platform, formData) => {
    setFormErrors((prev) => ({ ...prev, [platform]: "" }));
    setPageError("");

    let payload;

    if (platform === "facebook") {
      if (!formData.pageId || !formData.accessToken) {
        setFormErrors((prev) => ({ ...prev, facebook: "Page ID and access token are required." }));
        return;
      }
      payload = { platform, page_id: formData.pageId, access_token: formData.accessToken };
    } else if (platform === "instagram") {
      if (!formData.igUserId || !formData.accessToken) {
        setFormErrors((prev) => ({ ...prev, instagram: "User ID and access token are required." }));
        return;
      }
      payload = { platform, ig_user_id: formData.igUserId, access_token: formData.accessToken };
    } else if (platform === "linkedin-personal") {
      if (!formData.linkedinUserId || !formData.accessToken) {
        setFormErrors((prev) => ({ ...prev, linkedin_personal: "User ID and access token are required." }));
        return;
      }
      payload = {
        platform,
        linkedin_user_id: formData.linkedinUserId,
        access_token: formData.accessToken,
        linkedin_connection_type: "personal",
      };
    } else if (platform === "linkedin-company") {
      if (!formData.linkedinUserId || !formData.accessToken || !formData.organizationId) {
        setFormErrors((prev) => ({
          ...prev,
          linkedin_company: "User ID, access token, and organization ID are all required.",
        }));
        return;
      }
      payload = {
        platform,
        linkedin_user_id: formData.linkedinUserId,
        access_token: formData.accessToken,
        linkedin_organization_id: formData.organizationId,
        linkedin_connection_type: "company",
      };
    }

    setLoadState((prev) => ({ ...prev, [platform]: true }));
    setStatus((prev) => ({
      ...prev,
      [platform]: { message: "Validating...", type: "info" },
    }));

    try {
      const res = await fetch("http://127.0.0.1:8000/accounts/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setStatus((prev) => ({
          ...prev,
          [platform]: { message: "Connected.", type: "success" },
        }));

        if (platform === "facebook") {
          setFbForm({ pageId: "", accessToken: "" });
        } else if (platform === "instagram") {
          setIgForm({ igUserId: "", accessToken: "" });
        } else if (platform === "linkedin-personal") {
          setLiPersonalForm({ linkedinUserId: "", accessToken: "" });
        } else if (platform === "linkedin-company") {
          setLiCompanyForm({ linkedinUserId: "", accessToken: "", organizationId: "" });
        }

        fetchAccounts();
      } else {
        setStatus((prev) => ({
          ...prev,
          [platform]: { message: toMessage(data.detail) || "Failed to connect.", type: "error" },
        }));
      }
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        [platform]: { message: "Failed to connect.", type: "error" },
      }));
    } finally {
      setLoadState((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const disconnectAccount = async (platform) => {
    setLoadState((prev) => ({ ...prev, [platform]: true }));
    setStatus((prev) => ({
      ...prev,
      [platform]: { message: "Disconnecting...", type: "info" },
    }));
    try {
      const res = await fetch(`http://127.0.0.1:8000/accounts/${platform}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setStatus((prev) => ({
          ...prev,
          [platform]: { message: "Disconnected.", type: "success" },
        }));
        fetchAccounts();
      } else {
        setStatus((prev) => ({
          ...prev,
          [platform]: { message: toMessage(data.detail) || "Failed to disconnect.", type: "error" },
        }));
      }
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        [platform]: { message: "Failed to disconnect.", type: "error" },
      }));
    } finally {
      setLoadState((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const StatusMessage = ({ platform }) => {
    const msg = status[platform];
    if (!msg) return null;
    return (
      <p
        className={`mt-2 text-xs ${
          msg.type === "error"
            ? "text-rose-600 dark:text-rose-300"
            : msg.type === "success"
              ? "text-emerald-600 dark:text-emerald-300"
              : "text-slate-500 dark:text-slate-400"
        }`}
      >
        {msg.message}
      </p>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 sm:p-6 dark:bg-transparent dark:text-slate-100">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Connect Social Accounts</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Connect your social media accounts for seamless publishing and analytics.
          </p>
          {pageError && <p className="mt-2 text-sm text-rose-600 dark:text-rose-300">{pageError}</p>}
        </div>

        {/* Facebook & Instagram Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Facebook Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)]">
            <div className="flex items-center gap-2 mb-2">
              <Facebook size={20} className="text-blue-600" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Facebook Page</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Page ID and Access Token required.</p>

            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                placeholder="Facebook Page ID"
                value={fbForm.pageId}
                onChange={(e) => setFbForm((prev) => ({ ...prev, pageId: e.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                placeholder="Facebook Page Access Token"
                type="password"
                value={fbForm.accessToken}
                onChange={(e) => setFbForm((prev) => ({ ...prev, accessToken: e.target.value }))}
              />
              {formErrors.facebook && <p className="text-xs text-rose-300">{formErrors.facebook}</p>}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => connectAccount("facebook", fbForm)}
                className="rounded-full bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(59,130,246,0.22)] transition hover:bg-blue-400 disabled:opacity-60"
                disabled={loadState.facebook}
              >
                {loadState.facebook ? "Saving..." : "Save Facebook"}
              </button>
              {accounts.facebook.connected && (
                <button onClick={() => disconnectAccount("facebook")} className="text-sm text-rose-300">
                  Disconnect
                </button>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {accounts.facebook.connected ? `ID: ${accounts.facebook.page_id}` : "Not connected"}
            </div>

            <StatusMessage platform="facebook" />
          </div>

          {/* Instagram Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)]">
            <div className="flex items-center gap-2 mb-2">
              <Instagram size={20} className="text-pink-600" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Instagram</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">User ID and Access Token required.</p>

            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                placeholder="Instagram User ID"
                value={igForm.igUserId}
                onChange={(e) => setIgForm((prev) => ({ ...prev, igUserId: e.target.value }))}
              />
              <input
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                placeholder="Instagram Access Token"
                type="password"
                value={igForm.accessToken}
                onChange={(e) => setIgForm((prev) => ({ ...prev, accessToken: e.target.value }))}
              />
              {formErrors.instagram && <p className="text-xs text-rose-300">{formErrors.instagram}</p>}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => connectAccount("instagram", igForm)}
                className="rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(236,72,153,0.22)] transition hover:bg-pink-400 disabled:opacity-60"
                disabled={loadState.instagram}
              >
                {loadState.instagram ? "Saving..." : "Save Instagram"}
              </button>
              {accounts.instagram.connected && (
                <button onClick={() => disconnectAccount("instagram")} className="text-sm text-rose-300">
                  Disconnect
                </button>
              )}
            </div>

            <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {accounts.instagram.connected ? `ID: ${accounts.instagram.ig_user_id}` : "Not connected"}
            </div>

            <StatusMessage platform="instagram" />
          </div>
        </div>

        {/* LinkedIn Section */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">LinkedIn Accounts</h2>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            Manage your personal profile and company page separately.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* LinkedIn Personal Profile Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)]">
              <div className="flex items-center gap-2 mb-2">
                <Linkedin size={20} className="text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Profile</h3>
              </div>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Post to your personal LinkedIn profile.</p>

              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                  placeholder="LinkedIn User ID"
                  value={liPersonalForm.linkedinUserId}
                  onChange={(e) => setLiPersonalForm((prev) => ({ ...prev, linkedinUserId: e.target.value }))}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                  placeholder="LinkedIn Access Token"
                  type="password"
                  value={liPersonalForm.accessToken}
                  onChange={(e) => setLiPersonalForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                />
                {formErrors.linkedin_personal && (
                  <p className="text-xs text-rose-300">{formErrors.linkedin_personal}</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => connectAccount("linkedin-personal", liPersonalForm)}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:opacity-60"
                  disabled={loadState.linkedin_personal}
                >
                  {loadState.linkedin_personal ? "Saving..." : "Save Personal"}
                </button>
                {accounts.linkedin_personal.connected && (
                  <button
                    onClick={() => disconnectAccount("linkedin-personal")}
                    className="text-sm text-rose-300"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {accounts.linkedin_personal.connected
                  ? `${accounts.linkedin_personal.linkedin_user_id}`
                  : "Not connected"}
              </div>

              <StatusMessage platform="linkedin_personal" />
            </div>

            {/* LinkedIn Company Page Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.12)] backdrop-blur dark:border-white/10 dark:bg-slate-900/75 dark:shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)]">
              <div className="flex items-center gap-2 mb-2">
                <Linkedin size={20} className="text-blue-700" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Company Page</h3>
              </div>
              <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Post to your company's LinkedIn page.</p>

              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                  placeholder="LinkedIn User ID (page admin)"
                  value={liCompanyForm.linkedinUserId}
                  onChange={(e) => setLiCompanyForm((prev) => ({ ...prev, linkedinUserId: e.target.value }))}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                  placeholder="LinkedIn Access Token"
                  type="password"
                  value={liCompanyForm.accessToken}
                  onChange={(e) => setLiCompanyForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                />
                <input
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-400/40 focus:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10"
                  placeholder="Organization ID (required)"
                  value={liCompanyForm.organizationId}
                  onChange={(e) => setLiCompanyForm((prev) => ({ ...prev, organizationId: e.target.value }))}
                />
                {formErrors.linkedin_company && (
                  <p className="text-xs text-rose-300">{formErrors.linkedin_company}</p>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => connectAccount("linkedin-company", liCompanyForm)}
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.22)] transition hover:bg-blue-500 disabled:opacity-60"
                  disabled={loadState.linkedin_company}
                >
                  {loadState.linkedin_company ? "Saving..." : "Save Company"}
                </button>
                {accounts.linkedin_company.connected && (
                  <button
                    onClick={() => disconnectAccount("linkedin-company")}
                    className="text-sm text-rose-300"
                  >
                    Disconnect
                  </button>
                )}
              </div>

              <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {accounts.linkedin_company.connected
                  ? `Org: ${accounts.linkedin_company.organization_id}`
                  : "Not connected"}
              </div>

              <StatusMessage platform="linkedin_company" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
