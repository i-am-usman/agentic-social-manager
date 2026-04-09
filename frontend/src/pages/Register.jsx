import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import AuthShell from "../components/AuthShell";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const navigate = useNavigate();

  const hasUsername = username.trim().length > 0;
  const hasEmail = email.trim().length > 0;
  const hasPassword = password.trim().length > 0;
  const hasConfirmPassword = confirmPassword.trim().length > 0;

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const hasStrongPassword = (value) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

  const handleRegister = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setFormError("Please complete all required fields.");
      return;
    }

    if (!isValidEmail(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    if (!hasStrongPassword(password)) {
      setFormError("Password must be at least 8 characters and include uppercase, lowercase, and a number.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Account created successfully. Redirecting to sign in...");
        setTimeout(() => {
          navigate("/login"); // ✅ redirect after success
        }, 800);
      } else {
        const detail = Array.isArray(data?.detail)
          ? data.detail.map((item) => item?.msg || "Invalid input").join(" ")
          : data?.detail;
        setFormError(detail || "Registration failed. Please check your information and try again.");
      }
    } catch (err) {
      setFormError("Unable to register right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badgeIcon={ShieldCheck}
      badgeText="ASMA ACCOUNT SETUP"
      heroTitle="Launch your AI social workflow in minutes."
      heroDescription="Create your ASMA account to unlock automated replies, engagement analytics, and AI-powered posting intelligence for your social channels."
      featureItems={[
        { icon: UserPlus, title: "Quick Setup", text: "Get started with a guided onboarding flow." },
        { icon: Bot, title: "AI Automation", text: "Enable smart responses and content workflows." },
        { icon: ShieldCheck, title: "Secure by Design", text: "Protected auth with policy-aware validation." },
      ]}
      statusLabel="Setup status"
      statusTitle="Create profile. Activate automation."
      statusDescription="Enter your details, secure your account with a strong password, and you are ready to move straight into the ASMA command center."
      orbIcon={UserPlus}
      cardIcon={Sparkles}
      cardTitle="Create account"
      cardDescription="Set up your ASMA workspace and start automating."
      footer={(
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200">
            Sign in
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleRegister} className="space-y-4">
        {formError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-300/40 dark:bg-rose-500/10 dark:text-rose-100">
            {formError}
          </div>
        )}

        {formSuccess && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-500/10 dark:text-emerald-100">
            {formSuccess}
          </div>
        )}

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Username</span>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${usernameFocused ? "border-indigo-400 bg-slate-50 shadow-[0_0_0_1px_rgba(99,102,241,0.2)] dark:bg-slate-800/80 dark:shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70"}`}>
            <User size={18} className={usernameFocused || hasUsername ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400"} />
            <input
              type="text"
              placeholder="yourname"
              className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:autofill:shadow-[0_0_0px_1000px_rgba(15,23,42,0.22)_inset]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
              required
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Email</span>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${emailFocused ? "border-indigo-400 bg-slate-50 shadow-[0_0_0_1px_rgba(99,102,241,0.2)] dark:bg-slate-800/80 dark:shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70"}`}>
            <Mail size={18} className={emailFocused || hasEmail ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400"} />
            <input
              type="email"
              placeholder="you@company.com"
              className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:autofill:shadow-[0_0_0px_1000px_rgba(15,23,42,0.22)_inset]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              required
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Password</span>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${passwordFocused ? "border-purple-400 bg-slate-50 shadow-[0_0_0_1px_rgba(147,51,234,0.2)] dark:bg-slate-800/80 dark:shadow-[0_0_0_1px_rgba(147,51,234,0.35)]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70"}`}>
            <Lock size={18} className={passwordFocused || hasPassword ? "text-purple-600 dark:text-purple-300" : "text-slate-400"} />
            <input
              type="password"
              placeholder="••••••••"
              className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:autofill:shadow-[0_0_0px_1000px_rgba(15,23,42,0.22)_inset]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              required
            />
          </div>
        </label>

        <p className="-mt-2 text-xs text-slate-500 dark:text-slate-400">
                Use at least 8 characters with uppercase, lowercase, and a number.
              </p>

        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Confirm Password</span>
          <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${confirmPasswordFocused ? "border-purple-400 bg-slate-50 shadow-[0_0_0_1px_rgba(147,51,234,0.2)] dark:bg-slate-800/80 dark:shadow-[0_0_0_1px_rgba(147,51,234,0.35)]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70"}`}>
            <Lock size={18} className={confirmPasswordFocused || hasConfirmPassword ? "text-purple-600 dark:text-purple-300" : "text-slate-400"} />
            <input
              type="password"
              placeholder="••••••••"
              className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:autofill:shadow-[0_0_0px_1000px_rgba(15,23,42,0.22)_inset]"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setConfirmPasswordFocused(true)}
              onBlur={() => setConfirmPasswordFocused(false)}
              required
            />
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          {loading ? "Creating account" : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}