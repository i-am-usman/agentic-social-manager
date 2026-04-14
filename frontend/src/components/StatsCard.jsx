import React from "react";
import BorderGlow from "./BorderGlow";

export default function StatsCard({ label, value, icon: Icon, iconClassName = "", valueClassName = "" }) {
  return (
    <BorderGlow
      className="h-full rounded-xl bg-white p-5 shadow-sm ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-1 dark:bg-slate-800 dark:ring-white/5"
      glowColor="250 80 60"
      colors={['#4F46E5', '#9333EA', '#6366F1']}
      borderRadius={12}
      glowIntensity={0.62}
      edgeSensitivity={44}
    >
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
    </BorderGlow>
  );
}

