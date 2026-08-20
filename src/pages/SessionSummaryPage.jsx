import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { e1rm, toKg, weekdayLabel } from "../lib/training";

export default function SessionSummaryPage({ sessionKey, onClose }) {
  const { sessions, plans, bodyweightKg, updateSessionNote } = useWorkout();
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const session = sessions[sessionKey];

  const stats = useMemo(() => {
    if (!session) return null;

    const entries = Object.entries(session.entries || {});
    const doneSets = entries.flatMap(([name, e]) =>
      (e.sets || []).filter((s) => s && s.done).map((s) => ({ ...s, name }))
    );

    const volumeKg = doneSets.reduce(
      (sum, s) => sum + toKg(s.weight, s.weightUnit, bodyweightKg) * (Number(s.reps) || 0),
      0
    );
    const rpeValues = doneSets.filter((s) => s.rpe).map((s) => Number(s.rpe));
    const avgRpe = rpeValues.length
      ? Math.round((rpeValues.reduce((a, b) => a + b, 0) / rpeValues.length) * 10) / 10
      : null;

    // Best e1RM this exercise ever hit, excluding this very session.
    const priorBestFor = (name) =>
      Math.max(
        0,
        ...Object.entries(sessions)
          .filter(([id]) => id !== sessionKey)
          .flatMap(([, s]) => (s.entries?.[name]?.sets || []).filter((x) => x && x.done))
          .map((s) => e1rm(toKg(s.weight, s.weightUnit, bodyweightKg), Number(s.reps)))
      );

    let pr = null;
    doneSets.forEach((s) => {
      const est = e1rm(toKg(s.weight, s.weightUnit, bodyweightKg), Number(s.reps));
      const prior = priorBestFor(s.name);
      if (prior > 0 && est > prior * 1.001 && (!pr || est > pr.est)) {
        pr = { name: s.name, weight: s.weight, unit: s.weightUnit, reps: s.reps, est };
      }
    });

    const durationMin = session.startedAt && session.finishedAt
      ? Math.round((session.finishedAt - session.startedAt) / 60000)
      : null;

    const breakdown = entries.map(([name, e]) => {
      const done = (e.sets || []).filter((s) => s && s.done);
      return { name, count: done.length, sample: done[0] };
    });

    return { volumeKg: Math.round(volumeKg), avgRpe, pr, durationMin, breakdown, totalSets: doneSets.length };
  }, [session, sessions, sessionKey, bodyweightKg]);

  if (!session || !stats) {
    return (
      <div className="max-w-lg mx-auto card p-8 text-center">
        <p className="text-ink-soft mb-4">That session no longer exists.</p>
        <button type="button" onClick={onClose} className="btn-clay px-4 py-2">
          Back to Today
        </button>
      </div>
    );
  }

  const dayLabel = plans[session.planId]?.[session.dayIndex];
  const routineName = dayLabel?.name || weekdayLabel(session.dayIndex);
  const dateLine = new Date(session.startedAt || Date.now()).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const saveNote = () => {
    updateSessionNote(sessionKey, noteDraft.trim());
    setIsAddingNote(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-8">
      <div>
        <div className="text-accent text-sm">
          {dateLine}
          {stats.durationMin != null && ` · ${stats.durationMin} min`}
        </div>
        <h1 className="mt-2 text-4xl leading-[1.05]">
          {routineName}, done.
          <br />
          All {stats.totalSets} sets.
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="card p-4">
          <div className="stencil mb-1.5">Volume</div>
          <div className="readout text-2xl">
            {stats.volumeKg.toLocaleString()}
            <span className="text-sm font-body text-ink-muted"> kg</span>
          </div>
        </div>
        <div className="card p-4">
          <div className="stencil mb-1.5">Avg RPE</div>
          <div className="readout text-2xl">{stats.avgRpe ?? "—"}</div>
        </div>
      </div>

      {stats.pr && (
        <div className="bg-positive-bg rounded-card p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-positive-ink">
            New personal record
          </div>
          <div className="mt-1.5 text-lg" style={{ fontFamily: "var(--font-heading)" }}>
            {stats.pr.name} — {stats.pr.weight}{stats.pr.unit} × {stats.pr.reps}
          </div>
          <div className="mt-1 text-sm text-positive-ink">
            Estimated 1RM {Math.round(stats.pr.est)}kg
          </div>
        </div>
      )}

      <div>
        <div className="stencil mb-2.5">Exercise breakdown</div>
        <div className="space-y-2">
          {stats.breakdown.map(({ name, count, sample }) => (
            <div key={name} className="flex items-baseline gap-3">
              <span className="flex-1 text-ink-soft">{name}</span>
              <span className="text-sm text-ink-muted">
                {count > 0 && sample
                  ? `${count} × ${sample.weight || "BW"}${sample.weight ? sample.weightUnit : ""}`
                  : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isAddingNote ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="How did it feel?"
            className="w-full p-3 border border-border-control rounded-card min-h-[90px] bg-surface"
          />
          <button type="button" onClick={saveNote} className="btn-clay w-full py-3">
            Save note
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          <button type="button" onClick={onClose} className="btn-ink w-full py-4">
            Save and close
          </button>
          <button
            type="button"
            onClick={() => {
              setNoteDraft(session.note || "");
              setIsAddingNote(true);
            }}
            className="btn-outline w-full py-3.5 text-sm"
          >
            Add a note about today
          </button>
        </div>
      )}
    </div>
  );
}
