import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Flame,
  Lightbulb,
  Plus,
  Smartphone,
  X,
} from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import { useWakeLock } from "../hooks/useWakeLock";
import RestTimer from "../components/RestTimer";
import Stepper from "../components/Stepper";
import ExerciseTimer from "../components/ExerciseTimer";
import { getTimerSeconds, formatReps, formatWeight } from "../lib/format";
import {
  friendlyDate,
  daysAgo,
  loadIncrement,
  suggestNextLoad,
  warmupSets,
  e1rm,
  toKg,
  exerciseHistory,
} from "../lib/training";

export default function SessionPage({ sessionKey, onExit }) {
  const {
    sessions,
    exerciseBank,
    settings,
    getLastPerformance,
    logSet,
    unlogSet,
    addSetTo,
    finishSession,
  } = useWorkout();

  const session = sessions[sessionKey];
  const [exIdx, setExIdx] = useState(0);
  const [restStartedAt, setRestStartedAt] = useState(null);
  const [restSeconds, setRestSeconds] = useState(90);
  const [showWarmup, setShowWarmup] = useState(false);
  const [draft, setDraft] = useState({});

  const { supported: wakeSupported, isHeld } = useWakeLock(!!session && !session.finishedAt);

  const exerciseNames = useMemo(
    () => Object.keys(session?.entries || {}),
    [session]
  );

  if (!session) {
    return (
      <div className="max-w-lg mx-auto bg-iron-850 rounded-sm border border-iron-700 p-8 text-center">
        <p className="text-chalk-300 mb-4">That session no longer exists.</p>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 bg-plate-yellow text-iron-950 rounded-sm font-medium"
        >
          Back to planner
        </button>
      </div>
    );
  }

  if (exerciseNames.length === 0) {
    return (
      <div className="max-w-lg mx-auto bg-iron-850 rounded-sm border border-iron-700 p-8 text-center space-y-4">
        <p className="text-chalk-300">
          This day has no exercises — it's a rest day.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-4 py-2 bg-plate-yellow text-iron-950 rounded-sm font-medium"
        >
          Back to planner
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
    () =>
      Math.max(
        0,
        ...exerciseHistory(sessions, exName, 0).map((h) => h.e1rm)
      ),
    [sessions, exName]
  );
  const suggestion = suggestNextLoad(bankData, last?.sets, unit);

  const allSets = Object.values(session.entries).flatMap((e) => e.sets || []);
  const totalDone = allSets.filter((s) => s.done).length;
  const totalSets = allSets.length;

  const exerciseRest = parseInt(bankData?.restSeconds, 10) ||
    parseInt(settings?.defaultRestSeconds, 10) ||
    90;

  const workingWeight = parseFloat(
    sets.find((s) => s.weight)?.weight || suggestion?.weight || 0
  );
  const warmups = warmupSets(workingWeight, unit);

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

  const confirmSet = (setIdx) => {
    const d = draftFor(setIdx);
    logSet(sessionKey, exName, setIdx, d);
    setRestSeconds(exerciseRest);
    setRestStartedAt(Date.now());

    // Advance to the next exercise once this one is fully logged.
    const remaining = sets.filter((s, i) => i !== setIdx && !s.done).length;
    if (remaining === 0 && safeIdx < exerciseNames.length - 1) {
      setTimeout(() => setExIdx(safeIdx + 1), 400);
    }
  };

  const nextUnloggedIdx = sets.findIndex((s) => !s.done);
  const timerSeconds = getTimerSeconds(bankData, Math.max(0, nextUnloggedIdx));

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-40">
      {/* Header */}
      <div className="bg-iron-850 rounded-sm border border-iron-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 text-sm text-chalk-500 hover:text-plate-yellow font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Planner
          </button>
          <div className="stencil text-chalk-300">
            {totalDone}/{totalSets} sets
          </div>
        </div>
        <div className="h-1.5 bg-iron-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-plate-yellow transition-all duration-300"
            style={{ width: `${totalSets ? (totalDone / totalSets) * 100 : 0}%` }}
          />
        </div>
        {wakeSupported ? (
          isHeld && (
            <p className="text-xs text-chalk-500 mt-2 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Screen staying awake
            </p>
          )
        ) : (
          <p className="text-xs text-chalk-500 mt-2">
            This browser can't keep the screen awake — check your auto-lock setting.
          </p>
        )}
      </div>

      {/* Exercise */}
      <div className="bg-iron-850 rounded-sm border border-iron-700 p-5">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-3xl font-display font-extrabold text-chalk-50 leading-none">
            {exName}
          </h1>
          <span className="stencil whitespace-nowrap mt-1.5">
            {String(safeIdx + 1).padStart(2, "0")} / {String(exerciseNames.length).padStart(2, "0")}
          </span>
        </div>

        <div className="knurl my-3" aria-hidden="true" />

        {bankData && !bankData.isHidden && (
          <p className="text-sm text-chalk-500 font-data">
            Plan: {bankData.sets}×{formatReps(bankData.reps, bankData.repsUnit)}{" "}
            {formatWeight(bankData.weight, bankData.weightUnit)}
          </p>
        )}

        {/* Last time */}
        {last ? (
          <div className="mt-3 text-sm bg-iron-900 border border-iron-700 rounded p-3">
            <div className="stencil mb-1.5">
              Last time · {friendlyDate(last.date)}
              {daysAgo(last.date) > 0 && (
                <span className="font-normal text-chalk-500">
                  {" "}
                  ({daysAgo(last.date)}d ago)
                </span>
              )}
            </div>
            <div className="text-chalk-200 font-data text-[13px]">
              {last.sets
                .map((s) => `${s.weight || "BW"}${s.weight ? s.weightUnit : ""}×${s.reps}`)
                .join("  · ")}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-chalk-500 italic">
            No history yet — this session becomes your baseline.
          </p>
        )}

        {/* Overload suggestion */}
        {suggestion && (
          <div
            className={`mt-3 text-sm rounded p-3 border flex items-start gap-2 ${
              suggestion.action === "increase"
                ? "bg-plate-green/10 border-plate-green/40 text-plate-green"
                : "bg-plate-yellow/10 border-plate-yellow/40 text-plate-yellow"
            }`}
          >
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{suggestion.reason}</span>
          </div>
        )}

        {/* Warm-up ladder */}
        {warmups.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowWarmup((v) => !v)}
              className="text-sm font-medium text-flag-orange hover:text-flag-orange flex items-center gap-1.5"
            >
              <Flame className="w-4 h-4" />
              {showWarmup ? "Hide" : "Show"} warm-up ladder
            </button>
            {showWarmup && (
              <div className="mt-2 flex flex-wrap gap-2">
                {warmups.map((w, i) => (
                  <span
                    key={i}
                    className="text-sm bg-flag-orange/10 border border-flag-orange/40 text-flag-orange rounded-sm px-3 py-1.5 font-medium"
                  >
                    {w.weight}
                    {unit} × {w.reps}
                  </span>
                ))}
                <span className="text-xs text-flag-orange self-center">
                  not logged
                </span>
              </div>
            )}
          </div>
        )}

        {timerSeconds > 0 && (
          <div className="mt-3">
            <ExerciseTimer totalSeconds={timerSeconds} />
          </div>
        )}
      </div>

      {/* Sets */}
      <div className="space-y-3">
        {sets.map((s, setIdx) => {
          const d = draftFor(setIdx);
          const isNext = setIdx === nextUnloggedIdx;
          const est = e1rm(toKg(d.weight, s.weightUnit, 0), Number(d.reps));

          if (s.done) {
            // Three whites is a good lift; red flashes mean it beat your best.
            const isPr =
              priorBest > 0 &&
              e1rm(toKg(s.weight, s.weightUnit, 0), Number(s.reps)) > priorBest * 1.001;
            return (
              <div
                key={setIdx}
                className="bg-iron-850 border-l-2 border-plate-green border-y border-r border-y-iron-800 border-r-iron-800 rounded-sm p-3 flex items-center gap-3"
              >
                <div className="lights flex-shrink-0" aria-hidden="true">
                  <span className={`light ${isPr ? "light-pr" : "light-on"}`} />
                  <span className={`light ${isPr ? "light-pr" : "light-on"}`} />
                  <span className={`light ${isPr ? "light-pr" : "light-on"}`} />
                </div>
                <div className="flex-1 flex items-baseline gap-2">
                  <span className="readout text-2xl">
                    {s.weight ? s.weight : "BW"}
                    {s.weight && (
                      <span className="text-sm text-chalk-500 font-body font-medium ml-0.5">
                        {s.weightUnit}
                      </span>
                    )}
                  </span>
                  <span className="text-chalk-600">×</span>
                  <span className="readout text-2xl">{s.reps}</span>
                  {s.rpe && (
                    <span className="stencil ml-1">RPE {s.rpe}</span>
                  )}
                  {isPr && (
                    <span className="stencil text-plate-red ml-auto mr-1">
                      Record
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => unlogSet(sessionKey, exName, setIdx)}
                  aria-label={`Undo set ${setIdx + 1}`}
                  className="p-2 text-chalk-500 hover:text-plate-red"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          }

          if (!isNext) {
            return (
              <div
                key={setIdx}
                className="bg-iron-900/60 border border-iron-800 rounded-sm p-3 flex items-center gap-3"
              >
                <div className="lights flex-shrink-0" aria-hidden="true">
                  <span className="light" />
                  <span className="light" />
                  <span className="light" />
                </div>
                <span className="stencil">
                  Set {String(setIdx + 1).padStart(2, "0")}
                  {s.targetReps ? ` · target ${s.targetReps}` : ""}
                </span>
              </div>
            );
          }

          // The active set gets the full logging controls.
          return (
            <div
              key={setIdx}
              className="bg-iron-850 border-2 border-plate-yellow rounded p-4"
            >
              <div className="flex items-baseline justify-between mb-3">
                <span className="font-bold text-chalk-50">Set {setIdx + 1}</span>
                {s.targetReps && (
                  <span className="text-sm text-chalk-500">
                    target {s.targetReps} reps
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Stepper
                  label="Weight"
                  value={d.weight}
                  step={loadIncrement(s.weightUnit)}
                  suffix={s.weightUnit}
                  onChange={(v) => setDraftFor(setIdx, { weight: v })}
                />
                <Stepper
                  label="Reps"
                  value={d.reps}
                  step={1}
                  onChange={(v) => setDraftFor(setIdx, { reps: v })}
                />
                <Stepper
                  label="RPE"
                  value={d.rpe}
                  step={0.5}
                  min={0}
                  onChange={(v) => setDraftFor(setIdx, { rpe: v })}
                />
              </div>

              {est > 0 && (
                <p className="stencil mt-3 text-center">
                  ≈ {Math.round(est)}kg est. 1RM
                  {priorBest > 0 && est > priorBest * 1.001 && (
                    <span className="text-plate-red ml-1.5">· beats your best</span>
                  )}
                </p>
              )}

              <button
                type="button"
                onClick={() => confirmSet(setIdx)}
                disabled={!d.reps || Number(d.reps) <= 0}
                className="mt-3 w-full py-4 bg-plate-yellow text-iron-950 rounded-sm font-display font-extrabold text-xl uppercase tracking-wide hover:bg-plate-yellow-hot active:translate-y-px transition-all disabled:opacity-30 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" /> Log set
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => addSetTo(sessionKey, exName)}
          className="w-full py-3 border border-dashed border-iron-600 rounded text-chalk-500 hover:text-plate-yellow hover:border-plate-yellow/60 font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add another set
        </button>
      </div>

      {/* Exercise nav */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setExIdx(Math.max(0, safeIdx - 1))}
          disabled={safeIdx === 0}
          className="flex-1 py-3 bg-iron-850 border border-iron-600 rounded font-medium text-chalk-200 hover:bg-iron-800 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Previous
        </button>
        <button
          type="button"
          onClick={() =>
            setExIdx(Math.min(exerciseNames.length - 1, safeIdx + 1))
          }
          disabled={safeIdx === exerciseNames.length - 1}
          className="flex-1 py-3 bg-iron-850 border border-iron-600 rounded font-medium text-chalk-200 hover:bg-iron-800 disabled:opacity-40 flex items-center justify-center gap-2"
        >
          Next <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {totalDone === totalSets && totalSets > 0 && (
        <button
          type="button"
          onClick={() => {
            finishSession(sessionKey);
            onExit();
          }}
          className="w-full py-4 bg-plate-green text-white rounded-sm font-display font-extrabold text-xl uppercase tracking-wide hover:bg-plate-green/85 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" /> Finish workout
        </button>
      )}

      {/* Rest timer floats above everything */}
      {restStartedAt && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <RestTimer
            startedAt={restStartedAt}
            seconds={restSeconds}
            onDismiss={() => setRestStartedAt(null)}
            onAdjust={(delta) =>
              setRestSeconds((prev) => Math.max(15, prev + delta))
            }
          />
        </div>
      )}
    </div>
  );
}
