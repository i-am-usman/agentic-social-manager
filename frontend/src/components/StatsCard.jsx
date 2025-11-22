import React from "react";

export default function StatsCard({ label, value }) {
  return (
    <div className="bg-white shadow-md border rounded-xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <h2 className="text-3xl font-bold text-gray-800 mt-2">{value}</h2>
    </div>
  );
}

