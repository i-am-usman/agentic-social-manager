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
        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
          active
            ? "bg-indigo-100 text-indigo-700"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        }`}
      >
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 flex justify-between h-16 items-center gap-8">
        
        {/* Logo + Title */}
        <Link
          to="/dashboard"
          className="flex items-center gap-3 flex-shrink-0 hover:opacity-80 transition-opacity"
        >
          <div className="bg-indigo-600 w-10 h-10 rounded-lg flex items-center justify-center">
            <Sparkles className="text-white" size={24} />
          </div>
          <span className="text-lg font-bold text-gray-900">ASMA</span>
        </Link>

        {/* Navigation Links - Grouped */}
        <div className="flex items-center gap-1 flex-1">
          {/* Analytics Group */}
          <div className="flex items-center gap-1 pr-4 border-r border-gray-200">
            <NavLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
            <NavLink to="/analytics" icon={BarChart3} label="Analytics" />
            <NavLink to="/comment-analysis" icon={MessageSquare} label="Comments" />
          </div>

          {/* Content Group */}
          <div className="flex items-center gap-1 pl-4">
            <NavLink to="/generate" icon={Wand2} label="Create" />
            <NavLink to="/custom-post" icon={FileText} label="Post" />
          </div>
        </div>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer group relative"
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
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <Link
                to="/profile"
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <User size={18} className="text-gray-600" />
                <span className="font-medium">Profile</span>
              </Link>
              <Link
                to="/accounts"
                className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <Settings size={18} className="text-gray-600" />
                <span className="font-medium">Accounts</span>
              </Link>
              <hr className="my-2 border-gray-200" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors font-medium text-left"
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