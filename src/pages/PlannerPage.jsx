import React from "react";
import { CheckCircle2, Play, Plus, Trash2 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import ExerciseLabel from "../components/ExerciseLabel";
import GlobalTracker from "../components/GlobalTracker";
import { cleanName, isRestEntry } from "../lib/format";
import { friendlyDate, weekKey } from "../lib/training";

export default function PlannerPage({
  selectedPlan,
  isEditing,
  onToggleEditing,
  onStartDay,
  onOpenDetail,
  onRequestDelete,
}) {
  const {
    plans,
    setExerciseAt,
    addExerciseTo,
    removeExerciseFrom,
    getDayTotalSets,
    isDayDoneThisWeek,
    getWeekSession,
    isExerciseLogged,
  } = useWorkout();

  const thisWeek = weekKey();

  const currentPlan = plans[selectedPlan] || [];
  const maxCols = Math.max(
    3,
    ...currentPlan.map((day) => (day.exercises || []).length)
  );
  const onlyOnePlan = Object.keys(plans).length <= 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-iron-850 rounded-sm p-6 sm:p-8 border border-iron-700">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            🏋️ Schedule
          </h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRequestDelete}
              disabled={onlyOnePlan}
              className={`px-4 py-2 rounded-sm text-sm font-medium border transition-colors ${
                onlyOnePlan
                  ? "bg-iron-800 text-chalk-500 border-iron-700 cursor-not-allowed"
                  : "bg-plate-red/10 text-plate-red hover:bg-plate-red/20 border-plate-red/40"
              }`}
            >
              🗑️ Delete
            </button>
            <button
              type="button"
              onClick={onToggleEditing}
              className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                isEditing
                  ? "bg-plate-yellow text-iron-950 hover:bg-plate-yellow-hot"
                  : "bg-iron-850 border border-iron-600 text-chalk-200 hover:bg-iron-800"
              }`}
            >
              {isEditing ? "💾 Save" : "✏️ Edit"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded border border-iron-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-iron-800 border-b border-iron-700">
                <th className="p-4 font-semibold text-chalk-200 min-w-[120px]">
                  Day
                </th>
                {Array.from({ length: maxCols }).map((_, i) => (
                  <th
                    key={i}
                    className="p-4 font-semibold text-chalk-200 min-w-[200px]"
                  >
                    Exercise {i + 1}
                  </th>
                ))}
                {isEditing && (
                  <th className="p-4 font-semibold text-chalk-200 w-12 text-center">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {currentPlan.map((row, dayIdx) => {
                const totalSets = getDayTotalSets(selectedPlan, dayIdx);
                const logged = isDayDoneThisWeek(selectedPlan, dayIdx, thisWeek);
                const weekSession = getWeekSession(selectedPlan, dayIdx, thisWeek);
                const isDayComplete = !!logged?.finished;

                return (
                  <tr
                    key={dayIdx}
                    className={`border-b border-iron-800 transition-colors ${
                      isDayComplete && !isEditing
                        ? "bg-iron-900/70"
                        : "hover:bg-iron-800/50"
                    }`}
                  >
                    <td
                      className={`p-4 font-medium border-r border-iron-800 ${
                        isEditing ? "bg-iron-900 text-chalk-50" : ""
                      } ${isDayComplete ? "bg-iron-800" : ""}`}
                    >
                      <span
                        className={
                          isDayComplete ? "line-through text-chalk-500" : ""
                        }
                      >
                        {row.day}
                      </span>

                      {!isEditing && totalSets > 0 && (
                        <div className="mt-1.5">
                          {isDayComplete ? (
                            <span className="text-xs font-medium text-plate-green flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {friendlyDate(logged.date)}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onStartDay(dayIdx)}
                              className="text-xs font-semibold text-white bg-plate-yellow hover:bg-plate-yellow-hot rounded px-2.5 py-1.5 flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              {logged ? `Resume ${logged.done}/${logged.total}` : "Start"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>

                    {Array.from({ length: maxCols }).map((_, exIdx) => {
                      const exercises = row.exercises || [];
                      const exerciseValue =
                        exercises[exIdx] !== undefined ? exercises[exIdx] : null;
                      const isFinished =
                        !isEditing &&
                        exerciseValue !== null &&
                        !isRestEntry(exerciseValue) &&
                        isExerciseLogged(weekSession, cleanName(exerciseValue));

                      return (
                        <td key={exIdx} className="p-4 align-top">
                          {isEditing ? (
                            exerciseValue !== null ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  list="exercise-bank-list"
                                  value={exerciseValue}
                                  onChange={(e) =>
                                    setExerciseAt(
                                      selectedPlan,
                                      dayIdx,
                                      exIdx,
                                      e.target.value
                                    )
                                  }
                                  className="w-full p-2 border border-iron-600 rounded-sm focus:ring-2 focus:ring-plate-yellow"
                                  placeholder="Select or type..."
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeExerciseFrom(selectedPlan, dayIdx, exIdx)
                                  }
                                  aria-label="Remove exercise"
                                  className="text-plate-red/80 hover:text-plate-red p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-chalk-600 italic text-sm">-</span>
                            )
                          ) : (
                            <div
                              className={`transition-all ${
                                isFinished
                                  ? "line-through opacity-40 grayscale"
                                  : "text-chalk-50"
                              }`}
                            >
                              {exerciseValue !== null && (
                                <ExerciseLabel
                                  name={exerciseValue}
                                  onOpenDetail={onOpenDetail}
                                />
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {isEditing && (
                      <td className="p-4 text-center align-top">
                        <button
                          type="button"
                          onClick={() => addExerciseTo(selectedPlan, dayIdx)}
                          aria-label="Add exercise to this day"
                          className="p-2 bg-iron-800 hover:bg-plate-yellow/20 text-plate-yellow rounded-full"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <GlobalTracker />
    </div>
  );
}
