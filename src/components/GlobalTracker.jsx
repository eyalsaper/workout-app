import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";

/*
 * Weekly targets — the habits alongside the training.
 *
 * The list stays put; the checkmarks reset every week on their own, because
 * they are stored per week key rather than as a flag you have to remember to
 * clear. Unchecked is the normal state of a fresh week, not a failure, so
 * nothing here counts a streak or goes red.
 */

export default function GlobalTracker() {
  const {
    globalTracker,
    globalTrackerChecked,
    toggleTrackerItem,
    resetTracker,
    updateTrackerItem,
    addTrackerItem,
    removeTrackerItem,
  } = useWorkout();

  const [editing, setEditing] = useState(false);
  const items = globalTracker || [];
  const visible = items.filter((name) => (name || "").trim() !== "");
  const doneCount = items.filter((name, i) => (name || "").trim() && globalTrackerChecked[i]).length;

  if (!visible.length && !editing) {
    return (
      <div className="card flex items-center justify-between gap-3" style={{ padding: 16 }}>
        <span className="text-[13px]" style={{ color: "var(--color-dim)" }}>
          No weekly targets yet.
        </span>
        <button type="button" className="link-teal" onClick={() => setEditing(true)}>
          Add some
        </button>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-[12px]" style={{ padding: 16 }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="label">
          Weekly targets{visible.length ? ` · ${doneCount} of ${visible.length}` : ""}
        </span>
        <button
          type="button"
          className="link-teal"
          style={{ fontSize: 12, flex: "none" }}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-[8px]">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={item}
                onChange={(e) => updateTrackerItem(index, e.target.value)}
                placeholder="Drink 2L water"
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: "var(--radius-control)",
                  background: "var(--color-card-hi)",
                  border: "1px solid #24272d",
                  padding: "0 12px",
                  color: "var(--color-text)",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => removeTrackerItem(index)}
                aria-label={`Remove ${item || "target"}`}
                style={{ fontSize: 12, color: "var(--color-dim)", flex: "none", padding: "0 4px" }}
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <button type="button" className="mode-chip" onClick={addTrackerItem}>
              Add a target
            </button>
            <button type="button" className="mode-chip" onClick={resetTracker}>
              Clear this week
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-[10px]">
          {items.map((item, index) => {
            if (!(item || "").trim()) return null;
            const checked = !!globalTrackerChecked[index];
            return (
              <button
                key={index}
                type="button"
                onClick={() => toggleTrackerItem(index)}
                className="flex items-center gap-3 text-left"
                style={{ minHeight: 28 }}
                aria-pressed={checked}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    flex: "none",
                    borderRadius: 5,
                    border: checked ? "1px solid var(--color-teal)" : "1px solid #33363d",
                    background: checked ? "var(--color-teal)" : "transparent",
                    color: "#0e0f12",
                    fontSize: 12,
                    lineHeight: "16px",
                    textAlign: "center",
                  }}
                >
                  {checked ? "✓" : ""}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: checked ? "var(--color-dim)" : "var(--color-text)",
                  }}
                >
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
