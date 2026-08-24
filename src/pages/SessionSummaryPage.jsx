import React, { useMemo, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { e1rm, toKg, weekdayLabel } from "../lib/training";

/**
 * The app's one deliberately dark screen — full-bleed, no header, no tab
 * bar. The contrast itself is the reward, so this is built on
 * `.surface-inverse` rather than the ambient tokens (see index.css): in
 * Night, where everything else already went dark, this flips to be the
 * only paper-bright screen instead.
 */
export default function SessionSummaryPage({ sessionKey, onClose, isReadOnly = false }) {
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
        pr = { name: s.name, weight: s.weight, unit: s.weightUnit, reps: s.reps, est, prior };
      }
    });

    const durationMin = session.startedAt && session.finishedAt
      ? Math.round((session.finishedAt - session.startedAt) / 60000)
      : null;

    const breakdown = entries.map(([name, e]) => {
      const done = (e.sets || []).filter((s) => s && s.done);
      return { name, count: done.length, sample: done[0] };
    });

    return {
      volumeKg: Math.round(volumeKg),
      avgRpe,
      pr,
      durationMin,
      breakdown,
      totalSets: doneSets.length,
    };
  }, [session, sessions, sessionKey, bodyweightKg]);

  if (!session || !stats) {
    return (
      <div className="surface-inverse fixed inset-0 z-40 overflow-y-auto animate-in fade-in" style={{ animationDuration: "260ms", "--enter-y": "6px" }}>
        <div className="max-w-lg mx-auto px-6 pt-16 pb-10 text-center">
          <p className="mb-4" style={{ color: "var(--inv-aside)" }}>That session no longer exists.</p>
          <button
            type="button"
            onClick={onClose}
            className="py-4 px-6 rounded-card font-medium text-sm"
            style={{ background: "var(--inv-btn-primary-bg)", color: "var(--inv-btn-primary-label)" }}
          >
            Back to Workout
          </button>
        </div>
      </div>
    );
  }

  const dayLabel = session.planId != null ? plans[session.planId]?.[session.dayIndex] : null;
  const routineName =
    session.label || dayLabel?.name || (session.dayIndex != null ? weekdayLabel(session.dayIndex) : "Workout");

  const asideClauses = [
    stats.durationMin != null ? `${stats.durationMin} minutes.` : null,
    stats.volumeKg > 0 ? `${stats.volumeKg.toLocaleString()} kg moved.` : null,
    stats.pr ? "One new best." : null,
  ].filter(Boolean);

  const saveNote = () => {
    updateSessionNote(sessionKey, noteDraft.trim());
    setIsAddingNote(false);
  };

  return (
    <div
      className="surface-inverse fixed inset-0 z-40 overflow-y-auto animate-in fade-in"
      style={{ animationDuration: "260ms", "--enter-y": "6px" }}
    >
      <div className="max-w-lg mx-auto px-6 pt-16 pb-32">
        <div
          className="text-xs font-medium uppercase tracking-[0.16em]"
          style={{ color: "var(--inv-eyebrow)" }}
        >
          Session complete
        </div>
        <h1
          className="mt-4 text-[2.75rem] leading-[1.06] -tracking-[0.01em]"
          style={{ fontFamily: "var(--font-heading)", color: "var(--inv-title)" }}
        >
          {routineName}, done.
          <br />
          All {stats.totalSets} sets.
        </h1>
        {asideClauses.length > 0 && (
          <p className="aside mt-4.5 text-base leading-relaxed" style={{ color: "var(--inv-aside)" }}>
            {asideClauses.join(" ")}
          </p>
        )}

        <div className="flex gap-2.5 mt-8">
          <div className="flex-1 rounded-[18px] p-4" style={{ background: "var(--inv-tile-bg)" }}>
            <div
              className="text-[11px] font-medium uppercase tracking-[0.12em]"
              style={{ color: "var(--inv-tile-label)" }}
            >
              Volume
            </div>
            <div
              className="mt-1.5 text-2xl"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 500, color: "var(--inv-tile-value)" }}
            >
              {stats.volumeKg.toLocaleString()}
              <span className="text-xs font-body ml-1" style={{ color: "var(--inv-tile-unit)" }}>
                kg
              </span>
            </div>
          </div>
          <div className="flex-1 rounded-[18px] p-4" style={{ background: "var(--inv-tile-bg)" }}>
            <div
              className="text-[11px] font-medium uppercase tracking-[0.12em]"
              style={{ color: "var(--inv-tile-label)" }}
            >
              Avg RPE
            </div>
            <div
              className="mt-1.5 text-2xl"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 500, color: "var(--inv-tile-value)" }}
            >
              {stats.avgRpe ?? "—"}
            </div>
          </div>
        </div>

        {stats.pr && (
          <div className="mt-4 rounded-[18px] p-4.5" style={{ background: "var(--inv-pr-bg)" }}>
            <div
              className="text-[10.5px] font-medium uppercase tracking-[0.12em]"
              style={{ color: "var(--inv-pr-label)" }}
            >
              New personal record
            </div>
            <div
              className="mt-1.5 text-xl leading-[1.15]"
              style={{ fontFamily: "var(--font-heading)", fontWeight: 500, color: "var(--inv-pr-title)" }}
            >
              {stats.pr.name} — {stats.pr.weight}{stats.pr.unit} × {stats.pr.reps}
            </div>
            <div className="mt-1 text-sm" style={{ color: "var(--inv-pr-sub)" }}>
              Estimated 1RM {Math.round(stats.pr.est)} kg
              {stats.pr.prior > 0 ? ` · +${Math.round(stats.pr.est - stats.pr.prior)} on your best` : ""}
            </div>
          </div>
        )}

        <div className="mt-7">
          <div
            className="text-[11px] font-medium uppercase tracking-[0.12em]"
            style={{ color: "var(--inv-tile-label)" }}
          >
            Exercise breakdown
          </div>
          <div className="mt-2.5 space-y-2">
            {stats.breakdown.map(({ name, count, sample }) => (
              <div key={name} className="flex items-baseline gap-3">
                <span className="flex-1" style={{ color: "var(--inv-title)" }}>{name}</span>
                <span className="text-sm" style={{ color: "var(--inv-aside)" }}>
                  {count > 0 && sample
                    ? `${count} × ${sample.weight || "BW"}${sample.weight ? sample.weightUnit : ""}`
                    : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isAddingNote && (
          <div className="mt-6 space-y-2">
            <textarea
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder="How did it feel?"
              className="w-full p-3 rounded-card min-h-[90px] bg-transparent"
              style={{ border: `1px solid var(--inv-btn-secondary-border)`, color: "var(--inv-title)" }}
            />
            <button
              type="button"
              onClick={saveNote}
              className="w-full py-3 rounded-card font-medium text-sm"
              style={{ background: "var(--inv-btn-primary-bg)", color: "var(--inv-btn-primary-label)" }}
            >
              Save note
            </button>
          </div>
        )}
      </div>

      {!isAddingNote && (
        <div
          className="fixed left-0 right-0 bottom-0 max-w-lg mx-auto px-[22px] pb-6 space-y-2.5"
          style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full py-[17px] rounded-card font-medium text-[15px]"
            style={{ background: "var(--inv-btn-primary-bg)", color: "var(--inv-btn-primary-label)" }}
          >
            {isReadOnly ? "Close" : "Save and close"}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => {
                setNoteDraft(session.note || "");
                setIsAddingNote(true);
              }}
              className="w-full py-3.5 rounded-card font-medium text-[13.5px]"
              style={{
                border: `1px solid var(--inv-btn-secondary-border)`,
                color: "var(--inv-btn-secondary-label)",
                background: "transparent",
              }}
            >
              Add a note about today
            </button>
          )}
        </div>
      )}
    </div>
  );
}
