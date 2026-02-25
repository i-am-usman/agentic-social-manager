import React, { useEffect, useState } from "react";

export default function ConnectAccounts() {
  const [accounts, setAccounts] = useState({
    facebook: { connected: false },
    instagram: { connected: false },
  });
  const [fbForm, setFbForm] = useState({ pageId: "", accessToken: "" });
  const [igForm, setIgForm] = useState({ igUserId: "", accessToken: "" });
  const [status, setStatus] = useState({});
  const [formErrors, setFormErrors] = useState({ facebook: "", instagram: "" });
  const [loadState, setLoadState] = useState({ facebook: false, instagram: false });
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

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/accounts/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setAccounts(data.accounts || accounts);
      } catch (err) {
        setPageError("Failed to fetch connected accounts. Please refresh.");
      }
    };

    fetchAccounts();
  }, []);

  const connectAccount = async (platform) => {
    setFormErrors((prev) => ({ ...prev, [platform]: "" }));
    setPageError("");
    const payload =
      platform === "facebook"
        ? { platform, page_id: fbForm.pageId, access_token: fbForm.accessToken }
        : { platform, ig_user_id: igForm.igUserId, access_token: igForm.accessToken };

    if (platform === "facebook" && (!fbForm.pageId || !fbForm.accessToken)) {
      setFormErrors((prev) => ({ ...prev, facebook: "Page ID and access token are required." }));
      return;
    }

    if (platform === "instagram" && (!igForm.igUserId || !igForm.accessToken)) {
      setFormErrors((prev) => ({ ...prev, instagram: "User ID and access token are required." }));
      return;
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
        } else {
          setIgForm({ igUserId: "", accessToken: "" });
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Connect Social Accounts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Add your Facebook Page or Instagram account so only your accounts are used for publishing and analytics.
          </p>
          {pageError && (
            <p className="mt-2 text-sm text-red-600">{pageError}</p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Facebook Page</h2>
            <p className="text-xs text-gray-500 mt-1">
              Requires a Page ID and Page Access Token.
            </p>

            <div className="mt-4 space-y-3">
              <input
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Facebook Page ID"
                value={fbForm.pageId}
                onChange={(e) => setFbForm((prev) => ({ ...prev, pageId: e.target.value }))}
              />
              <input
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Facebook Page Access Token"
                type="password"
                value={fbForm.accessToken}
                onChange={(e) => setFbForm((prev) => ({ ...prev, accessToken: e.target.value }))}
              />
              {formErrors.facebook && (
                <p className="text-xs text-red-600">{formErrors.facebook}</p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => connectAccount("facebook")}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                disabled={loadState.facebook}
              >
                {loadState.facebook ? "Saving..." : "Save Facebook Account"}
              </button>
              {accounts.facebook.connected && (
                <button
                  onClick={() => disconnectAccount("facebook")}
                  className="text-red-600 text-sm"
                >
                  Disconnect
                </button>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-600">
              {accounts.facebook.connected ? (
                <div>
                  Connected Page: {accounts.facebook.page_id || "Unknown"} | Token: {accounts.facebook.token}
                </div>
              ) : (
                <div>Not connected</div>
              )}
            </div>

            {status.facebook?.message && (
              <p
                className={`mt-2 text-xs ${
                  status.facebook.type === "error"
                    ? "text-red-600"
                    : status.facebook.type === "success"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {status.facebook.message}
              </p>
            )}
          </div>

          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">Instagram</h2>
            <p className="text-xs text-gray-500 mt-1">
              Requires an Instagram User ID and Access Token.
            </p>

            <div className="mt-4 space-y-3">
              <input
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Instagram User ID"
                value={igForm.igUserId}
                onChange={(e) => setIgForm((prev) => ({ ...prev, igUserId: e.target.value }))}
              />
              <input
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Instagram Access Token"
                type="password"
                value={igForm.accessToken}
                onChange={(e) => setIgForm((prev) => ({ ...prev, accessToken: e.target.value }))}
              />
              {formErrors.instagram && (
                <p className="text-xs text-red-600">{formErrors.instagram}</p>
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={() => connectAccount("instagram")}
                className="bg-pink-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-60"
                disabled={loadState.instagram}
              >
                {loadState.instagram ? "Saving..." : "Save Instagram Account"}
              </button>
              {accounts.instagram.connected && (
                <button
                  onClick={() => disconnectAccount("instagram")}
                  className="text-red-600 text-sm"
                >
                  Disconnect
                </button>
              )}
            </div>

            <div className="mt-3 text-xs text-gray-600">
              {accounts.instagram.connected ? (
                <div>
                  Connected IG User: {accounts.instagram.ig_user_id || "Unknown"} | Token: {accounts.instagram.token}
                </div>
              ) : (
                <div>Not connected</div>
              )}
            </div>

            {status.instagram?.message && (
              <p
                className={`mt-2 text-xs ${
                  status.instagram.type === "error"
                    ? "text-red-600"
                    : status.instagram.type === "success"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {status.instagram.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
