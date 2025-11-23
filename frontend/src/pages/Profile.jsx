import React, { useState, useEffect } from "react";

export default function Profile() {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState("");
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

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

  // Fetch user's saved posts
  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchPosts = async () => {
      setLoadingPosts(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/posts/user-posts", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts || []);
        } else {
          console.warn("Failed to fetch user posts");
        }
      } catch (err) {
        console.error("Error fetching posts:", err);
      }
      setLoadingPosts(false);
    };

    fetchPosts();
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

      {/* Saved Content Section */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4">Your Saved Content</h2>

        {loadingPosts ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading saved content...</span>
          </div>
        ) : posts.length === 0 ? (
          <p className="text-gray-500">You have no saved content yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((p) => (
              <div key={p._id} className="border rounded-lg p-4 bg-white shadow-sm">
                {p.image && (
                  <img src={p.image} alt="post" className="w-full h-40 object-cover rounded mb-3" />
                )}
                <p className="text-gray-700 mb-2">{p.caption}</p>
                {p.hashtags && Array.isArray(p.hashtags) && (
                  <p className="text-indigo-600 mb-2">{p.hashtags.join(' ')}</p>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{p.status || 'draft'}</span>
                  <span>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}