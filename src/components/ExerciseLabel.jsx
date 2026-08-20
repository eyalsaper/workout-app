import React from "react";
import { Info } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import {
  cleanName,
  formatReps,
  formatWeight,
  isRestEntry,
  setCountFor,
  setDataFor,
} from "../lib/format";

/**
 * How an exercise reads inside the weekly grid: name, planned sets/reps/weight,
 * and — for alternative sets — one line per set.
 *
 * The notes page used to open on double-click or right-click. Neither gesture
 * exists on a phone, so there's now a visible info button as well.
 */
export default function ExerciseLabel({ name, onOpenDetail }) {
  const { exerciseBank, exerciseDetails } = useWorkout();

  if (isRestEntry(name)) {
    return <span className="text-ink-muted italic">{name || "Rest"}</span>;
  }

  const exName = cleanName(name);
  const bankData = exerciseBank[exName];
  const detail = exerciseDetails[exName];
  const hasNotes =
    !!detail &&
    ((detail.routine || []).some((item) => item && item.trim() !== "") ||
      (detail.explanation || "") !== "");

  const showBankSummary = bankData && !bankData.isHidden;

  return (
    <div className="flex flex-col w-full group">
      <div className="flex items-center gap-1.5 font-medium">
        <span>{exName}</span>

        <button
          type="button"
          onClick={() => onOpenDetail(exName)}
          title={`Open notes for ${exName}`}
          aria-label={`Open notes for ${exName}`}
          className={`p-1 -m-0.5 rounded-full transition-colors hover:bg-accent/20 ${
            hasNotes ? "text-accent" : "text-ink-faint hover:text-accent"
          }`}
        >
          <Info className="w-4 h-4" />
        </button>

        {showBankSummary && !bankData.isAlternative && (
          <span className="text-sm ml-1 font-normal opacity-70">
            {bankData.sets}*{formatReps(bankData.reps, bankData.repsUnit)}{" "}
            {formatWeight(bankData.weight, bankData.weightUnit)}
          </span>
        )}
      </div>

      {showBankSummary && bankData.isAlternative && (
        <div className="flex flex-col pl-3 mt-1 space-y-0.5 text-sm border-l-2 border-border opacity-70">
          {Array.from({ length: setCountFor(bankData) }).map((_, i) => {
            const s = setDataFor(bankData, i);
            return (
              <div key={i}>
                1*{formatReps(s.reps, s.repsUnit)}{" "}
                {formatWeight(s.weight, s.weightUnit)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
