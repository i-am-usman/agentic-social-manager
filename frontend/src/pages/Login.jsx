import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Bot, Loader2, Lock, Mail, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useTheme } from "../context/ThemeContext";

export default function Login({ setIsAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const hasEmail = email.trim().length > 0;
  const hasPassword = password.trim().length > 0;
  const orbIntensity = passwordFocused ? 1 : emailFocused || hasEmail ? 0.72 : 0.56;
  const orbScale = passwordFocused ? 1.08 : hasEmail ? 0.98 : 1;

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const handleLogin = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!hasEmail || !hasPassword) {
      setFormError("Please enter both email and password.");
      return;
    }

    if (!isValidEmail(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        // ✅ Store JWT
        localStorage.setItem("token", data.access_token);
        setIsAuthenticated(true);

        // ✅ Immediately fetch stats after login
        try {
          const statsRes = await fetch("http://127.0.0.1:8000/posts/stats", {
            headers: { Authorization: `Bearer ${data.access_token}` },
          });
          const statsData = await statsRes.json();

          if (statsData.stats) {
            localStorage.setItem("userStats", JSON.stringify(statsData.stats));
          }
        } catch (statsErr) {
          console.error("Error fetching stats:", statsErr);
        }

        setFormSuccess("Sign in successful. Redirecting to your dashboard...");
        sessionStorage.setItem("auth_flash_message", "Sign in successful. Welcome back to ASMA.");
        navigate("/dashboard"); // ✅ redirect
      } else {
        const detail = Array.isArray(data?.detail)
          ? data.detail.map((item) => item?.msg || "Invalid input").join(" ")
          : data?.detail;
        setFormError(detail || "Login failed. Please check your credentials and try again.");
      }
    } catch (err) {
      setFormError("Unable to sign in right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badgeIcon={ShieldCheck}
      badgeText="ASMA SECURE LOGIN"
      heroTitle="Wake up your AI social command center."
      heroDescription="Sign in to manage automation, monitor engagement, and steer your Facebook and Instagram workflows from one premium dashboard."
      featureItems={[
        { icon: Bot, title: "AI Replies", text: "Track automated responses in real time." },
        { icon: Sparkles, title: "Predictive Insights", text: "Spot spikes and best posting windows." },
        { icon: ShieldCheck, title: "Secure Access", text: "JWT-backed login with protected routes." },
      ]}
      statusLabel="AI core status"
      statusTitle="The assistant is ready to activate."
      statusDescription="Typing your email wakes the core, focusing the password field locks it into secure mode, and signing in brings the whole interface online."
      orbIcon={Sparkles}
      orbScale={orbScale}
      orbOpacity={orbIntensity}
      cardIcon={Sparkles}
      cardTitle="Welcome back"
      cardDescription="Log in to continue to your ASMA command center."
      cardAction={(
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          title={theme === "dark" ? "Light Theme" : "Dark Theme"}
        >
          {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          {theme === "dark" ? "Light" : "Dark"}
        </button>
      )}
      footer={(
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
          Don’t have an account?{" "}
          <Link to="/register" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200">
            Register
          </Link>
        </p>
      )}
    >
      <form onSubmit={handleLogin} className="space-y-4">
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

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <ArrowRight size={18} />}
          {loading ? "Signing in" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}