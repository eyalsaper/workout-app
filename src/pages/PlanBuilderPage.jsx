import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { orderedDays } from "../lib/plan";

/*
 * The plan editor — reached from "Edit this plan" on 8I.
 *
 * Reorder, rename, add and remove days. Every save runs the cursor through
 * reconcileCursor (rule 7.2.6), so the day that was up next stays up next
 * wherever it moved to, and no edit ever resets a round.
 *
 * Reordering is arrows rather than drag: a drag library is a new dependency,
 * and at four to eight rows arrows are faster one-handed anyway.
 */

export default function PlanBuilderPage({ onBack }) {
  const { program, routines, setPlanDays } = useWorkout();
  const [days, setDays] = useState(() => orderedDays(program));
  const [adding, setAdding] = useState(false);

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= days.length) return;
    const next = [...days];
    [next[index], next[target]] = [next[target], next[index]];
    setDays(next.map((day, order) => ({ ...day, order })));
  };

  const rename = (index, name) =>
    setDays((prev) => prev.map((day, i) => (i === index ? { ...day, name } : day)));

  const remove = (index) =>
    setDays((prev) => prev.filter((_, i) => i !== index).map((day, order) => ({ ...day, order })));

  const addDay = (routine) => {
    setDays((prev) => [
      ...prev,
      {
        id: `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        order: prev.length,
        name: routine.name,
        routineId: routine.id,
      },
    ]);
    setAdding(false);
  };

  const save = () => {
    setPlanDays(days);
    onBack();
  };

  const unused = Object.values(routines || {});

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          Cancel
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          Edit plan
        </span>
        <button type="button" style={{ fontSize: 13, color: "var(--color-brass)" }} onClick={save}>
          Save
        </button>
      </div>

      <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          Days
        </span>
        {days.map((day, index) => (
          <div key={day.id} className="card flex items-center gap-2" style={{ padding: 12 }}>
            <span
              className="tabular"
              style={{
                width: 22,
                flex: "none",
                fontFamily: "var(--font-display)",
                fontSize: 13,
                color: "var(--color-dim)",
              }}
            >
              {index + 1}
            </span>
            <input
              value={day.name}
              onChange={(e) => rename(index, e.target.value)}
              className="row-title"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                outline: "none",
                caretColor: "var(--color-brass)",
              }}
            />
            <button
              type="button"
              onClick={() => move(index, -1)}
              aria-label={`Move ${day.name} up`}
              style={{ width: 34, height: 34, flex: "none", color: "var(--color-muted)" }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              aria-label={`Move ${day.name} down`}
              style={{ width: 34, height: 34, flex: "none", color: "var(--color-muted)" }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove ${day.name}`}
              style={{ fontSize: 12, color: "var(--color-dim)", flex: "none", paddingLeft: 4 }}
            >
              Remove
            </button>
          </div>
        ))}

        {/*
          Auto-progression, per day: when the day comes round again, its
          target loads go up by this much. A suggestion the app applies rather
          than one it prints — turn it off and the targets stay put.
        */}
        <span className="label" style={{ paddingLeft: 2, paddingTop: 6 }}>
          When a day comes round again
        </span>
        {days.map((day, index) => {
          const progression = day.progression || { auto: false, incrementKg: 2.5 };
          return (
            <div
              key={`${day.id}-progression`}
              className="row-card flex items-center justify-between gap-2"
            >
              <span className="row-title truncate" style={{ flex: 1 }}>
                {day.name}
              </span>
              <button
                type="button"
                className="mode-chip"
                data-active={progression.auto}
                style={{ flex: "none" }}
                onClick={() =>
                  setDays((prev) =>
                    prev.map((d, i) =>
                      i === index
                        ? { ...d, progression: { ...progression, auto: !progression.auto } }
                        : d
                    )
                  )
                }
              >
                {progression.auto ? `+${progression.incrementKg} kg` : "Off"}
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            height: 52,
            flex: "none",
            borderRadius: "var(--radius-row)",
            border: "1px dashed #3a3f48",
            color: "var(--color-brass)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Add a day
        </button>
      </div>

      <span style={{ fontSize: 12, color: "var(--color-dim)", marginTop: "auto" }}>
        Reordering keeps your place. The day that is up next stays up next.
      </span>

      {adding && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)" }}>
          <button type="button" style={{ flex: 1 }} onClick={() => setAdding(false)} aria-label="Close" />
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-2"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
              maxHeight: "70dvh",
              overflowY: "auto",
            }}
          >
            <span className="label">Pick a routine</span>
            {unused.length === 0 ? (
              <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
                No routines yet. Build one on the Routines tab first.
              </span>
            ) : (
              unused.map((routine) => (
                <button
                  key={routine.id}
                  type="button"
                  onClick={() => addDay(routine)}
                  className="row-card text-left row-title"
                >
                  {routine.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
