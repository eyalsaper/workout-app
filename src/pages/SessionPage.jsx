import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Lightbulb, Plus, Smartphone, X } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { useWakeLock } from "../hooks/useWakeLock";
import RestTimer from "../components/RestTimer";
import ExerciseTimer from "../components/ExerciseTimer";
import SetEntryPanel from "../components/session/SetEntryPanel";
import { getTimerSeconds, formatReps, formatWeight } from "../lib/format";
import {
  friendlyDate,
  daysAgo,
  suggestNextLoad,
  warmupSets,
  e1rm,
  toKg,
  exerciseHistory,
} from "../lib/training";
import { guessPattern, LIBRARY_BY_NAME, PATTERN_LABELS } from "../lib/exerciseLibrary";

export default function SessionPage({ sessionKey, onExit, onFinish }) {
  const {
    sessions,
    exerciseBank,
    settings,
    getLastPerformance,
    logSet,
    unlogSet,
    addSetTo,
    finishSession,
    deleteSession,
  } = useWorkout();

  const session = sessions[sessionKey];
  const [exIdx, setExIdx] = useState(0);
  const [restStartedAt, setRestStartedAt] = useState(null);
  const [restSeconds, setRestSeconds] = useState(90);
  const [draft, setDraft] = useState({});

  const { supported: wakeSupported, isHeld } = useWakeLock(
    !!session && !session.finishedAt && settings.keepScreenAwake
  );

  const exerciseNames = useMemo(
    () => Object.keys(session?.entries || {}),
    [session]
  );

  if (!session) {
    return (
      <div className="max-w-lg mx-auto card p-8 text-center">
        <p className="text-ink-soft mb-4">That session no longer exists.</p>
        <button type="button" onClick={onExit} className="btn-clay px-4 py-2">
          Back to Today
        </button>
      </div>
    );
  }

  if (exerciseNames.length === 0) {
    return (
      <div className="max-w-lg mx-auto card p-8 text-center space-y-4">
        <p className="text-ink-soft">
          This day has no exercises — it's a rest day.
        </p>
        <button type="button" onClick={onExit} className="btn-clay px-4 py-2">
          Back to Today
        </button>
      </div>
    );
  }

  const safeIdx = Math.min(exIdx, exerciseNames.length - 1);
  const exName = exerciseNames[safeIdx];
  const entry = session.entries[exName];
  const sets = entry?.sets || [];
  const bankData = exerciseBank[exName];
  const unit = sets[0]?.weightUnit || "KG";

  const last = getLastPerformance(exName, sessionKey);
  const priorBest = useMemo(
    () => Math.max(0, ...exerciseHistory(sessions, exName, 0).map((h) => h.e1rm)),
    [sessions, exName]
  );
  const suggestion = suggestNextLoad(bankData, last?.sets, unit);

  const allSets = Object.values(session.entries).flatMap((e) => e.sets || []);
  const totalDone = allSets.filter((s) => s.done).length;
  const totalSets = allSets.length;

  const exerciseRest =
    parseInt(bankData?.restSeconds, 10) || parseInt(settings?.defaultRestSeconds, 10) || 90;

  const workingWeight = parseFloat(
    sets.find((s) => s.weight)?.weight || suggestion?.weight || 0
  );
  const warmups = warmupSets(workingWeight, unit);

  const pattern = bankData?.pattern || guessPattern(exName);
  const patternLabel = PATTERN_LABELS[pattern];
  const libraryEntry = LIBRARY_BY_NAME[exName];
  const cue = libraryEntry?.cues?.[0];

  const draftFor = (setIdx) => {
    const key = `${exName}_${setIdx}`;
    if (draft[key]) return draft[key];
    const s = sets[setIdx] || {};
    // Pre-filled from the plan, or from the overload suggestion if there is one.
    return {
      weight:
        s.weight !== "" && s.weight !== undefined
          ? String(s.weight)
          : suggestion
          ? String(suggestion.weight)
          : "",
      reps:
        s.reps !== "" && s.reps !== undefined && s.reps !== null
          ? String(s.reps)
          : s.targetReps
          ? String(parseInt(s.targetReps, 10) || "")
          : suggestion
          ? String(suggestion.reps)
          : "",
      rpe: s.rpe ? String(s.rpe) : "",
    };
  };

  const setDraftFor = (setIdx, patch) =>
    setDraft((prev) => ({
      ...prev,
      [`${exName}_${setIdx}`]: { ...draftFor(setIdx), ...patch },
    }));

  const goToExercise = (idx) => setExIdx(Math.max(0, Math.min(exerciseNames.length - 1, idx)));

  const confirmSet = (setIdx) => {
    const d = draftFor(setIdx);
    logSet(sessionKey, exName, setIdx, d);
    setRestSeconds(exerciseRest);
    setRestStartedAt(Date.now());

    // Advance to the next exercise once this one is fully logged.
    const remaining = sets.filter((s, i) => i !== setIdx && !s.done).length;
    if (remaining === 0 && safeIdx < exerciseNames.length - 1) {
      setTimeout(() => goToExercise(safeIdx + 1), 400);
    }
  };

  const finishNow = () => {
    finishSession(sessionKey);
    onFinish(sessionKey);
  };

  const nextUnloggedIdx = sets.findIndex((s) => !s.done);
  const timerSeconds = getTimerSeconds(bankData, Math.max(0, nextUnloggedIdx));
  const exerciseDone = nextUnloggedIdx === -1;
  const hasNextExercise = safeIdx < exerciseNames.length - 1;

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-40">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            // Nothing logged yet — leaving now would just abandon a session
            // with no way to clean it up later, so drop it instead of the
            // user's real work.
            if (totalDone === 0) deleteSession(sessionKey);
            onExit();
          }}
          className="text-sm text-ink-muted hover:text-accent font-medium"
        >
          Today
        </button>
        <span className="text-sm font-medium text-accent">
          {totalDone} of {totalSets} sets
        </span>
      </div>
      <div className="h-1.5 bg-surface-wash rounded-full overflow-hidden">
        <div
          className="h-full bg-accent transition-all duration-300"
          style={{ width: `${totalSets ? (totalDone / totalSets) * 100 : 0}%` }}
        />
      </div>
      {wakeSupported && isHeld && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <Smartphone className="w-3 h-3" /> Screen staying awake
        </p>
      )}

      {/* Pager */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToExercise(safeIdx - 1)}
          disabled={safeIdx === 0}
          aria-label="Previous exercise"
          className="w-8 h-8 rounded-full border border-border-control bg-surface text-ink-muted flex items-center justify-center disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {exerciseNames.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === safeIdx ? "bg-accent" : "bg-border-page"}`}
              />
            ))}
          </div>
          <span className="text-xs text-ink-muted">
            Exercise {safeIdx + 1} of {exerciseNames.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => goToExercise(safeIdx + 1)}
          disabled={safeIdx === exerciseNames.length - 1}
          aria-label="Next exercise"
          className="w-8 h-8 rounded-full border border-border-control bg-surface text-ink-mid flex items-center justify-center disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Exercise */}
      <div>
        <h1 className="text-3xl leading-tight">{exName}</h1>

        {cue && <p className="mt-1.5 text-sm text-ink-muted">{cue}</p>}

        {(patternLabel || libraryEntry?.muscleGroups?.length > 0 || exerciseRest) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {libraryEntry?.muscleGroups?.length > 0 && (
              <span className="chip">{libraryEntry.muscleGroups.join(" · ")}</span>
            )}
            {patternLabel && <span className="chip">{patternLabel}</span>}
            <span className="chip">Rest {Math.floor(exerciseRest / 60)}:{String(exerciseRest % 60).padStart(2, "0")}</span>
          </div>
        )}

        {bankData && !bankData.isHidden && (
          <p className="mt-2 text-xs text-ink-muted">
            Plan: {bankData.sets}×{formatReps(bankData.reps, bankData.repsUnit)}{" "}
            {formatWeight(bankData.weight, bankData.weightUnit)}
          </p>
        )}
      </div>

      {/* Last time */}
      {last ? (
        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="stencil">Last time</span>
            <span className="text-xs text-ink-muted">
              {friendlyDate(last.date)}
              {daysAgo(last.date) > 0 ? ` · ${daysAgo(last.date)}d ago` : ""}
            </span>
          </div>
          <div className="mt-2 text-sm text-ink-soft">
            {last.sets
              .map((s) => `${s.weight || "BW"}${s.weight ? s.weightUnit : ""} × ${s.reps}`)
              .join("  ·  ")}
          </div>
          {priorBest > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-border flex justify-between text-xs">
              <span className="text-ink-muted">Estimated 1RM</span>
              <span className="text-accent font-medium">{Math.round(priorBest)} kg · best ever</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-muted italic">
          No history yet — this session becomes your baseline.
        </p>
      )}

      {/* Overload suggestion */}
      {suggestion && (
        <div
          className={`text-sm rounded-card p-3 flex items-start gap-2 ${
            suggestion.action === "increase"
              ? "bg-positive-bg text-positive-ink-strong"
              : "bg-surface-wash text-ink-soft"
          }`}
        >
          <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{suggestion.reason}</span>
        </div>
      )}

      {/* Warm-up ladder */}
      {warmups.length > 0 && (
        <div className="flex items-baseline gap-2 flex-wrap text-sm">
          <span className="stencil flex items-center gap-1">
            <Flame className="w-3.5 h-3.5" /> Warm-up
          </span>
          <span className="text-ink-soft">
            {warmups.map((w) => `${w.weight}`).join(" · ")}
            {unit}
          </span>
          <span className="aside text-ink-faint text-sm">not logged</span>
        </div>
      )}

      {timerSeconds > 0 && (
        <ExerciseTimer totalSeconds={timerSeconds} />
      )}

      {/* Sets */}
      <div className="space-y-2">
        {sets.map((s, setIdx) => {
          const isPr =
            s.done &&
            priorBest > 0 &&
            e1rm(toKg(s.weight, s.weightUnit, 0), Number(s.reps)) > priorBest * 1.001;

          if (s.done) {
            return (
              <div
                key={setIdx}
                className="flex items-center gap-3 bg-positive-bg rounded-card px-4 py-3"
              >
                <span className="w-5 h-5 rounded-full bg-positive-ink-strong flex items-center justify-center flex-shrink-0">
                  <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                    <path d="M1 3L3 5L7 1" stroke="var(--color-positive-bg)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="flex-1 text-positive-ink-strong">Set {setIdx + 1}</span>
                <span className="font-medium text-positive-ink-strong">
                  {s.weight ? `${s.weight}${s.weightUnit}` : "BW"} × {s.reps}
                </span>
                {isPr && <span className="text-xs font-medium text-accent">PR</span>}
                <button
                  type="button"
                  onClick={() => unlogSet(sessionKey, exName, setIdx)}
                  aria-label={`Undo set ${setIdx + 1}`}
                  className="text-positive-ink hover:text-accent"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={setIdx}
              className={`slot-empty flex items-center gap-3 px-4 py-3 ${
                setIdx === nextUnloggedIdx ? "bg-accent/10!" : ""
              }`}
            >
              <span className="w-5 h-5 rounded-full border-[1.5px] border-border-page flex-shrink-0" />
              <span className="flex-1 text-ink-muted">Set {setIdx + 1}</span>
              <span className="text-ink-muted">
                {s.targetReps ? `target ${s.targetReps}` : ""}
              </span>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={() => addSetTo(sessionKey, exName)}
            className="text-sm font-medium text-ink-mid flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add a set
          </button>
          <button type="button" onClick={finishNow} className="text-sm font-medium text-ink-mid">
            Finish session
          </button>
        </div>
      </div>

      {exerciseDone && hasNextExercise && (
        <button
          type="button"
          onClick={() => goToExercise(safeIdx + 1)}
          className="btn-ink w-full py-4"
        >
          Next exercise — {exerciseNames[safeIdx + 1]}
        </button>
      )}

      {totalDone === totalSets && totalSets > 0 && (
        <button type="button" onClick={finishNow} className="btn-ink w-full py-4">
          Finish workout
        </button>
      )}

      {!exerciseDone && (
        <SetEntryPanel
          setIdx={nextUnloggedIdx}
          s={sets[nextUnloggedIdx]}
          d={draftFor(nextUnloggedIdx)}
          est={e1rm(
            toKg(draftFor(nextUnloggedIdx).weight, sets[nextUnloggedIdx].weightUnit, 0),
            Number(draftFor(nextUnloggedIdx).reps)
          )}
          priorBest={priorBest}
          onChange={(patch) => setDraftFor(nextUnloggedIdx, patch)}
          onConfirm={() => confirmSet(nextUnloggedIdx)}
          showRpe={settings.showRpe}
        />
      )}

      {/* Rest timer floats above everything — bumped up over the sheet. */}
      {restStartedAt && (
        <div
          className={`fixed left-4 right-4 z-40 max-w-lg mx-auto ${
            !exerciseDone ? "bottom-[150px]" : "bottom-4"
          }`}
        >
          <RestTimer
            startedAt={restStartedAt}
            seconds={restSeconds}
            soundEnabled={settings.restSound}
            onDismiss={() => setRestStartedAt(null)}
            onAdjust={(delta) => setRestSeconds((prev) => Math.max(15, prev + delta))}
          />
        </div>
      )}
    </div>
  );
}
