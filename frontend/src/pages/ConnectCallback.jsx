import React, { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiUrl } from "../config/api";

export default function ConnectCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusText, setStatusText] = useState("Securing your accounts...");
  const [errorText, setErrorText] = useState("");

  const code = useMemo(() => searchParams.get("code") || "", [searchParams]);
  const state = useMemo(() => searchParams.get("state") || "", [searchParams]);
  const providerError = useMemo(() => searchParams.get("error") || "", [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    const finish = (type, message, target = "/accounts", delay = 1200) => {
      sessionStorage.setItem("accounts_oauth_flash", JSON.stringify({ type, message }));
      setTimeout(() => {
        navigate(target, { replace: true });
      }, delay);
    };

    const complete = async () => {
      if (providerError) {
        const message = `Meta login was canceled or denied (${providerError}).`;
        setErrorText(message);
        finish("error", message, "/accounts", 1600);
        return;
      }

      if (!token) {
        const message = "Your session expired. Please sign in and connect again.";
        setErrorText(message);
        finish("error", message, "/login", 1600);
        return;
      }

      if (!code || !state) {
        const message = "Missing authorization details from Meta callback.";
        setErrorText(message);
        finish("error", message, "/accounts", 1600);
        return;
      }

      try {
        setStatusText("Finalizing Meta account security...");
        const res = await fetch(apiUrl("/accounts/meta/callback"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code, state }),
        });

        const data = await res.json();
        if (!res.ok) {
          const detail = data?.detail || data?.message || "Failed to finalize Meta connection.";
          throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
        }

        finish("success", data?.message || "Facebook and Instagram connected successfully.", "/accounts", 1000);
      } catch (err) {
        const message = err?.message || "Failed to secure your accounts.";
        setErrorText(message);
        finish("error", message, "/accounts", 1700);
      }
    };

    complete();
  }, [code, navigate, providerError, state]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto mt-12 max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_-40px_rgba(15,23,42,0.4)] dark:border-white/10 dark:bg-slate-900/80">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
          <ShieldCheck size={26} />
        </div>

        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Meta Connection</h1>

        {!errorText ? (
          <div className="mt-4 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200">
              <Loader2 size={14} className="animate-spin" />
              {statusText}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">Please wait while we safely store your account credentials.</p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-300/30 dark:bg-rose-500/10 dark:text-rose-200">
            {errorText}
          </div>
        )}
      </div>
    </div>
  );
}
