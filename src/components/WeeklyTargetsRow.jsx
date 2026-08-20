import React from "react";
import { Check } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";

/**
 * Compact target chips on the Today / Rest day dashboard. Reads and toggles
 * the same tracker data as GlobalTracker (edited from Settings) — this is
 * a read/toggle-only view, not a fork of it. Checked state is scoped to the
 * current week (see WorkoutContext), so it reads as a fresh set of targets
 * every week without anyone resetting it by hand.
 */
export default function WeeklyTargetsRow() {
  const { globalTracker, globalTrackerChecked, toggleTrackerItem } = useWorkout();
  const items = (globalTracker || []).filter((name) => name.trim() !== "");

  if (items.length === 0) return null;

  return (
    <div>
      <div className="stencil mb-2.5">Weekly targets</div>
      <div className="flex flex-wrap gap-2">
        {(globalTracker || []).map((name, idx) => {
          if (!name.trim()) return null;
          const isChecked = !!globalTrackerChecked[idx];
          return (
            <button
              type="button"
              key={idx}
              onClick={() => toggleTrackerItem(idx)}
              aria-pressed={isChecked}
              className={`chip transition-colors ${
                isChecked ? "bg-positive-bg text-positive-ink" : "hover:bg-border-page"
              }`}
            >
              {name} {isChecked && <Check className="w-3 h-3 inline" strokeWidth={3} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
