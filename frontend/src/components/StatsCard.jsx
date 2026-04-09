import React from "react";

export default function StatsCard({ label, value, icon: Icon, iconClassName = "", valueClassName = "" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md dark:border-white/10 dark:bg-slate-800 dark:shadow-none dark:hover:border-indigo-300/30 dark:hover:bg-slate-800 dark:hover:shadow-[0_24px_60px_-24px_rgba(79,70,229,0.35)]">
      <div className="mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-400" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</p>
          <h2 className={`mt-2 text-4xl font-black leading-none tracking-tight text-slate-800 dark:text-white ${valueClassName}`}>{value}</h2>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5 ${iconClassName}`}>
            <Icon size={20} strokeWidth={2.25} />
          </div>
        )}
      </div>
    </div>
  );
}

