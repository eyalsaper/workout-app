import React, { useMemo, useState } from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { EXERCISE_LIBRARY, LIBRARY_BY_NAME, libraryEntry } from "../lib/exerciseLibrary";

function StatTile({ label, value, onChange, suffix }) {
  return (
    <div className="flex-1 bg-surface-inset rounded-inset p-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="flex items-baseline justify-center gap-0.5">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1.5 w-full min-w-0 bg-transparent text-center readout text-lg focus:outline-none"
        />
        {suffix && <span className="text-xs text-ink-muted flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  );
}

/**
 * The "Build your workout for today" screen: pick exercises, set their
 * sets/reps/weight, then start immediately or save the list for later reuse
 * from Pre-made > Yours. No plan involved — same ad-hoc-session path as the
 * pre-made library uses.
 */
export default function BuildWorkoutPage({ onBack, onStart, onSave }) {
  const { exerciseBank } = useWorkout();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]);
  const [workoutName, setWorkoutName] = useState("");

  const allNames = useMemo(() => {
    const bankNames = Object.keys(exerciseBank).filter((n) => !exerciseBank[n].isHidden);
    return [...new Set([...EXERCISE_LIBRARY.map((i) => i.name), ...bankNames])].sort();
  }, [exerciseBank]);

  const pickedNames = useMemo(() => new Set(picked.map((p) => p.name)), [picked]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allNames;
    return allNames.filter((n) => n.toLowerCase().includes(q));
  }, [allNames, query]);

  const addExercise = (name) => {
    const bankData = exerciseBank[name] || (LIBRARY_BY_NAME[name] && libraryEntry(LIBRARY_BY_NAME[name]));
    setPicked((prev) => [
      ...prev,
      {
        name,
        sets: bankData?.sets ?? 3,
        reps: bankData?.reps ?? "10",
        weight: bankData?.weightUnit === "Body Wt." ? "" : bankData?.weight ?? "",
        weightUnit: bankData?.weightUnit || "KG",
      },
    ]);
  };

  const removeExercise = (name) => setPicked((prev) => prev.filter((p) => p.name !== name));

  const updateExercise = (name, field, value) =>
    setPicked((prev) => prev.map((p) => (p.name === name ? { ...p, [field]: value } : p)));

  const togglePick = (name) => (pickedNames.has(name) ? removeExercise(name) : addExercise(name));

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-56">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-accent flex items-center gap-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="mt-2.5 text-4xl">Build your workout</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Pick exercises, then set sets, reps and weight for each.
        </p>
      </div>

      {picked.length > 0 && (
        <div>
          <div className="stencil mb-2.5">Today's picks</div>
          <div className="space-y-2.5">
            {picked.map((p) => (
              <div key={p.name} className="card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                    {p.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeExercise(p.name)}
                    aria-label={`Remove ${p.name}`}
                    className="text-ink-faint hover:text-negative"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <StatTile label="Sets" value={p.sets} onChange={(v) => updateExercise(p.name, "sets", v)} />
                  <StatTile label="Reps" value={p.reps} onChange={(v) => updateExercise(p.name, "reps", v)} />
                  {p.weightUnit !== "Body Wt." && (
                    <StatTile
                      label="Weight"
                      value={p.weight}
                      suffix={p.weightUnit?.toLowerCase()}
                      onChange={(v) => updateExercise(p.name, "weight", v)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card flex items-center gap-2 px-4 py-3">
        <Search className="w-4 h-4 text-ink-faint flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises to add"
          className="flex-1 bg-transparent focus:outline-none text-sm"
        />
      </div>

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {filtered.map((name) => (
          <label
            key={name}
            className="flex items-center gap-3 p-3 rounded-card border border-border-control bg-surface text-sm text-ink-soft cursor-pointer"
          >
            <input
              type="checkbox"
              checked={pickedNames.has(name)}
              onChange={() => togglePick(name)}
              className="w-4 h-4 accent-accent flex-shrink-0"
            />
            {name}
          </label>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-ink-muted italic text-center py-4">Nothing matches.</p>
        )}
      </div>

      {picked.length > 0 && (
        <div
          className="fixed left-0 right-0 max-w-lg mx-auto px-3 sm:px-6 pb-4 pt-3 space-y-2.5 bg-surface-page border-t border-border z-40"
          style={{ bottom: "calc(74px + env(safe-area-inset-bottom))" }}
        >
          <button type="button" onClick={() => onStart(picked)} className="btn-ink w-full py-4">
            Start workout
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="Name it to save for later (optional)"
              className="flex-1 p-2.5 border border-border-control rounded-card bg-surface text-sm"
            />
            <button
              type="button"
              onClick={() => onSave(workoutName, picked)}
              className="btn-outline px-4 text-sm flex-shrink-0"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
