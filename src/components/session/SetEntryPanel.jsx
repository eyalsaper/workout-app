import React from "react";
import Stepper from "../Stepper";
import { loadIncrement } from "../../lib/training";

/** The active-set logging controls, anchored as a bottom sheet. */
export default function SetEntryPanel({
  setIdx,
  s,
  d,
  est,
  priorBest,
  onChange,
  onConfirm,
  showRpe = true,
}) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-40 card-hero rounded-b-none p-4 pb-6 max-w-lg mx-auto">
      <div className="w-9 h-1 rounded-full bg-border-control mx-auto mb-4" />

      <div className="flex items-baseline justify-between mb-3">
        <span className="text-lg" style={{ fontFamily: "var(--font-heading)" }}>
          Set {setIdx + 1}
        </span>
        <span className="text-xs text-ink-muted">
          {s.targetReps ? `target ${s.targetReps} reps` : ""}
        </span>
      </div>

      <div className="flex gap-2">
        <Stepper
          label="Weight"
          value={d.weight}
          step={loadIncrement(s.weightUnit)}
          suffix={s.weightUnit}
          onChange={(v) => onChange({ weight: v })}
        />
        <Stepper label="Reps" value={d.reps} step={1} onChange={(v) => onChange({ reps: v })} />
        {showRpe && (
          <Stepper label="RPE" value={d.rpe} step={0.5} min={0} onChange={(v) => onChange({ rpe: v })} />
        )}
      </div>

      {est > 0 && (
        <p className="text-center text-xs text-ink-muted mt-3">
          This set puts you at{" "}
          <span className="text-accent font-medium">{Math.round(est)}kg</span> estimated 1RM
          {priorBest > 0 && est > priorBest * 1.001 && (
            <span className="text-accent"> · beats your best</span>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!d.reps || Number(d.reps) <= 0}
        className="btn-clay mt-3 w-full py-4"
      >
        Log set {setIdx + 1}
      </button>
    </div>
  );
}
