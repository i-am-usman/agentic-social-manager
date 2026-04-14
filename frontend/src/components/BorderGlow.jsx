import React, { useState } from "react";

function hexToRgba(hex, alpha) {
  const safe = String(hex || "").trim();
  const normalized = safe.startsWith("#") ? safe.slice(1) : safe;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(99, 102, 241, ${alpha})`;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseHSL(hslStr) {
  const match = String(hslStr).match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 250, s: 80, l: 60 };
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
}

function buildGlowShadow(glowColor, intensity) {
  const { h, s, l } = parseHSL(glowColor);
  const normalized = Math.max(0.1, Math.min(intensity, 1));

  return [
    `0 0 0 1px hsl(${h}deg ${s}% ${l}% / ${0.05 + normalized * 0.06})`,
    `0 0 10px 1px hsl(${h}deg ${s}% ${l}% / ${0.07 + normalized * 0.08})`,
    `0 0 18px 2px hsl(${h}deg ${s}% ${l}% / ${0.04 + normalized * 0.05})`,
  ].join(", ");
}

const BorderGlow = ({
  children,
  className = "",
  glowColor = "250 80 60",
  borderRadius = 12,
  colors = ["#4F46E5", "#9333EA", "#6366F1"],
  edgeSensitivity = 50,
  glowIntensity = 0.55,
  animated = true,
  edgeWidth = 1,
  trackRadius = 88,
  trackOpacity = 0.18,
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const handlePointerMove = (event) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointer({ x: Math.max(0, Math.min(x, 100)), y: Math.max(0, Math.min(y, 100)) });
  };

  const glowOpacity = isHovered ? 1 : 0;
  const ringOpacity = isHovered ? 1 : 0;
  const palette = colors.length > 0 ? colors : ["#4F46E5", "#9333EA", "#6366F1"];

  const blendedTrackBackground = [
    `radial-gradient(${trackRadius}px circle at ${pointer.x}% ${pointer.y}%, ${hexToRgba(palette[0], trackOpacity)} 0%, ${hexToRgba(palette[0], 0)} 62%)`,
    `radial-gradient(${Math.round(trackRadius * 0.9)}px circle at ${Math.min(pointer.x + 9, 100)}% ${Math.max(pointer.y - 7, 0)}%, ${hexToRgba(palette[1], trackOpacity * 0.82)} 0%, ${hexToRgba(palette[1], 0)} 64%)`,
    `radial-gradient(${Math.round(trackRadius * 0.86)}px circle at ${Math.max(pointer.x - 10, 0)}% ${Math.min(pointer.y + 8, 100)}%, ${hexToRgba(palette[2], trackOpacity * 0.78)} 0%, ${hexToRgba(palette[2], 0)} 66%)`,
  ].join(",");

  return (
    <div
      className={`relative isolate h-full overflow-hidden border border-slate-200/80 transition-all duration-300 dark:border-white/10 ${className}`}
      style={{
        borderRadius: `${borderRadius}px`,
        backgroundColor: "transparent",
        boxShadow: isHovered ? buildGlowShadow(glowColor, glowIntensity) : undefined,
        ...(style || {}),
      }}
      onPointerMove={animated ? handlePointerMove : undefined}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200"
        style={{
          opacity: glowOpacity,
          padding: `${edgeWidth}px`,
          background: `radial-gradient(${110 + edgeSensitivity}px circle at ${pointer.x}% ${pointer.y}%, ${colors[0]} 0%, ${colors[1]} 34%, ${colors[2]} 58%, transparent 78%) border-box`,
          filter: "blur(4px)",
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200"
        style={{
          opacity: isHovered ? 1 : 0,
          background: blendedTrackBackground,
          filter: "blur(8px)",
          mixBlendMode: "screen",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-200"
        style={{
          opacity: ringOpacity,
          padding: `${Math.max(edgeWidth, 1)}px`,
          background: `conic-gradient(from ${((pointer.x + pointer.y) * 1.2).toFixed(2)}deg, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[0]}) border-box`,
          WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          filter: "saturate(1.02)",
        }}
      />

      <div className="relative z-10 h-full rounded-[inherit]">{children}</div>
    </div>
  );
};

export default BorderGlow;
