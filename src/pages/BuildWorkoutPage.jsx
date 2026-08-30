import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";

/*
 * Build a workout — pick movements, then decide what it is.
 *
 * Two outcomes, asked AFTER the picking rather than before, because you
 * usually do not know which you wanted until you see the list: train it once
 * and forget it, or name it and put it on the shelf.
 *
 * The ready-made lists and the filters live on the shelf itself now; this
 * screen is only the picker.
 */

export default function BuildWorkoutPage({ onBack, onStartOneOff, onSaveRoutine }) {
  const { exerciseBank } = useWorkout();

  const [picked, setPicked] = useState([]);
  const [query, setQuery] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [name, setName] = useState("");

  const names = useMemo(
    () =>
      Object.keys(exerciseBank || {})
        .filter((n) => n !== "_empty" && !exerciseBank[n].isHidden)
        .filter((n) => !query.trim() || n.toLowerCase().includes(query.trim().toLowerCase()))
        .sort(),
    [exerciseBank, query]
  );

  const toggle = (movement) =>
    setPicked((prev) =>
      prev.includes(movement) ? prev.filter((n) => n !== movement) : [...prev, movement]
    );

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[12px]">
      <div className="flex items-center justify-between flex-none">
        <button type="button" className="link-teal" onClick={onBack}>
          Cancel
        </button>
        <span
          className="uppercase"
          style={{ fontSize: 11, letterSpacing: "0.12em", fontWeight: 700, color: "var(--color-muted)" }}
        >
          Build a workout
        </span>
        <span style={{ width: 44 }} />
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find a movement"
        className="flex-none"
        style={{
          height: 44,
          borderRadius: "var(--radius-control)",
          background: "var(--color-card-hi)",
          border: "1px solid #24272d",
          padding: "0 14px",
          color: "var(--color-text)",
          outline: "none",
        }}
      />

      <div className="flex flex-col gap-[6px] min-h-0" style={{ overflowY: "auto" }}>
        {names.map((movement) => {
          const order = picked.indexOf(movement);
          return (
            <button
              key={movement}
              type="button"
              onClick={() => toggle(movement)}
              className="row-card flex justify-between items-center w-full text-left"
              style={{ borderColor: order >= 0 ? "var(--color-brass)" : "var(--color-border)" }}
            >
              <span className="row-title truncate">{movement}</span>
              {order >= 0 && (
                <span className="row-value tabular" style={{ flex: "none" }}>
                  {order + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn-primary flex-none"
        style={{ marginTop: "auto" }}
        disabled={picked.length === 0}
        onClick={() => setDeciding(true)}
      >
        Done · {picked.length} movement{picked.length === 1 ? "" : "s"}
      </button>

      {deciding && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-3"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>
              What is this?
            </span>

            <button
              type="button"
              className="btn-primary"
              onClick={() => onStartOneOff(picked)}
            >
              Train it once
            </button>

            <span className="label" style={{ paddingTop: 4 }}>
              Or keep it
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onSaveRoutine(name.trim(), picked)}
              placeholder="Name this routine"
              style={{
                height: 44,
                borderRadius: "var(--radius-control)",
                background: "var(--color-card-hi)",
                border: "1px solid #24272d",
                padding: "0 14px",
                color: "var(--color-text)",
                outline: "none",
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              disabled={!name.trim()}
              onClick={() => onSaveRoutine(name.trim(), picked)}
            >
              Save as a routine
            </button>

            <button type="button" className="link-teal" onClick={() => setDeciding(false)}>
              Back to picking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
