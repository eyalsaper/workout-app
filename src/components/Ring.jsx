import React from "react";

/*
 * The round ring — the app's one persistent "how am I doing" signal.
 *
 * r=40 in a 100×100 viewBox gives a circumference of 251. The arc MUST equal
 * the number printed beside it, so this takes the same `progress` the caption
 * was rendered from and never computes a fraction of its own.
 */

const CIRCUMFERENCE = 251;

export default function Ring({ progress = 0, size = 62, label, id = "ring-brass" }) {
  const clamped = Math.min(1, Math.max(0, progress));
  const dashoffset = CIRCUMFERENCE * (1 - clamped);

  return (
    <svg
      viewBox="0 0 100 100"
      style={{ width: size, height: size, flex: "none" }}
      role="img"
      aria-label={label}
    >
      <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-track)" strokeWidth="10" />
      {clamped > 0 && (
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 50 50)"
        />
      )}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8ca8b" />
          <stop offset="1" stopColor="#b8893c" />
        </linearGradient>
      </defs>
    </svg>
  );
}
