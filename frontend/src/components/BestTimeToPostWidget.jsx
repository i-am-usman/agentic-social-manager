import React from "react";
import { Clock3, Sparkles, TrendingUp } from "lucide-react";
import BorderGlow from "./BorderGlow";

export default function BestTimeToPostWidget({ insight }) {
  const status = insight?.status || "insufficient_data";
  const topWindows = insight?.top_windows || [];

  return (
    <BorderGlow
      className="rounded-2xl bg-slate-900/75 p-5 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] backdrop-blur"
      glowColor="250 80 60"
      colors={['#4F46E5', '#9333EA', '#6366F1']}
      borderRadius={16}
      glowIntensity={0.34}
      edgeSensitivity={52}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold tracking-tight text-white">Best Time to Post</h3>
        <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-200">
          <Sparkles size={14} />
          ASMA Predictor
        </span>
      </div>

      {status !== "ready" ? (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
          {insight?.message || "Need more engagement history to generate a reliable time window."}
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-200">
              Recommended Window
            </p>
            <p className="flex items-center gap-2 text-2xl font-black text-white">
              <Clock3 size={20} />
              {insight.recommended_label}
            </p>
            <p className="mt-1 text-sm text-slate-300">{insight.message}</p>
          </div>

          <div className="space-y-2">
            {topWindows.map((item, idx) => (
              <div key={`${item.hour}-${idx}`} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-sm font-semibold text-slate-100">{item.label}</div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp size={12} />
                    Avg score {item.average_engagement_score}
                  </span>
                  <span>({item.posts} posts)</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Based on {insight.coverage_posts || 0} recent posts from Facebook and Instagram.
          </p>
        </>
      )}
    </BorderGlow>
  );
}
