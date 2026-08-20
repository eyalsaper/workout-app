import React, { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import ConfirmDialog from "../components/ConfirmDialog";
import { exerciseHistory, liftStats, friendlyDate } from "../lib/training";

export default function LiftHistoryPage({ exerciseName, onBack }) {
  const { sessions, exerciseBank, bodyweightKg, deleteSession } = useWorkout();
  const [confirmSessionId, setConfirmSessionId] = useState(null);

  const bankData = exerciseBank[exerciseName];
  const history = useMemo(
    () => exerciseHistory(sessions, exerciseName, bodyweightKg),
    [sessions, exerciseName, bodyweightKg]
  );
  const stats = liftStats(sessions, exerciseName, bodyweightKg);
  const maxE1rm = Math.max(1, ...history.map((h) => h.e1rm));
  const best = history.reduce((top, h) => (!top || h.e1rm > top.e1rm ? h : top), null);

  // Session rows, most recent first, with a PR flag computed against what was
  // the best e1RM *at the time* — not today's best.
  const sessionEntries = useMemo(() => {
    const withIds = Object.entries(sessions)
      .filter(([, s]) => s?.entries?.[exerciseName]?.sets?.some((x) => x?.done))
      .sort((a, b) => (a[1].date || "").localeCompare(b[1].date || ""));

    let runningBest = 0;
    const rows = withIds.map(([id, s]) => {
      const doneSets = s.entries[exerciseName].sets.filter((x) => x && x.done);
      const sessionBest = Math.max(
        ...doneSets.map((x) => {
          const w = x.weightUnit === "Body Wt." ? bodyweightKg : parseFloat(x.weight) || 0;
          const r = Number(x.reps) || 0;
          return r > 0 ? w * (1 + r / 30) : 0;
        })
      );
      const isPr = sessionBest > runningBest * 1.001;
      runningBest = Math.max(runningBest, sessionBest);
      return { id, session: s, doneSets, isPr };
    });
    return rows.reverse();
  }, [sessions, exerciseName, bodyweightKg]);

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-in fade-in duration-300 pb-6">
      {confirmSessionId && (
        <ConfirmDialog
          title="Delete this session?"
          message="This removes every set logged in it. It cannot be undone."
          confirmLabel="Delete session"
          onConfirm={() => {
            deleteSession(confirmSessionId);
            setConfirmSessionId(null);
          }}
          onCancel={() => setConfirmSessionId(null)}
        />
      )}

      <div>
        <button type="button" onClick={onBack} className="text-sm text-ink-muted hover:text-accent">
          Progress
        </button>
        <h1 className="mt-2.5 text-4xl">{exerciseName}</h1>
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {(bankData?.muscleGroups || []).length > 0 && (
            <span className="chip">{bankData.muscleGroups.join(" · ")}</span>
          )}
          <span className="chip">{history.length} session{history.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {history.length >= 2 && (
        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="stencil">Estimated 1RM</span>
            {best && (
              <span className="text-xs font-medium text-accent">
                {Math.round(best.e1rm)} kg · best ever
              </span>
            )}
          </div>
          <div className="mt-3.5 h-24 flex items-end gap-1">
            {history.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${i >= history.length - 3 ? "bg-accent" : "bg-positive-bg"}`}
                style={{ height: `${Math.max(4, (h.e1rm / maxE1rm) * 100)}%` }}
                title={`${h.date}: ${Math.round(h.e1rm)}kg`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <div>
          <div className="stencil mb-1.5">Heaviest</div>
          <div className="readout text-lg">
            {stats.heaviestWeight > 0 ? `${stats.heaviestWeight} × ${stats.heaviestReps}` : "—"}
          </div>
        </div>
        <div>
          <div className="stencil mb-1.5">Best volume</div>
          <div className="readout text-lg">{stats.bestVolume.toLocaleString()} kg</div>
        </div>
        <div>
          <div className="stencil mb-1.5">Avg RPE</div>
          <div className="readout text-lg">{stats.avgRpe ?? "—"}</div>
        </div>
      </div>

      <div>
        <div className="stencil mb-2.5">Every session</div>
        <div className="space-y-2">
          {sessionEntries.map(({ id, session, doneSets, isPr }) => (
            <div key={id} className="card p-3.5 flex items-baseline gap-3">
              <span className="w-16 text-xs text-ink-muted flex-shrink-0">
                {friendlyDate(session.date)}
              </span>
              <span className="flex-1 text-sm text-ink-soft">
                {doneSets
                  .map((s) => `${s.weight || "BW"} × ${s.reps}`)
                  .join("  ·  ")}
              </span>
              {isPr && <span className="text-xs font-medium text-accent">PR</span>}
              <button
                type="button"
                onClick={() => setConfirmSessionId(id)}
                aria-label="Delete this session"
                className="text-ink-faint hover:text-negative"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {sessionEntries.length === 0 && (
            <p className="text-sm text-ink-muted italic">No sessions logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
