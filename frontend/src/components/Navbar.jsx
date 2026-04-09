import React, { useState } from "react";
import {
  Sparkles,
  LayoutDashboard,
  Wand2,
  FileText,
  BarChart3,
  MessageSquare,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar({ setIsAuthenticated, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
            ? "border border-white/10 bg-white/10 text-white shadow-[0_10px_30px_rgba(99,102,241,0.2)]"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 shadow-[0_12px_40px_rgba(2,6,23,0.35)] backdrop-blur-xl">
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
            <span className="block text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">ASMA</span>
            <span className="block text-sm text-slate-200">Command center</span>
          </div>
        </Link>

        <div className="flex flex-1 items-center gap-1 overflow-x-auto px-2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavLink to="/analytics" icon={BarChart3} label="Analytics" />
            <NavLink to="/comment-analysis" icon={MessageSquare} label="Comments" />
          </div>

          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
            <NavLink to="/generate" icon={Wand2} label="Create" />
            <NavLink to="/custom-post" icon={FileText} label="Post" />
          </div>
        </div>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/10 transition-colors hover:bg-white/15"
            title="User Menu"
          >
            <Menu className="text-white" size={24} />
            <ChevronDown
              size={16}
              className={`text-white absolute right-1 bottom-1 transition-transform duration-200 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-white/10 bg-slate-900/95 py-2 shadow-[0_20px_50px_rgba(2,6,23,0.45)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-2 text-slate-200 transition-colors hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                <User size={18} className="text-slate-400" />
                <span className="font-medium">Profile</span>
              </Link>
              <Link
                to="/accounts"
                className="flex items-center gap-3 px-4 py-2 text-slate-200 transition-colors hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings size={18} className="text-slate-400" />
                <span className="font-medium">Accounts</span>
              </Link>
              <hr className="my-2 border-white/10" />
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2 text-left font-medium text-rose-300 transition-colors hover:bg-rose-500/10"
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