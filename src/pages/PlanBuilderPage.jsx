import React from "react";
import { useWorkout } from "../state/WorkoutContext";

/*
 * The plan editor — how many workouts, in what order, and what is in each.
 *
 * A plan day is NOT a routine. It owns its own movements, so editing Workout 3
 * never rewrites Workout 5 and no day has to exist on the shelf first. A
 * routine can be copied into a day as a starting point, and that is where the
 * link ends.
 *
 * Reordering runs through reconcileCursor, so the workout that was up next
 * stays up next wherever it lands, and no edit resets a round.
 */

export default function PlanBuilderPage({ onBack, onEditDay }) {
  const { planDays, setPlanDays, setPlanLength, dayItemCount, describeDay, program } =
    useWorkout();

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= planDays.length) return;
    const next = [...planDays];
    [next[index], next[target]] = [next[target], next[index]];
    setPlanDays(next);
  };

  const count = planDays.length;

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          Back
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          {program?.name || "Plan"}
        </span>
        <span style={{ width: 40 }} />
      </div>

      {/* How long is the pass through the plan. Everything else follows. */}
      <div className="card flex-none flex flex-col gap-[10px]" style={{ padding: 16 }}>
        <span className="label">Workouts in this plan</span>
        <div className="flex flex-wrap gap-[6px]">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <button
              key={n}
              type="button"
              className="mode-chip"
              data-active={count === n}
              onClick={() => setPlanLength(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
          One pass through all {count} is a round. Adding or removing never
          resets the round you are in.
        </span>
      </div>

      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          The order
        </span>

        {planDays.map((day, index) => {
          const movementCount = dayItemCount(day);
          return (
            <div key={day.id} className="card flex items-center gap-2" style={{ padding: 12 }}>
              <span
                className="tabular"
                style={{
                  width: 20,
                  flex: "none",
                  fontFamily: "var(--font-display)",
                  fontSize: 13,
                  color: "var(--color-dim)",
                }}
              >
                {index + 1}
              </span>

              <button
                type="button"
                onClick={() => onEditDay(day.id)}
                className="flex flex-col gap-[2px] min-w-0 text-left"
                style={{ flex: 1 }}
              >
                <span className="row-title truncate">{day.name || `Workout ${index + 1}`}</span>
                <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
                  {movementCount ? describeDay(day) : "empty — tap to build it"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => move(index, -1)}
                aria-label={`Move ${day.name} up`}
                style={{ width: 32, height: 34, flex: "none", color: "var(--color-muted)" }}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                aria-label={`Move ${day.name} down`}
                style={{ width: 32, height: 34, flex: "none", color: "var(--color-muted)" }}
              >
                ↓
              </button>
            </div>
          );
        })}

        {count === 0 && (
          <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
            No workouts yet. Pick a number above.
          </span>
        )}
      </div>

      <span style={{ fontSize: 12, color: "var(--color-dim)", marginTop: "auto" }}>
        Tap a workout to build or edit it.
      </span>
    </div>
  );
}
