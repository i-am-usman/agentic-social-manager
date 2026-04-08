import React from "react";

export default function StatsCard({ label, value, icon: Icon, iconClassName = "", valueClassName = "" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <h2 className={`mt-2 text-4xl font-black leading-none tracking-tight text-slate-900 ${valueClassName}`}>{value}</h2>
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 ${iconClassName}`}>
            <Icon size={20} strokeWidth={2.25} />
          </div>
        )}
      </div>
    </div>
  );
}

