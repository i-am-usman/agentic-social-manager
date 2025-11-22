import React, { useState, useEffect } from "react";

export default function Profile() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");

  // ✅ Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("token");

      const res = await fetch("http://127.0.0.1:8000/profile/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setName(data.name || "");
        setBio(data.bio || "");
        setInterests((data.interests || []).join(", "));
      } else {
        console.warn("Failed to fetch profile");
      }
    };

    fetchProfile();
  }, []);

  const handleSaveProfile = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch("http://127.0.0.1:8000/profile/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        bio,
        interests: interests.split(",").map(i => i.trim()),
      }),
    });

    const data = await res.json();
    alert(data.message || "Profile saved!");
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Edit Profile</h1>

      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <textarea
        placeholder="Bio"
        value={bio}
        onChange={e => setBio(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <input
        type="text"
        placeholder="Interests (comma separated)"
        value={interests}
        onChange={e => setInterests(e.target.value)}
        className="border p-2 w-full mb-2"
      />

      <button
        onClick={handleSaveProfile}
        className="bg-indigo-600 text-white px-4 py-2 rounded"
      >
        Save Profile
      </button>
    </div>
  );
}