import React, { useState } from "react";
import {
  Sparkles,
  LayoutDashboard,
  Wand2,
  FileText,
  BarChart3,
  MessageSquare,
  Bookmark,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

export default function Navbar({ setIsAuthenticated, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    // ✅ Call logout handler from App.jsx
    if (onLogout) {
      onLogout();
    }
    // ✅ Redirect to login
    navigate("/login");
    setDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const NavLink = ({ to, icon: Icon, label }) => {
    const active = isActive(to);
    return (
      <Link
        to={to}
        className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
          active
            ? "border border-indigo-200 bg-indigo-50 text-slate-800 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white dark:shadow-[0_10px_30px_rgba(99,102,241,0.2)]"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
        }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_12px_40px_rgba(2,6,23,0.35)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
        
        {/* Logo + Title */}
        <Link
          to="/dashboard"
          className="flex flex-shrink-0 items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-400 shadow-[0_18px_40px_rgba(99,102,241,0.35)]">
            <Sparkles className="text-white" size={24} />
          </div>
          <div>
            <span className="block text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">ASMA</span>
            <span className="block text-sm text-slate-700 dark:text-slate-200">Command center</span>
          </div>
        </Link>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/5">
            <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavLink to="/analytics" icon={BarChart3} label="Analytics" />
            <NavLink to="/comment-analysis" icon={MessageSquare} label="Comments" />
          </div>

          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/5">
            <NavLink to="/generate" icon={Wand2} label="Create" />
            <NavLink to="/custom-post" icon={FileText} label="Post" />
            <NavLink to="/saved-content" icon={Bookmark} label="Saved" />
          </div>
        </div>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200 dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            title="User Menu"
          >
            <Menu size={24} />
            <ChevronDown
              size={16}
              className={`absolute right-1 bottom-1 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-slate-200 bg-white py-2 shadow-md backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 dark:border-white/10 dark:bg-slate-900/95 dark:shadow-[0_20px_50px_rgba(2,6,23,0.45)]">
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                <User size={18} className="text-slate-500 dark:text-slate-400" />
                <span className="font-medium">Profile</span>
              </Link>
              <Link
                to="/accounts"
                className="flex items-center gap-3 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings size={18} className="text-slate-500 dark:text-slate-400" />
                <span className="font-medium">Accounts</span>
              </Link>
              <hr className="my-2 border-slate-200 dark:border-white/10" />
              <button
                onClick={() => {
                  toggleTheme();
                  setDropdownOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === "dark" ? "Light Theme" : "Dark Theme"}</span>
              </button>
              <hr className="my-2 border-slate-200 dark:border-white/10" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2 text-left font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}