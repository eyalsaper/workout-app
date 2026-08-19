import React, { useState } from "react";
import { ChevronDown, ChevronRight, ListOrdered, Plus, Trash2 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { setCountFor } from "../lib/format";
import { MUSCLE_GROUPS } from "../lib/training";
import { EXERCISE_LIBRARY } from "../lib/exerciseLibrary";

const REPS_UNITS = ["Reps", "Secs", "Mins"];
const WEIGHT_UNITS = ["KG", "LBS", "Body Wt."];

function RepsField({ value, unit, onChange, placeholder, compact }) {
  const pad = compact ? "p-1.5 text-sm" : "p-2";
  return (
    <div className="flex items-center">
      <input
        type={unit === "Reps" ? "text" : "number"}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange("reps", e.target.value)}
        className={`w-full ${pad} border border-iron-600 rounded-l-md border-r-0 focus:ring-2 focus:ring-plate-yellow focus:outline-none bg-iron-850`}
      />
      <select
        value={unit}
        aria-label="Reps unit"
        onChange={(e) => onChange("repsUnit", e.target.value)}
        className={`bg-iron-800 border border-iron-600 text-chalk-200 ${pad} rounded-r-md focus:outline-none focus:ring-2 focus:ring-plate-yellow ${
          compact ? "w-20" : "w-24"
        }`}
      >
        {REPS_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

function WeightField({ value, unit, onChange, compact }) {
  const isBodyweight = unit === "Body Wt.";
  const pad = compact ? "p-1.5 text-sm" : "p-2";
  return (
    <div className="flex items-center">
      <input
        type="number"
        placeholder={isBodyweight ? "-" : "0"}
        disabled={isBodyweight}
        value={isBodyweight ? "" : value ?? ""}
        onChange={(e) => onChange("weight", e.target.value)}
        className={`w-full ${pad} border border-iron-600 rounded-l-md border-r-0 focus:ring-2 focus:ring-plate-yellow focus:outline-none ${
          isBodyweight ? "bg-iron-800 opacity-60" : "bg-iron-850"
        }`}
      />
      <select
        value={unit}
        aria-label="Weight unit"
        onChange={(e) => onChange("weightUnit", e.target.value)}
        className={`bg-iron-800 border border-iron-600 text-chalk-200 ${pad} rounded-r-md focus:outline-none focus:ring-2 focus:ring-plate-yellow ${
          compact ? "w-[85px]" : "w-[110px]"
        }`}
      >
        {WEIGHT_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Muscle groups and rest time live in an expander rather than new columns —
 * the table is already at its width limit.
 */
function ExerciseSettingsRow({ exercise, data, updateBankField, defaultRest }) {
  const groups = data.muscleGroups || [];

  const toggleGroup = (group) => {
    const next = groups.includes(group)
      ? groups.filter((g) => g !== group)
      : [...groups, group];
    updateBankField(exercise, "muscleGroups", next);
  };

  return (
    <tr className="bg-iron-900 border-b border-iron-800">
      <td colSpan="5" className="px-4 pb-5 pt-1">
        <div className="grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-chalk-500 mb-2">
              Muscle groups — drives your weekly volume breakdown
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((group) => {
                const on = groups.includes(group);
                return (
                  <button
                    type="button"
                    key={group}
                    onClick={() => toggleGroup(group)}
                    aria-pressed={on}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      on
                        ? "bg-plate-yellow text-iron-950 border-plate-yellow"
                        : "bg-iron-850 text-chalk-300 border-iron-600 hover:border-plate-yellow/60"
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
            {groups.length === 0 && (
              <p className="text-xs text-flag-orange mt-2">
                Untagged exercises are skipped in the volume view.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={`rest-${exercise}`}
              className="block text-xs font-semibold uppercase tracking-wide text-chalk-500 mb-2"
            >
              Rest between sets
            </label>
            <div className="flex items-center gap-2">
              <input
                id={`rest-${exercise}`}
                type="number"
                min="15"
                step="15"
                placeholder={String(defaultRest)}
                value={data.restSeconds ?? ""}
                onChange={(e) =>
                  updateBankField(exercise, "restSeconds", e.target.value)
                }
                className="w-24 p-2 border border-iron-600 rounded-sm bg-iron-850 focus:ring-2 focus:ring-plate-yellow focus:outline-none"
              />
              <span className="text-sm text-chalk-500">seconds</span>
            </div>
            <p className="text-xs text-chalk-500 mt-1.5">
              Blank uses your default ({defaultRest}s). Try 180 for heavy
              compounds.
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function ExerciseBankPage() {
  const {
    exerciseBank,
    seedLibrary,
    addBankExercise,
    removeBankExercise,
    updateBankField,
    updateAltSet,
  } = useWorkout();

  const { settings } = useWorkout();
  const [draftName, setDraftName] = useState("");
  const [expanded, setExpanded] = useState(null);
  const defaultRest = parseInt(settings?.defaultRestSeconds, 10) || 90;

  const submitNew = () => {
    if (addBankExercise(draftName)) setDraftName("");
  };

  const visible = Object.entries(exerciseBank).filter(([, data]) => !data.isHidden);
  const missing = EXERCISE_LIBRARY.filter((item) => !exerciseBank[item.name]).length;

  return (
    <div className="bg-iron-850 rounded-sm p-6 sm:p-8 border border-iron-700 animate-in fade-in duration-300">
      <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
        <ListOrdered className="w-8 h-8 text-plate-yellow" /> Global Exercise Bank
      </h1>
      <p className="text-chalk-500 text-sm mb-6">
        Add exercises here to make them available in your Plan dropdowns. Tap a
        name to set muscle groups and rest time.
      </p>

      {missing > 0 && (
        <div className="mb-6 border border-plate-yellow/40 bg-plate-yellow/8 rounded-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-display font-bold uppercase text-chalk-50 tracking-wide">
              {missing} stock exercises available
            </div>
            <p className="text-sm text-chalk-300">
              Pre-tagged with muscle groups, rest times and form cues. Your own
              exercises are left exactly as they are.
            </p>
          </div>
          <button
            type="button"
            onClick={seedLibrary}
            className="px-4 py-2.5 bg-plate-yellow text-iron-950 rounded-sm font-display font-extrabold uppercase tracking-wide hover:bg-plate-yellow-hot transition-colors"
          >
            Add them
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded border border-iron-700">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-iron-800 border-b border-iron-700">
              <th className="p-4 font-semibold text-chalk-200 w-1/4">
                Exercise Name
              </th>
              <th className="p-4 font-semibold text-chalk-200 w-1/6">Sets</th>
              <th className="p-4 font-semibold text-chalk-200 w-1/4">
                Reps / Duration
              </th>
              <th className="p-4 font-semibold text-chalk-200 w-1/4">Weight</th>
              <th className="p-4 font-semibold text-chalk-200 text-center w-12">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(([exercise, data]) => {
              const isAlt = !!data.isAlternative;
              const numSets = setCountFor(data);
              const altRows = Array.from({ length: numSets });

              return (
                <React.Fragment key={exercise}>
                <tr className="border-b border-iron-800 hover:bg-iron-800/50">
                  <td className="p-4 align-top">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((cur) => (cur === exercise ? null : exercise))
                      }
                      className="font-semibold text-chalk-50 mb-1 flex items-center gap-1 hover:text-plate-yellow"
                    >
                      {expanded === exercise ? (
                        <ChevronDown className="w-4 h-4 text-chalk-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-chalk-500" />
                      )}
                      {exercise}
                    </button>
                    {(data.muscleGroups || []).length > 0 && (
                      <div className="text-xs text-chalk-500 mb-1 pl-5">
                        {(data.muscleGroups || []).join(" · ")}
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-chalk-500 cursor-pointer hover:text-plate-yellow">
                      <input
                        type="checkbox"
                        checked={isAlt}
                        onChange={(e) =>
                          updateBankField(exercise, "isAlternative", e.target.checked)
                        }
                        className="rounded text-plate-yellow focus:ring-plate-yellow"
                      />
                      Alternative Sets
                    </label>
                  </td>

                  <td className="p-4 align-top">
                    <input
                      type="number"
                      min="1"
                      aria-label={`Sets for ${exercise}`}
                      value={data.sets}
                      onChange={(e) =>
                        updateBankField(exercise, "sets", e.target.value)
                      }
                      className="w-full p-2 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow focus:outline-none bg-iron-850 text-center"
                    />
                  </td>

                  <td className="p-4 align-top">
                    {isAlt ? (
                      <div className="space-y-2">
                        {altRows.map((_, idx) => {
                          const altSet = data.altSets?.[idx] || {};
                          const unit = altSet.repsUnit || "Reps";
                          return (
                            <RepsField
                              key={idx}
                              compact
                              value={altSet.reps}
                              unit={unit}
                              placeholder={
                                unit === "Reps"
                                  ? `Set ${idx + 1} reps`
                                  : `Set ${idx + 1} time`
                              }
                              onChange={(field, v) =>
                                updateAltSet(exercise, idx, field, v)
                              }
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <RepsField
                        value={data.reps}
                        unit={data.repsUnit}
                        placeholder={
                          data.repsUnit === "Reps" ? "Reps / Letters" : "Time"
                        }
                        onChange={(field, v) => updateBankField(exercise, field, v)}
                      />
                    )}
                  </td>

                  <td className="p-4 align-top">
                    {isAlt ? (
                      <div className="space-y-2">
                        {altRows.map((_, idx) => {
                          const altSet = data.altSets?.[idx] || {};
                          return (
                            <WeightField
                              key={idx}
                              compact
                              value={altSet.weight}
                              unit={altSet.weightUnit || "KG"}
                              onChange={(field, v) =>
                                updateAltSet(exercise, idx, field, v)
                              }
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <WeightField
                        value={data.weight}
                        unit={data.weightUnit}
                        onChange={(field, v) => updateBankField(exercise, field, v)}
                      />
                    )}
                  </td>

                  <td className="p-4 text-center align-top">
                    <button
                      type="button"
                      onClick={() => removeBankExercise(exercise)}
                      aria-label={`Delete ${exercise}`}
                      className="text-plate-red/80 hover:text-plate-red p-2 rounded hover:bg-plate-red/10 mt-1"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
                {expanded === exercise && (
                  <ExerciseSettingsRow
                    exercise={exercise}
                    data={data}
                    updateBankField={updateBankField}
                    defaultRest={defaultRest}
                  />
                )}
                </React.Fragment>
              );
            })}

            <tr className="bg-plate-yellow/8">
              <td colSpan="5" className="p-6 text-center">
                <div className="flex items-center justify-center gap-3 max-w-lg mx-auto">
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submitNew()}
                    placeholder="Type new exercise name..."
                    className="flex-1 p-3 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={submitNew}
                    className="px-6 py-3 bg-plate-yellow text-iron-950 rounded-sm hover:bg-plate-yellow-hot transition-colors font-medium flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" /> Add to Bank
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
