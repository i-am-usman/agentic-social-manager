import React from "react";

export default function ProfileForm({
  name,
  bio,
  interests,
  profileStatus,
  profileCompletion,
  connectedCount,
  totalAccounts,
  savedPosts,
  onNameChange,
  onBioChange,
  onInterestsChange,
  onSave,
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 shadow-[0_30px_80px_-45px_rgba(2,6,23,1)] backdrop-blur-xl sm:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Edit Profile</h1>
          <p className="mt-1 text-sm text-slate-300">Tune your identity, voice, and content preferences.</p>
        </div>
        <div className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 px-4 py-3 text-center shadow-[0_16px_40px_-24px_rgba(99,102,241,0.7)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-200">Completion</p>
          <p className="mt-1 text-2xl font-black text-white">{profileCompletion}%</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">Connected Accounts</p>
          <p className="mt-1 text-lg font-bold text-white">{connectedCount}/{totalAccounts}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">Saved Posts</p>
          <p className="mt-1 text-lg font-bold text-white">{savedPosts}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
          <p className="text-xs uppercase tracking-wide text-slate-400">Bio Length</p>
          <p className="mt-1 text-lg font-bold text-white">{bio.length}/280</p>
        </div>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-indigo-300/50 focus:outline-none"
        />

        <textarea
          placeholder="Bio"
          value={bio}
          onChange={(e) => onBioChange(e.target.value)}
          className="h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-indigo-300/50 focus:outline-none"
        />

        <input
          type="text"
          placeholder="Interests (comma separated)"
          value={interests}
          onChange={(e) => onInterestsChange(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-100 placeholder:text-slate-400 focus:border-indigo-300/50 focus:outline-none"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={onSave}
          className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(99,102,241,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={profileStatus.loading}
        >
          {profileStatus.loading ? "Saving..." : "Save Profile"}
        </button>

        {profileStatus.message && (
          <p
            className={`text-sm ${
              profileStatus.type === "success"
                ? "text-emerald-300"
                : profileStatus.type === "error"
                  ? "text-rose-300"
                  : "text-slate-300"
            }`}
          >
            {profileStatus.message}
          </p>
        )}
      </div>
    </section>
  );
}
