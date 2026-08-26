import React from "react";

/*
 * The day strip — one pill per plan day, replacing the old Sun–Sat week strip.
 *
 * Same component, same pills, different source: it reads the plan cursor, not
 * the calendar. Done days are brass, the day the cursor is on is one step
 * lighter than the track, and everything after it is the track. There is no
 * "missed" state, because nothing was ever promised for a particular day.
 *
 * Takes the `roundInfo` object from training.js — the same object the ring and
 * the caption were rendered from — so the three can never disagree.
 */

const PILL_FILL = {
  done: "var(--color-brass)",
  next: "var(--color-track-next)",
  upcoming: "var(--color-track)",
};

export default function DayStrip({ roundInfo, showLabels = true }) {
  const { pills, collapsed, progress, countLabel, a11y } = roundInfo;

  if (!pills.length) return null;

  // Above six days the pills are thinner than the gaps between them at 390px,
  // so the strip becomes one bar and the numeral carries the count (§5.5).
  if (collapsed) {
    return (
      <div className="flex items-center gap-3" role="img" aria-label={a11y}>
        <div
          className="flex-1 h-[6px] rounded-full overflow-hidden"
          style={{ background: "var(--color-track)" }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress * 100}%`, background: "var(--color-brass)" }}
          />
        </div>
        <span
          className="text-[11px] tabular"
          style={{ color: "var(--color-dim)", fontFamily: "var(--font-display)" }}
        >
          {countLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[9px]" role="img" aria-label={a11y}>
      <div className="flex gap-[6px]">
        {pills.map((pill, index) => (
          <span
            key={pill.id || index}
            className="flex-1 h-[6px] rounded-full"
            style={{ background: PILL_FILL[pill.state] }}
          />
        ))}
      </div>
      {showLabels && (
        <div className="flex justify-between text-[11px]">
          {pills.map((pill, index) => (
            <span
              key={pill.id || index}
              className="truncate"
              style={{
                // Only the day that is up next is brass. Done days are not
                // re-coloured — the pill above already says so.
                color: pill.state === "next" ? "var(--color-brass)" : "var(--color-dim)",
                flex: "1 1 0",
                textAlign:
                  index === 0 ? "left" : index === pills.length - 1 ? "right" : "center",
              }}
            >
              {pill.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
