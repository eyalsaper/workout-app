import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import {
  EQUIPMENT_FILTERS,
  MUSCLE_FILTERS,
  PREMADE_WORKOUTS,
  workoutEquipment,
  workoutMuscles,
} from "../lib/workoutLibrary";

/*
 * One-off workouts — the thing you run when you are not running the plan.
 *
 * Three sources: something you saved earlier, something pre-made, or a list
 * you pick right now. None of them touch the programme: an ad-hoc session
 * carries no planDayId, so it never moves the cursor and never counts as a
 * day of the round. It is still logged, and still counts towards tonnage,
 * records and history.
 */

const DURATION_FILTERS = [
  ["quick", "Under 25 min"],
  ["medium", "25–45 min"],
  ["long", "45 min+"],
];

/*
 * The pre-made list carries movements, not a running time, so the estimate is
 * derived: roughly 9 minutes a movement at three sets with rest. Rounded to 5
 * because a one-minute estimate for a gym session is false precision.
 */
function estimateMinutes(exercises) {
  return Math.max(5, Math.round(((exercises || []).length * 9) / 5) * 5);
}

function durationBucket(minutes) {
  if (minutes < 25) return "quick";
  if (minutes <= 45) return "medium";
  return "long";
}

function Chips({ options, isActive, onToggle }) {
  return (
    <div className="flex flex-wrap gap-[6px]">
      {options.map((opt) => {
        const [key, label] = Array.isArray(opt) ? opt : [opt, opt];
        return (
          <button
            key={key}
            type="button"
            className="mode-chip"
            data-active={isActive(key)}
            onClick={() => onToggle(key)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function BuildWorkoutPage({ onBack, onStart }) {
  const { exerciseBank, savedWorkouts, saveWorkout, deleteWorkout } = useWorkout();

  const [tab, setTab] = useState("premade");
  const [picked, setPicked] = useState([]);
  const [query, setQuery] = useState("");
  const [muscles, setMuscles] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [duration, setDuration] = useState(null);
  const [saveName, setSaveName] = useState("");

  const toggle = (list, setList, key) =>
    setList(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const premade = useMemo(
    () =>
      PREMADE_WORKOUTS.map((w) => ({ ...w, minutes: estimateMinutes(w.exercises) })).filter((w) => {
        if (duration && durationBucket(w.minutes) !== duration) return false;
        if (muscles.length && !workoutMuscles(w.exercises).some((m) => muscles.includes(m)))
          return false;
        if (
          equipment.length &&
          !workoutEquipment(w.exercises).some((e) => equipment.includes(e))
        )
          return false;
        return true;
      }),
    [duration, muscles, equipment]
  );

  const bankNames = useMemo(
    () =>
      Object.keys(exerciseBank || {})
        .filter((n) => n !== "_empty" && !exerciseBank[n].isHidden)
        .filter((n) => !query.trim() || n.toLowerCase().includes(query.trim().toLowerCase()))
        .sort(),
    [exerciseBank, query]
  );

  const saved = Object.entries(savedWorkouts || {});

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
          One-off workout
        </span>
        <span style={{ width: 44 }} />
      </div>

      <div className="segmented flex-none">
        {[
          ["premade", "Ready-made"],
          ["pick", "Pick"],
          ["saved", `Saved${saved.length ? ` ${saved.length}` : ""}`],
        ].map(([key, label]) => (
          <button key={key} type="button" data-active={tab === key} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "premade" && (
        <>
          <div className="flex flex-col gap-[8px] flex-none">
            <Chips
              options={DURATION_FILTERS}
              isActive={(k) => duration === k}
              onToggle={(k) => setDuration(duration === k ? null : k)}
            />
            <Chips
              options={MUSCLE_FILTERS}
              isActive={(k) => muscles.includes(k)}
              onToggle={(k) => toggle(muscles, setMuscles, k)}
            />
            <Chips
              options={EQUIPMENT_FILTERS}
              isActive={(k) => equipment.includes(k)}
              onToggle={(k) => toggle(equipment, setEquipment, k)}
            />
          </div>

          <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
            {premade.length === 0 && (
              <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
                Nothing matches those filters.
              </span>
            )}
            {premade.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onStart(w.name, w.exercises)}
                className="row-card flex justify-between items-center w-full text-left press"
              >
                <div className="flex flex-col gap-[3px] min-w-0">
                  <span className="row-title truncate">{w.name}</span>
                  <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
                    {w.blurb || `${w.exercises.length} movements`}
                  </span>
                </div>
                <span className="row-value" style={{ flex: "none", paddingLeft: 12 }}>
                  {w.minutes}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === "pick" && (
        <>
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
            {bankNames.map((name) => {
              const on = picked.includes(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggle(picked, setPicked, name)}
                  className="row-card flex justify-between items-center w-full text-left"
                  style={{ borderColor: on ? "var(--color-brass)" : "var(--color-border)" }}
                >
                  <span className="row-title truncate">{name}</span>
                  {on && (
                    <span className="row-value" style={{ flex: "none" }}>
                      {picked.indexOf(name) + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {picked.length > 0 && (
            <div className="flex flex-col gap-[8px] flex-none">
              <div className="flex gap-2">
                <input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Name it to save"
                  style={{
                    flex: 1,
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
                  className="mode-chip"
                  data-active={!!saveName.trim()}
                  style={{ flex: "none" }}
                  onClick={() => {
                    if (!saveName.trim()) return;
                    saveWorkout(saveName.trim(), picked);
                    setSaveName("");
                  }}
                >
                  Save
                </button>
              </div>
              <button
                type="button"
                className="btn-primary"
                onClick={() => onStart("Your workout", picked)}
              >
                Start {picked.length} movement{picked.length === 1 ? "" : "s"}
              </button>
            </div>
          )}
        </>
      )}

      {tab === "saved" && (
        <div className="flex flex-col gap-[8px] min-h-0" style={{ overflowY: "auto" }}>
          {saved.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--color-dim)" }}>
              Nothing saved yet. Build one on Pick and name it.
            </span>
          )}
          {saved.map(([id, w]) => (
            <div key={id} className="row-card flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => onStart(w.name, w.exercises)}
                className="flex flex-col gap-[3px] min-w-0 text-left"
                style={{ flex: 1 }}
              >
                <span className="row-title truncate">{w.name}</span>
                <span className="text-[12px] truncate" style={{ color: "var(--color-muted)" }}>
                  {(w.exercises || []).length} movements
                </span>
              </button>
              <button
                type="button"
                onClick={() => deleteWorkout(id)}
                style={{ fontSize: 12, color: "var(--color-dim)", flex: "none" }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
