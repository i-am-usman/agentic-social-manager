import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = {
  positive: "#16a34a",
  neutral: "#64748b",
  negative: "#ef4444",
};

export default function SentimentDonutChart({ sentiment }) {
  const positive = sentiment?.positive || 0;
  const neutral = sentiment?.neutral || 0;
  const negative = sentiment?.negative || 0;

  const data = [
    { name: "Positive", value: positive, key: "positive" },
    { name: "Neutral", value: neutral, key: "neutral" },
    { name: "Negative", value: negative, key: "negative" },
  ];

  const total = positive + neutral + negative;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] backdrop-blur">
      <h3 className="mb-4 text-lg font-bold tracking-tight text-white">Audience Mood</h3>
      {total === 0 ? (
        <p className="text-sm text-slate-400">No sentiment signals yet.</p>
      ) : (
        <>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {data.map((item) => {
              const pct = total ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={item.name} className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-center">
                  <p className="font-semibold" style={{ color: COLORS[item.key] }}>{item.name}</p>
                  <p className="text-slate-300">{pct}%</p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
