import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import CustomPost from "./pages/CustomPost";
import Profile from "./pages/Profile";
import SavedContent from "./pages/SavedContent";
import Analytics from "./pages/Analytics";
import Automation from "./pages/Automation";
import ConnectAccounts from "./pages/ConnectAccounts";
import ConnectCallback from "./pages/ConnectCallback";
import CommentAnalysis from "./pages/CommentAnalysis";
import Feedback from "./pages/Feedback";
import Navbar from "./components/Navbar";
import { ThemeProvider } from "./context/ThemeContext";

function PublicRoute({ isAuthenticated, children }) {
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

function ProtectedRoute({ isAuthenticated, children }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // ✅ Check token on app load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
    setAuthChecked(true);
  }, []);

  // ✅ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-transparent text-slate-800 dark:text-slate-100">
          {!authChecked ? (
            <div className="flex min-h-screen items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-400" />
            </div>
          ) : (
            <>
              {isAuthenticated && <Navbar setIsAuthenticated={setIsAuthenticated} onLogout={handleLogout} />}

              <Routes>
              <Route
                path="/login"
                element={(
                  <PublicRoute isAuthenticated={isAuthenticated}>
                    <Login setIsAuthenticated={setIsAuthenticated} />
                  </PublicRoute>
                )}
              />
              <Route
                path="/register"
                element={(
                  <PublicRoute isAuthenticated={isAuthenticated}>
                    <Register />
                  </PublicRoute>
                )}
              />

              <Route
                path="/dashboard"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <Dashboard />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/generate"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <Generate />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/custom-post"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <CustomPost />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/profile"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <Profile />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/saved-content"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <SavedContent />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/analytics"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <Analytics />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/automation"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <Automation />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/comment-analysis"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <CommentAnalysis />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/accounts"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <ConnectAccounts />
                  </ProtectedRoute>
                )}
              />
              <Route
                path="/feedback"
                element={(
                  <ProtectedRoute isAuthenticated={isAuthenticated}>
                    <Feedback />
                  </ProtectedRoute>
                )}
              />
              <Route path="/connect/callback" element={<ConnectCallback />} />

              <Route
                path="/"
                element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
              />
              <Route
                path="*"
                element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
              />
            </Routes>
          </>
        )}
      </div>
    </Router>
    </ThemeProvider>
  );
}