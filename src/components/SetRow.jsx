import React from "react";
import { CheckCircle2, Circle } from "lucide-react";
import ExerciseTimer from "./ExerciseTimer";
import {
  formatReps,
  formatWeight,
  getTimerSeconds,
  setDataFor,
} from "../lib/format";

/**
 * One tappable set. The day checklist and the routine checklist both render
 * these — they used to be two near-identical 80-line blocks.
 */
export default function SetRow({
  name,
  setIdx,
  numSets,
  bankData,
  isChecked,
  onToggle,
  showSetLabel = true,
}) {
  const hasBankData = bankData && !bankData.isHidden;
  const { reps, repsUnit, weight, weightUnit } = setDataFor(bankData, setIdx);
  const repsStr = hasBankData ? formatReps(reps, repsUnit) : "";
  const weightStr = hasBankData ? formatWeight(weight, weightUnit) : "";
  const timerSeconds = getTimerSeconds(bankData, setIdx);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isChecked}
      className={`w-full text-left flex flex-col p-4 rounded transition-all border ${
        isChecked
          ? "bg-plate-green/10 border-plate-green/40 opacity-60"
          : "bg-iron-850 border-iron-700  hover:border-plate-yellow/60 hover:bg-plate-yellow/8"
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0">
          {isChecked ? (
            <CheckCircle2 className="w-6 h-6 text-plate-green" />
          ) : (
            <Circle className="w-6 h-6 text-chalk-600" />
          )}
        </div>
        <div
          className={`flex-1 ${
            isChecked ? "line-through text-chalk-500" : "text-chalk-50"
          }`}
        >
          <div className="font-bold text-lg">
            {name}
            {showSetLabel && (
              <span className="text-sm font-normal text-chalk-500 ml-2">
                Set {setIdx + 1} of {numSets}
              </span>
            )}
          </div>
          {(repsStr || weightStr) && (
            <div className="text-sm font-medium mt-0.5 text-chalk-300">
              {repsStr} {weightStr}
            </div>
          )}
        </div>
      </div>

      {timerSeconds > 0 && !isChecked && (
        <div className="ml-10">
          <ExerciseTimer totalSeconds={timerSeconds} />
        </div>
      )}
    </button>
  );
}
