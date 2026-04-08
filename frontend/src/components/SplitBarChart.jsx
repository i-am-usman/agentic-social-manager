import React, { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function SplitBarChart({ title, rows, gradientStart = "#8b5cf6", gradientEnd = "#4f46e5" }) {
  const gradientId = useId();
  const data = (rows || []).map((row) => ({
    label: row.label,
    value: row.value || 0,
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-800">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-500">No split data available.</p>
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#475569" }} width={72} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0", boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)" }}
                  formatter={(value) => [value, "Count"]}
                />
                <Bar dataKey="value" fill={`url(#${gradientId})`} radius={[0, 10, 10, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {data.map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 px-2 py-1.5 text-center text-slate-700">
                <span className="font-semibold">{item.label}: </span>
                {item.value}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
