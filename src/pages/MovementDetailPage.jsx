import React, { useState } from "react";
import { ChevronLeft, Trash2 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import {
  guessPattern,
  LIBRARY_BY_NAME,
  PATTERN_LABELS,
  EQUIPMENT_OPTIONS,
  resolveEquipment,
} from "../lib/exerciseLibrary";
import { exerciseHistory, liftStats, weekdayLabel, MUSCLE_GROUPS as ALL_GROUPS } from "../lib/training";

const WEIGHT_UNITS = ["KG", "LBS", "Body Wt."];
const REPS_UNITS = ["Reps", "Secs", "Mins"];

export default function MovementDetailPage({ exerciseName, onBack, onSeeHistory }) {
  const {
    exerciseBank,
    sessions,
    bodyweightKg,
    getDetail,
    updateDetailField,
    updateBankField,
    removeBankExercise,
    exerciseAppearsIn,
    appendExerciseToDay,
    primaryPlanId,
    plans,
  } = useWorkout();

  const [isEditing, setIsEditing] = useState(false);
  const [pickingDay, setPickingDay] = useState(false);

  const bankData = exerciseBank[exerciseName];
  const detail = getDetail(exerciseName);
  const pattern = bankData?.pattern || guessPattern(exerciseName);
  const cues = LIBRARY_BY_NAME[exerciseName]?.cues || [];
  const equipment = resolveEquipment(bankData, exerciseName);
  const rest = parseInt(bankData?.restSeconds, 10) || 90;

  const history = exerciseHistory(sessions, exerciseName, bodyweightKg);
  const best = history.reduce(
    (top, h) => (!top || h.e1rm > top.e1rm ? h : top),
    null
  );
  const stats = liftStats(sessions, exerciseName, bodyweightKg);
  const appearsIn = exerciseAppearsIn(exerciseName);

  const groups = bankData?.muscleGroups || [];
  const toggleGroup = (group) => {
    const next = groups.includes(group) ? groups.filter((g) => g !== group) : [...groups, group];
    updateBankField(exerciseName, "muscleGroups", next);
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-8">
      <div className="flex items-baseline justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-ink-muted hover:text-accent flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        {bankData && !bankData.isHidden && (
          <button
            type="button"
            onClick={() => setIsEditing((v) => !v)}
            className="text-sm font-medium text-accent"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
        )}
      </div>

      <div>
        <h1 className="text-4xl">{exerciseName}</h1>
        {isEditing ? (
          <textarea
            value={detail.explanation || ""}
            onChange={(e) => updateDetailField(exerciseName, "explanation", e.target.value)}
            placeholder="Describe the movement..."
            className="mt-2 w-full p-3 border border-border-control rounded-card bg-surface min-h-[70px] text-sm"
          />
        ) : (
          detail.explanation && (
            <p className="mt-2 text-sm text-ink-mid leading-relaxed">{detail.explanation}</p>
          )
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {ALL_GROUPS.map((group) => (
              <button
                key={group}
                type="button"
                onClick={() => toggleGroup(group)}
                className="chip"
                data-active={groups.includes(group)}
              >
                {group}
              </button>
            ))}
          </div>
          <label className="text-xs text-ink-muted block">
            Equipment
            <select
              value={bankData?.equipment || ""}
              onChange={(e) => updateBankField(exerciseName, "equipment", e.target.value)}
              className="mt-1 w-full p-2 border border-border-control rounded-card bg-surface text-sm text-ink"
            >
              <option value="">Auto ({resolveEquipment({ ...bankData, equipment: undefined }, exerciseName)})</option>
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </label>
          <div className="card p-4 grid grid-cols-2 gap-3">
            <label className="text-xs text-ink-muted">
              Sets
              <input
                type="number"
                min="1"
                value={bankData?.sets ?? ""}
                onChange={(e) => updateBankField(exerciseName, "sets", e.target.value)}
                className="mt-1 w-full p-2 border border-border-control rounded-card bg-surface text-sm text-ink"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Rest (seconds)
              <input
                type="number"
                min="15"
                step="15"
                value={bankData?.restSeconds ?? ""}
                onChange={(e) => updateBankField(exerciseName, "restSeconds", e.target.value)}
                className="mt-1 w-full p-2 border border-border-control rounded-card bg-surface text-sm text-ink"
              />
            </label>
            <label className="text-xs text-ink-muted">
              Reps
              <div className="mt-1 flex">
                <input
                  type="text"
                  value={bankData?.reps ?? ""}
                  onChange={(e) => updateBankField(exerciseName, "reps", e.target.value)}
                  className="flex-1 p-2 border border-border-control rounded-l-card bg-surface text-sm text-ink"
                />
                <select
                  value={bankData?.repsUnit ?? "Reps"}
                  onChange={(e) => updateBankField(exerciseName, "repsUnit", e.target.value)}
                  className="border border-border-control border-l-0 rounded-r-card bg-surface-wash text-xs px-1"
                >
                  {REPS_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="text-xs text-ink-muted">
              Weight
              <div className="mt-1 flex">
                <input
                  type="number"
                  value={bankData?.weightUnit === "Body Wt." ? "" : bankData?.weight ?? ""}
                  disabled={bankData?.weightUnit === "Body Wt."}
                  onChange={(e) => updateBankField(exerciseName, "weight", e.target.value)}
                  className="flex-1 p-2 border border-border-control rounded-l-card bg-surface text-sm text-ink disabled:opacity-50"
                />
                <select
                  value={bankData?.weightUnit ?? "KG"}
                  onChange={(e) => updateBankField(exerciseName, "weightUnit", e.target.value)}
                  className="border border-border-control border-l-0 rounded-r-card bg-surface-wash text-xs px-1"
                >
                  {WEIGHT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>
          <button
            type="button"
            onClick={() => removeBankExercise(exerciseName)}
            className="text-sm text-negative flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Remove from library
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {groups.length > 0 && <span className="chip">{groups.join(" · ")}</span>}
            {PATTERN_LABELS[pattern] && <span className="chip">{PATTERN_LABELS[pattern]}</span>}
            <span className="chip">{equipment}</span>
            <span className="chip">
              Rest {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
            </span>
          </div>

          {cues.length > 0 && (
            <ul className="space-y-1.5">
              {cues.map((cue, i) => (
                <li key={i} className="text-sm text-ink-soft flex gap-2">
                  <span className="text-accent">{String(i + 1).padStart(2, "0")}</span>
                  {cue}
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="card p-4">
              <div className="stencil mb-1.5">Best set</div>
              <div className="readout text-xl">
                {stats.heaviestWeight > 0 ? `${stats.heaviestWeight} × ${stats.heaviestReps}` : "—"}
              </div>
            </div>
            <div className="card p-4">
              <div className="stencil mb-1.5">Est. 1RM</div>
              <div className="readout text-xl">
                {best ? `${Math.round(best.e1rm)} kg` : "—"}
              </div>
            </div>
          </div>

          {appearsIn.length > 0 && (
            <div>
              <div className="stencil mb-2">Appears in</div>
              <div className="space-y-2">
                {appearsIn.map(({ dayIdx, dayLabel }, i) => (
                  <div key={i} className="flex items-baseline gap-3">
                    <span className="flex-1 text-ink-soft">
                      {weekdayLabel(dayIdx)}
                      {dayLabel ? ` · ${dayLabel}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {pickingDay ? (
              <div className="card p-3 space-y-1.5">
                {(plans[primaryPlanId] || []).map((d, dayIdx) => (
                  <button
                    key={dayIdx}
                    type="button"
                    onClick={() => {
                      appendExerciseToDay(primaryPlanId, dayIdx, exerciseName);
                      setPickingDay(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-card hover:bg-surface-wash text-sm text-ink-soft"
                  >
                    {weekdayLabel(dayIdx)}
                    {d.name ? ` · ${d.name}` : ""}
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setPickingDay(true)} className="btn-clay w-full py-3.5">
                Add to a routine
              </button>
            )}
            <button type="button" onClick={onSeeHistory} className="btn-outline w-full py-3.5 text-sm">
              See full history
            </button>
          </div>
        </>
      )}
    </div>
  );
}
