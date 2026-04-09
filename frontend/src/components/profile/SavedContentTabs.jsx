import React from "react";

const STATUSES = ["all", "draft", "scheduled", "published"];

export default function SavedContentTabs({ filterStatus, onChange }) {
  return (
    <div className="mb-5 inline-flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
      {STATUSES.map((status) => (
        <button
          key={status}
          onClick={() => onChange(status)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold capitalize transition-all ${
            filterStatus === status
              ? "bg-indigo-500/25 text-indigo-100 shadow-[0_8px_24px_-16px_rgba(99,102,241,0.9)]"
              : "text-slate-300 hover:bg-white/10 hover:text-indigo-200"
          }`}
        >
          {status}
        </button>
      ))}
    </div>
  );
}
