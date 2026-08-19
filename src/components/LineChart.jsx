import React from "react";

/**
 * Small SVG line chart. Hand-rolled rather than pulling in a charting library
 * for one graph — it keeps the bundle down and there's nothing here worth
 * 100kB of dependency.
 */
export default function LineChart({ points, unit = "kg", height = 160 }) {
  if (!points || points.length === 0) return null;

  const width = 320;
  const pad = { top: 16, right: 8, bottom: 22, left: 34 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // Pad the range so a flat line doesn't sit on the axis.
  const span = rawMax - rawMin || Math.max(1, rawMax * 0.1);
  const min = rawMin - span * 0.15;
  const max = rawMax + span * 0.15;

  const x = (i) =>
    pad.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v) => pad.top + plotH - ((v - min) / (max - min)) * plotH;

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${pad.top + plotH} L${x(0)},${pad.top + plotH} Z`;

  const trend = values[values.length - 1] - values[0];
  const stroke = trend >= 0 ? "#2563eb" : "#dc2626";
  const fill = trend >= 0 ? "#2563eb" : "#dc2626";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Trend from ${Math.round(values[0])} to ${Math.round(
        values[values.length - 1]
      )} ${unit}`}
    >
      {[rawMin, rawMax].map((v, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={y(v)}
            y2={y(v)}
            stroke="#2a3440"
            strokeDasharray="2 3"
          />
          <text x={4} y={y(v) + 4} fontSize="9" fill="#7b8794">
            {Math.round(v)}
          </text>
        </g>
      ))}

      <path d={area} fill={fill} opacity="0.08" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />

      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="#fff" stroke={stroke} strokeWidth="2" />
      ))}

      <text x={pad.left} y={height - 6} fontSize="9" fill="#7b8794">
        {points[0].label}
      </text>
      {points.length > 1 && (
        <text
          x={width - pad.right}
          y={height - 6}
          fontSize="9"
          fill="#7b8794"
          textAnchor="end"
        >
          {points[points.length - 1].label}
        </text>
      )}
    </svg>
  );
}
