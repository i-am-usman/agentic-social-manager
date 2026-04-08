import React from "react";
import { Clock3, Sparkles, TrendingUp } from "lucide-react";

export default function BestTimeToPostWidget({ insight }) {
  const status = insight?.status || "insufficient_data";
  const topWindows = insight?.top_windows || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-bold tracking-tight text-slate-800">Best Time to Post</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
          <Sparkles size={14} />
          ASMA Predictor
        </span>
      </div>

      {status !== "ready" ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {insight?.message || "Need more engagement history to generate a reliable time window."}
        </div>
      ) : (
        <>
          <div className="mb-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Recommended Window
            </p>
            <p className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <Clock3 size={20} />
              {insight.recommended_label}
            </p>
            <p className="mt-1 text-sm text-slate-700">{insight.message}</p>
          </div>

          <div className="space-y-2">
            {topWindows.map((item, idx) => (
              <div key={`${item.hour}-${idx}`} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <div className="text-sm font-semibold text-slate-800">{item.label}</div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp size={12} />
                    Avg score {item.average_engagement_score}
                  </span>
                  <span>({item.posts} posts)</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Based on {insight.coverage_posts || 0} recent posts from Facebook and Instagram.
          </p>
        </>
      )}
    </div>
  );
}
