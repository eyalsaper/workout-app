import React, { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { isRestEntry, cleanName, setCountFor } from "../lib/format";
import { weekdayLabel } from "../lib/training";

function StatTile({ label, value, onChange }) {
  return (
    <div className="flex-1 bg-surface-inset rounded-inset p-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-transparent text-center readout text-lg focus:outline-none"
      />
    </div>
  );
}

export default function RoutineEditorPage({ dayIdx, onOpenDetail, onBack }) {
  const {
    plans,
    primaryPlanId,
    exerciseBank,
    updateBankField,
    appendExerciseToDay,
    removeExerciseFrom,
    reorderExercise,
    setDayNote,
    setDayRest,
    setDayProgression,
  } = useWorkout();

  const [expanded, setExpanded] = useState(null);
  const [newMovement, setNewMovement] = useState("");

  const day = plans[primaryPlanId]?.[dayIdx];
  if (!day) return null;

  const exercises = day.exercises || [];
  const isRest = exercises.length > 0 && exercises.every((ex) => isRestEntry(ex));
  const progression = { auto: true, incrementKg: 2.5, ...day.progression };

  const totalSets = exercises.reduce((sum, ex) => {
    if (isRestEntry(ex)) return sum;
    return sum + setCountFor(exerciseBank[cleanName(ex)]);
  }, 0);

  const addMovement = () => {
    const name = cleanName(newMovement);
    if (!name) return;
    appendExerciseToDay(primaryPlanId, dayIdx, name);
    setNewMovement("");
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-8">
      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-accent">
          Week
        </button>
        <h1 className="mt-2.5 text-4xl">{day.name || weekdayLabel(dayIdx)}</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          {weekdayLabel(dayIdx)}
          {!isRest &&
            ` · ${exercises.length} movement${exercises.length === 1 ? "" : "s"} · ${totalSets} set${
              totalSets === 1 ? "" : "s"
            }`}
        </p>
      </div>

      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm text-ink-soft">This is a rest day</span>
        <button
          type="button"
          role="switch"
          aria-checked={isRest}
          onClick={() => setDayRest(primaryPlanId, dayIdx, !isRest)}
          className="switch"
          data-on={isRest}
        >
          <span className="switch-knob" />
        </button>
      </div>

      {isRest ? (
        <input
          type="text"
          value={day.note || ""}
          onChange={(e) => setDayNote(primaryPlanId, dayIdx, e.target.value)}
          placeholder="Note, e.g. walk 40 min"
          className="w-full p-3 border border-border-control rounded-card bg-surface"
        />
      ) : (
        <>
          <div className="space-y-2.5">
            {exercises.map((ex, i) => {
              const name = cleanName(ex);
              const bankData = exerciseBank[name];
              const isOpen = expanded === i;
              return (
                <div key={i} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => reorderExercise(primaryPlanId, dayIdx, i, i - 1)}
                        disabled={i === 0}
                        aria-label="Move up"
                        className="text-ink-faint disabled:opacity-30"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => reorderExercise(primaryPlanId, dayIdx, i, i + 1)}
                        disabled={i === exercises.length - 1}
                        aria-label="Move down"
                        className="text-ink-faint disabled:opacity-30"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className="flex-1 text-left"
                    >
                      <div className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
                        {name}
                      </div>
                      {bankData?.muscleGroups?.length > 0 && (
                        <div className="text-xs text-ink-muted mt-0.5">
                          {bankData.muscleGroups.join(" · ")}
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenDetail(name)}
                      className="text-xs text-accent"
                    >
                      Detail
                    </button>
                    <button
                      type="button"
                      onClick={() => removeExerciseFrom(primaryPlanId, dayIdx, i)}
                      aria-label={`Remove ${name}`}
                      className="text-ink-faint hover:text-negative"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {isOpen && bankData && (
                    <div className="mt-3 flex gap-2">
                      <StatTile
                        label="Sets"
                        value={bankData.sets}
                        onChange={(v) => updateBankField(name, "sets", v)}
                      />
                      <StatTile
                        label="Reps"
                        value={bankData.reps}
                        onChange={(v) => updateBankField(name, "reps", v)}
                      />
                      <StatTile
                        label="Weight"
                        value={bankData.weight}
                        onChange={(v) => updateBankField(name, "weight", v)}
                      />
                      <StatTile
                        label="Rest"
                        value={bankData.restSeconds ?? ""}
                        onChange={(v) => updateBankField(name, "restSeconds", v)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="slot-empty p-3 flex gap-2">
              <input
                type="text"
                list="exercise-bank-list"
                value={newMovement}
                onChange={(e) => setNewMovement(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMovement()}
                placeholder="Add movement from library..."
                className="flex-1 bg-transparent focus:outline-none text-sm"
              />
              <button type="button" onClick={addMovement} className="text-sm font-medium text-accent">
                Add
              </button>
            </div>
          </div>

          <div>
            <div className="stencil mb-2.5">Progression</div>
            <div className="card divide-y divide-border">
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm text-ink-soft">Add weight when all reps clear</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={progression.auto}
                  onClick={() =>
                    setDayProgression(primaryPlanId, dayIdx, { auto: !progression.auto })
                  }
                  className="switch"
                  data-on={progression.auto}
                >
                  <span className="switch-knob" />
                </button>
              </div>
              <div className="p-4 flex items-center justify-between">
                <span className="text-sm text-ink-soft">Increment</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.5"
                    value={progression.incrementKg}
                    onChange={(e) =>
                      setDayProgression(primaryPlanId, dayIdx, {
                        incrementKg: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-14 text-right bg-transparent focus:outline-none text-sm font-medium text-ink-mid"
                  />
                  <span className="text-sm text-ink-mid">kg</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <button type="button" onClick={onBack} className="btn-ink w-full py-4">
        Save routine
      </button>
    </div>
  );
}
