import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2, ShieldCheck, UserPlus, Lock } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { apiUrl } from "../config/api";

export default function AdminRegister() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username.trim() || !email.trim() || !password.trim() || !inviteCode.trim()) {
      setError("Please complete all admin registration fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/admin/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, invite_code: inviteCode }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data?.detail || "Admin registration failed.");
        return;
      }

      setSuccess(data?.message || "Admin registered successfully.");
      setTimeout(() => navigate("/admin/login"), 900);
    } catch (err) {
      setError("Unable to register admin account right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badgeIcon={ShieldCheck}
      badgeText="ADMIN SETUP"
      heroTitle="Create an admin account"
      heroDescription="Register a privileged account with an invite code, then sign in to access the feedback console."
      featureItems={[
        { icon: ShieldCheck, title: "Protected", text: "Registration requires a valid invite code." },
        { icon: UserPlus, title: "Bootstrap", text: "Create the first admin account securely." },
        { icon: Lock, title: "Role-based", text: "The account is stored with admin access only." },
      ]}
      statusLabel="Admin onboarding"
      statusTitle="Invite-only registration"
      statusDescription="Use this page to create an admin account for the feedback console."
      cardIcon={ShieldCheck}
      cardTitle="Admin Registration"
      cardDescription="Enter the invite code and credentials to create the admin user."
      footer={(
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link to="/admin/login" className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-300">
            Back to admin login
          </Link>
        </div>
      )}
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="Admin name"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
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
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Invite code</label>
          <input
            type="password"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder="Admin registration secret"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          {loading ? "Creating account..." : "Create admin account"}
        </button>
      </form>
    </AuthShell>
  );
}