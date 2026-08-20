import React from "react";
import { Check } from "lucide-react";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Mon-Sun completion strip, driven by `weekStrip()` from lib/training.js.
 * Tapping a day previews it (via onSelect) — "today" and "selected" are
 * independent states, so you can browse another day while today stays
 * marked with a ring.
 */
export default function WeekStrip({ days, selectedIndex, onSelect }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {days.map((day, i) => {
        const isSelected = selectedIndex === i;
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect?.(i)}
            className="text-center"
          >
            <div className="stencil mb-1.5">{DAY_LETTERS[i]}</div>
            <div
              className={`h-8 rounded-card flex items-center justify-center transition-colors ${
                day.done
                  ? "bg-positive-bg text-positive-ink-strong"
                  : isSelected
                  ? "bg-accent text-accent-ink"
                  : "bg-surface-wash text-ink-faint"
              } ${day.isToday ? "ring-2 ring-offset-1 ring-offset-surface-page ring-accent" : ""}`}
            >
              {day.done && <Check className="w-4 h-4" strokeWidth={3} />}
            </div>
          </button>
        );
      })}
    </div>
  );
}
