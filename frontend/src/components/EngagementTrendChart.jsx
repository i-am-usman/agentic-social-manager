import React, { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function EngagementTrendChart({ trends }) {
  const engagementGradientId = useId();
  const repliesGradientId = useId();

  const labels = trends?.labels || [];
  const comments = trends?.incoming_comments || [];
  const dms = trends?.incoming_dms || [];
  const replies = trends?.ai_replies_sent || [];

  const data = labels.map((label, index) => ({
    day: label,
    engagement: (comments[index] || 0) + (dms[index] || 0),
    aiReplies: replies[index] || 0,
    comments: comments[index] || 0,
    dms: dms[index] || 0,
  }));

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] backdrop-blur">
      <div className="mb-4">
        <h3 className="text-lg font-bold tracking-tight text-white">Engagement vs AI Replies</h3>
        <p className="text-xs text-slate-400">Incoming engagement compared against automation output.</p>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-slate-400">No trend data yet for this period.</p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={engagementGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id={repliesGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9333ea" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  borderColor: "rgba(148, 163, 184, 0.18)",
                  background: "rgba(15, 23, 42, 0.96)",
                  color: "#e2e8f0",
                  boxShadow: "0 10px 30px rgba(2, 6, 23, 0.35)",
                }}
                formatter={(value, name) => {
                  if (name === "engagement") return [value, "Incoming Engagement"];
                  if (name === "aiReplies") return [value, "AI Replies Sent"];
                  return [value, name];
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }}
                formatter={(value) => {
                  if (value === "engagement") return "Incoming Engagement";
                  if (value === "aiReplies") return "AI Replies Sent";
                  return value;
                }}
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke="#4f46e5"
                strokeWidth={2.2}
                fill={`url(#${engagementGradientId})`}
                activeDot={{ r: 5 }}
              />
              <Area
                type="monotone"
                dataKey="aiReplies"
                stroke="#9333ea"
                strokeWidth={2.2}
                fill={`url(#${repliesGradientId})`}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
