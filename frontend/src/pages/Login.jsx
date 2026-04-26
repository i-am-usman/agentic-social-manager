import React, { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Bot, KeyRound, Loader2, Lock, Mail, Moon, ShieldCheck, Sparkles, Sun } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { useTheme } from "../context/ThemeContext";
import { apiUrl } from "../config/api";

export default function Login({ setIsAuthenticated }) {
  const passwordInputRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [showResetPanel, setShowResetPanel] = useState(false);
  const [resetStep, setResetStep] = useState("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [resetEmailFocused, setResetEmailFocused] = useState(false);
  const [resetNewPasswordFocused, setResetNewPasswordFocused] = useState(false);
  const [resetConfirmPasswordFocused, setResetConfirmPasswordFocused] = useState(false);

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const hasEmail = email.trim().length > 0;
  const hasPassword = password.trim().length > 0;
  const hasResetEmail = resetEmail.trim().length > 0;
  const hasResetToken = resetToken.trim().length > 0;
  const hasResetNewPassword = resetNewPassword.trim().length > 0;
  const hasResetConfirmPassword = resetConfirmPassword.trim().length > 0;

  const orbIntensity = passwordFocused ? 1 : emailFocused || hasEmail ? 0.72 : 0.56;
  const orbScale = passwordFocused ? 1.08 : hasEmail ? 0.98 : 1;

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const hasStrongPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

  const openResetPanel = () => {
    setResetError("");
    setResetSuccess("");
    setResetEmail((previous) => previous || email);
    setResetStep("request");
    setShowResetPanel(true);
  };

  const closeResetPanel = () => {
    setShowResetPanel(false);
    setResetStep("request");
    setResetError("");
    setResetSuccess("");
    setResetToken("");
    setResetNewPassword("");
    setResetConfirmPassword("");
  };

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
      const res = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.access_token);
        setIsAuthenticated(true);

        try {
          const statsRes = await fetch(apiUrl("/posts/stats"), {
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
        navigate("/dashboard");
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

  const handleRequestResetCode = async () => {
    setResetError("");
    setResetSuccess("");

    if (!resetEmail.trim()) {
      setResetError("Please enter your account email.");
      return;
    }

    if (!isValidEmail(resetEmail)) {
      setResetError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();
      if (res.ok) {
        setResetSuccess(data?.message || "Reset code requested. Check your email.");
        if (data?.reset_token) {
          setResetToken(data.reset_token);
          setResetSuccess(`${data.message} Development token auto-filled.`);
        }
        setResetStep("confirm");
      } else {
        const detail = Array.isArray(data?.detail)
          ? data.detail.map((item) => item?.msg || "Invalid input").join(" ")
          : data?.detail;
        setResetError(detail || "Unable to request reset code. Please try again.");
      }
    } catch (err) {
      setResetError("Unable to request reset code right now. Please try again in a moment.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetError("");
    setResetSuccess("");

    if (!resetEmail.trim() || !resetToken.trim() || !resetNewPassword || !resetConfirmPassword) {
      setResetError("Please complete all reset fields.");
      return;
    }

    if (!isValidEmail(resetEmail)) {
      setResetError("Please enter a valid email address.");
      return;
    }

    if (!hasStrongPassword(resetNewPassword)) {
      setResetError("New password must be at least 8 characters and include uppercase, lowercase, and a number.");
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("New password and confirm password do not match.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch(apiUrl("/auth/reset-password/confirm"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resetEmail,
          reset_token: resetToken,
          new_password: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResetSuccess(data?.message || "Password reset successful. You can now sign in.");
        setEmail(resetEmail);
        setPassword("");
        setResetToken("");
        setResetNewPassword("");
        setResetConfirmPassword("");

        setTimeout(() => {
          closeResetPanel();
          passwordInputRef.current?.focus();
        }, 900);
      } else {
        const detail = Array.isArray(data?.detail)
          ? data.detail.map((item) => item?.msg || "Invalid input").join(" ")
          : data?.detail;
        setResetError(detail || "Unable to reset password. Please try again.");
      }
    } catch (err) {
      setResetError("Unable to reset password right now. Please try again in a moment.");
    } finally {
      setResetLoading(false);
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
        <div className="mt-6 space-y-2 text-center text-sm text-slate-600 dark:text-slate-300">
          <p>
            Dont have an account?{" "}
            <Link to="/register" className="font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200">
              Register
            </Link>
          </p>
          <p>
            Admin access?{" "}
            <Link to="/admin/login" className="font-semibold text-slate-900 transition-colors hover:text-indigo-600 dark:text-white dark:hover:text-indigo-300">
              Open admin panel
            </Link>
          </p>
        </div>
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
              ref={passwordInputRef}
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

        <div className="flex justify-end">
          {!showResetPanel ? (
            <button
              type="button"
              onClick={openResetPanel}
              className="text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
            >
              Forgot password?
            </button>
          ) : (
            <button
              type="button"
              onClick={closeResetPanel}
              className="text-xs font-semibold text-slate-600 transition-colors hover:text-slate-500 dark:text-slate-300 dark:hover:text-slate-200"
            >
              Close reset panel
            </button>
          )}
        </div>

        {showResetPanel && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-slate-900/80">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              <KeyRound size={14} />
              {resetStep === "request" ? "Request reset code" : "Confirm password reset"}
            </div>

            {resetError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-300/40 dark:bg-rose-500/10 dark:text-rose-100">
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-300/40 dark:bg-emerald-500/10 dark:text-emerald-100">
                {resetSuccess}
              </div>
            )}

            <label className="block space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Email</span>
              <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${resetEmailFocused ? "border-indigo-400 bg-white shadow-[0_0_0_1px_rgba(99,102,241,0.2)] dark:bg-slate-800/80 dark:shadow-[0_0_0_1px_rgba(99,102,241,0.35)]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70"}`}>
                <Mail size={16} className={resetEmailFocused || hasResetEmail ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400"} />
                <input
                  type="email"
                  placeholder="you@company.com"
                  className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  onFocus={() => setResetEmailFocused(true)}
                  onBlur={() => setResetEmailFocused(false)}
                />
              </div>
            </label>

            {resetStep === "confirm" && (
              <label className="block space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Reset code</span>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 transition-all dark:border-white/10 dark:bg-slate-900/70">
                  <KeyRound size={16} className={hasResetToken ? "text-indigo-600 dark:text-indigo-300" : "text-slate-400"} />
                  <input
                    type="text"
                    placeholder="Paste reset code"
                    className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                  />
                </div>
              </label>
            )}

            {resetStep === "confirm" && (
              <>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">New password</span>
                  <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${resetNewPasswordFocused ? "border-purple-400 bg-white shadow-[0_0_0_1px_rgba(147,51,234,0.2)] dark:bg-slate-800/80 dark:shadow-[0_0_0_1px_rgba(147,51,234,0.35)]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70"}`}>
                    <Lock size={16} className={resetNewPasswordFocused || hasResetNewPassword ? "text-purple-600 dark:text-purple-300" : "text-slate-400"} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      onFocus={() => setResetNewPasswordFocused(true)}
                      onBlur={() => setResetNewPasswordFocused(false)}
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Confirm new password</span>
                  <div className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${resetConfirmPasswordFocused ? "border-purple-400 bg-white shadow-[0_0_0_1px_rgba(147,51,234,0.2)] dark:bg-slate-800/80 dark:shadow-[0_0_0_1px_rgba(147,51,234,0.35)]" : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/70"}`}>
                    <Lock size={16} className={resetConfirmPasswordFocused || hasResetConfirmPassword ? "text-purple-600 dark:text-purple-300" : "text-slate-400"} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full appearance-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      onFocus={() => setResetConfirmPasswordFocused(true)}
                      onBlur={() => setResetConfirmPasswordFocused(false)}
                    />
                  </div>
                </label>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Use at least 8 characters with uppercase, lowercase, and a number.
                </p>
              </>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleRequestResetCode}
                disabled={resetLoading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/20 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {resetLoading && resetStep === "request" ? <Loader2 className="animate-spin" size={14} /> : <Mail size={14} />}
                {resetLoading && resetStep === "request" ? "Requesting code" : "Request code"}
              </button>

              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resetLoading || resetStep !== "confirm"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                {resetLoading && resetStep === "confirm" ? <Loader2 className="animate-spin" size={14} /> : <KeyRound size={14} />}
                {resetLoading && resetStep === "confirm" ? "Resetting password" : "Confirm reset"}
              </button>
            </div>
          </div>
        )}

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
