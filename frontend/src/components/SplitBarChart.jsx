import React, { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import BorderGlow from "./BorderGlow";

export default function SplitBarChart({ title, rows, gradientStart = "#8b5cf6", gradientEnd = "#4f46e5" }) {
  const gradientId = useId();
  const data = (rows || []).map((row) => ({
    label: row.label,
    value: row.value || 0,
  }));

  return (
    <BorderGlow
      className="rounded-2xl bg-slate-900/75 p-5 shadow-[0_18px_40px_-24px_rgba(2,6,23,0.9)] backdrop-blur"
      glowColor="250 80 60"
      colors={['#4F46E5', '#9333EA', '#6366F1']}
      borderRadius={16}
      glowIntensity={0.34}
      edgeSensitivity={54}
    >
      <h3 className="mb-4 text-lg font-bold tracking-tight text-white">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400">No split data available.</p>
      ) : (
        <>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 8, left: 8, bottom: 5 }} barCategoryGap={18}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={gradientStart} />
                    <stop offset="100%" stopColor={gradientEnd} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#cbd5e1" }} width={72} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    borderColor: "rgba(148, 163, 184, 0.18)",
                    background: "rgba(15, 23, 42, 0.96)",
                    color: "#e2e8f0",
                    boxShadow: "0 10px 30px rgba(2, 6, 23, 0.35)",
                  }}
                  formatter={(value) => [value, "Count"]}
                />
                <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {data.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center text-slate-300">
                <span className="font-semibold">{item.label}: </span>
                {item.value}
              </div>
            ))}
          </div>
        </>
      )}
    </BorderGlow>
  );
}
