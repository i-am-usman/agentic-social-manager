import React, { useEffect, useState } from "react";
import ProfileForm from "../components/profile/ProfileForm";
import { apiUrl } from "../config/api";

export default function Profile() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [savedPosts, setSavedPosts] = useState(0);
  const [profileStatus, setProfileStatus] = useState({ loading: false, message: "", type: "info" });

  const [connectedAccounts, setConnectedAccounts] = useState({
    facebook: { connected: false },
    instagram: { connected: false },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(apiUrl("/profile/me"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setBio(data.bio || "");
          setInterests((data.interests || []).join(", "));
        }
      } catch (error) {
        setProfileStatus({ loading: false, message: "Failed to fetch profile.", type: "error" });
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchAccounts = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(apiUrl("/accounts/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setConnectedAccounts(
            data.accounts || {
              facebook: { connected: false },
              instagram: { connected: false },
            }
          );
        }
      } catch (error) {
        setProfileStatus({ loading: false, message: "Failed to fetch connected accounts.", type: "error" });
      }
    };

    fetchAccounts();
  }, []);

  useEffect(() => {
    const fetchPostCount = async () => {
      const token = localStorage.getItem("token");
      try {
        const res = await fetch(apiUrl("/posts/user-posts"), {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setSavedPosts((data.posts || []).length);
        }
      } catch (error) {
        setSavedPosts(0);
      }
    };

    fetchPostCount();
  }, []);

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");

    if (!name.trim()) {
      setProfileStatus({ loading: false, message: "Name is required.", type: "error" });
      return;
    }

    if (bio.length > 280) {
      setProfileStatus({ loading: false, message: "Bio must be 280 characters or less.", type: "error" });
      return;
    }

    setProfileStatus({ loading: true, message: "Saving profile...", type: "info" });

    try {
      const res = await fetch(apiUrl("/profile/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
          interests: interests
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileStatus({ loading: false, message: data.message || "Profile saved successfully.", type: "success" });
      } else {
        setProfileStatus({ loading: false, message: data.detail || "Failed to save profile.", type: "error" });
      }
    } catch (error) {
      setProfileStatus({ loading: false, message: "Failed to save profile.", type: "error" });
    }
  };

  const totalAccounts = Object.keys(connectedAccounts || {}).length;
  const connectedCount = Object.values(connectedAccounts || {}).filter((account) => account?.connected).length;
  const profileCompletion = [name.trim(), bio.trim(), interests.trim()].filter(Boolean).length * 33;

  return (
    <div className="mx-auto max-w-6xl p-6 text-slate-100">
      <div className="relative mb-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 px-6 py-6 text-white shadow-[0_30px_80px_rgba(2,6,23,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.22),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(45,212,191,0.12),_transparent_24%),radial-gradient(circle_at_bottom,_rgba(147,51,234,0.14),_transparent_26%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]" />
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:48px_48px]" />

        <div className="relative">
          <p className="creator-workspace-label inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">Creator Workspace</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Profile Command Center</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">Manage your profile details and account preferences.</p>
        </div>
      </div>

      <ProfileForm
        name={name}
        bio={bio}
        interests={interests}
        profileStatus={profileStatus}
        profileCompletion={profileCompletion}
        connectedCount={connectedCount}
        totalAccounts={totalAccounts}
        savedPosts={savedPosts}
        onNameChange={setName}
        onBioChange={setBio}
        onInterestsChange={setInterests}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
