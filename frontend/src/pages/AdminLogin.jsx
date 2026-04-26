import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { apiUrl } from "../config/api";

export default function AdminLogin({ setIsAdminAuthenticated }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter admin email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.detail || "Admin login failed.");
        setLoading(false);
        return;
      }

      if ((data.role || "user").toLowerCase() !== "admin") {
        setError("This account is not authorized for admin access.");
        setLoading(false);
        return;
      }

      localStorage.setItem("adminToken", data.access_token);
      localStorage.setItem("adminRole", data.role || "admin");
      if (typeof setIsAdminAuthenticated === "function") {
        setIsAdminAuthenticated(true);
      }
      navigate("/admin/feedback");
    } catch (err) {
      setError("Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badgeIcon={ShieldCheck}
      badgeText="ADMIN ACCESS"
      heroTitle="Feedback only. No distractions."
      heroDescription="This console is reserved for administrators to review user feedback and prioritize fixes."
      featureItems={[
        { icon: ShieldCheck, title: "Restricted", text: "Only admin accounts can sign in here." },
        { icon: Lock, title: "Focused", text: "View feedback and nothing else." },
        { icon: ShieldCheck, title: "Actionable", text: "Review comments and trends quickly." },
      ]}
      statusLabel="Admin console"
      statusTitle="Feedback review mode active."
      statusDescription="Use this entry point only if you manage the project."
      cardIcon={ShieldCheck}
      cardTitle="Admin Login"
      cardDescription="Sign in to open the feedback console."
      footer={(
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="flex flex-col gap-2">
            <Link to="/admin/register" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
              Register admin account
            </Link>
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
              Back to user login
            </Link>
          </div>
        </div>
      )}
    >
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Admin email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
          {loading ? "Signing in..." : "Open admin panel"}
        </button>
      </form>
    </AuthShell>
  );
}
