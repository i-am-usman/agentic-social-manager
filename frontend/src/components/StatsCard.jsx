import React from "react";

export default function StatsCard({ label, value, icon: Icon, iconClassName = "", valueClassName = "" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] transition-all duration-200 hover:-translate-y-1 hover:border-indigo-300/30 hover:bg-slate-900/90 hover:shadow-[0_24px_60px_-24px_rgba(79,70,229,0.35)]">
      <div className="mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
          <h2 className={`mt-2 text-4xl font-black leading-none tracking-tight text-white ${valueClassName}`}>{value}</h2>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${iconClassName}`}>
            <Icon size={20} strokeWidth={2.25} />
          </div>
        )}
      </div>
    </div>
  );
}

