import React from "react";
import { AlertTriangle, Radar } from "lucide-react";

export default function AnomalyAlertPanel({ insight, hottestPost }) {
  const status = insight?.status || "insufficient_data";
  const isSpike = Boolean(insight?.is_spike);

  if (status !== "ready") {
    return (
      <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] backdrop-blur">
        <h3 className="mb-3 text-lg font-bold tracking-tight text-white">Viral Spike Alert</h3>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          {insight?.message || "Insufficient baseline data for anomaly detection."}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border bg-slate-900/75 p-5 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] backdrop-blur ${
        isSpike ? "border-rose-400/25" : "border-white/10"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold tracking-tight text-white">Viral Spike Alert</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            isSpike
              ? "bg-rose-500/10 text-rose-200"
              : "bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {isSpike ? (
            <span className="relative inline-flex items-center">
              <span className="absolute inline-flex h-4 w-4 animate-ping rounded-full bg-rose-300 opacity-60" />
              <AlertTriangle size={13} className="relative" />
            </span>
          ) : (
            <Radar size={13} />
          )}
          {isSpike ? "Spike" : "Stable"}
        </span>
      </div>

      <div
        className={`rounded-xl border p-4 mb-3 ${
          isSpike
            ? "border-rose-400/20 bg-rose-500/10"
            : "border-emerald-400/20 bg-emerald-500/10"
        }`}
      >
        <p
          className={`text-sm font-medium ${
            isSpike ? "text-rose-100" : "text-emerald-100"
          }`}
        >
          {insight.message}
        </p>
        <p className={`mt-1 text-xs ${isSpike ? "text-rose-200" : "text-emerald-200"}`}>
          Latest engagement: {insight.latest_engagement} | Baseline: {insight.baseline_engagement}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
          <p className="font-semibold">Window</p>
          <p>{insight.latest_window || "-"}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
          <p className="font-semibold">Delta</p>
          <p>{insight.delta_percent != null ? `${insight.delta_percent}%` : "-"}</p>
        </div>
      </div>

      {isSpike && hottestPost?.permalink && (
        <a
          href={hottestPost.permalink}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-400"
        >
          Open hottest post now
        </a>
      )}
    </div>
  );
}
