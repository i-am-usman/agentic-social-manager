import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Generate from "./pages/Generate";
import Profile from "./pages/Profile";   // ✅ import Profile
import Navbar from "./components/Navbar";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ✅ Check token on app load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // ✅ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  return (
    <Router>
      {isAuthenticated && <Navbar setIsAuthenticated={setIsAuthenticated} />}

      <Routes>
        {/* Guest Routes */}
        {!isAuthenticated && (
          <>
            <Route
              path="/login"
              element={<Login setIsAuthenticated={setIsAuthenticated} />}
            />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}

        {/* Authenticated Routes */}
        {isAuthenticated && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/generate" element={<Generate />} />
            <Route path="/profile" element={<Profile />} />   {/* ✅ new route */}
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </>
        )}
      </Routes>
    </Router>
  );
}