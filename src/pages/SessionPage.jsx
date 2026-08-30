import React, { useEffect, useMemo, useRef, useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import { useWakeLock } from "../hooks/useWakeLock";
import ArtLayer from "../components/ArtLayer";
import { Kicker, Rule } from "../components/poster";
import { artSeed } from "../lib/art";
import { containerSteps, formatClock, isContainer, setDataFor } from "../lib/format";
import { suggestNextLoad, warmupSets } from "../lib/training";
import {
  clearActiveSession,
  countSets,
  firstPendingSet,
  orderedMovements,
  prefillFor,
  restRemaining,
  saveActiveSession,
  setOrder,
} from "../lib/session";

/*
 * 8F · Session in progress. Poster, full-bleed, no tab bar.
 *
 * Used one-handed, sweating, between sets. It must never lose data: every set
 * writes through to Firebase AND to the local mirror, and the rest timer is a
 * deadline rather than a countdown so backgrounding costs nothing.
 *
 * The only exit is "Close", and it asks once.
 */

const HERO_HEIGHT = 290;

/** Elapsed session clock, "18:24". */
function useElapsed(startedAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return formatClock(Math.max(0, Math.round((now - startedAt) / 1000)));
}

/** Counts down to a wall-clock deadline. Locking the phone does not pause it. */
function useRestClock(restEndsAt) {
  const [remaining, setRemaining] = useState(() => restRemaining(restEndsAt));
  const buzzedRef = useRef(false);

  useEffect(() => {
    buzzedRef.current = false;
    if (!restEndsAt) {
      setRemaining(0);
      return undefined;
    }
    const tick = () => {
      const left = restRemaining(restEndsAt);
      setRemaining(left);
      if (left === 0 && !buzzedRef.current) {
        buzzedRef.current = true;
        // One short haptic. No sound, no notification (§10.8).
        if (navigator.vibrate) navigator.vibrate(120);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [restEndsAt]);

  return remaining;
}

/** −/+ tile, 34px visually inside a 48px row so the touch target clears 44px. */
function Tile({ children, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press"
      style={{
        width: 34,
        height: 34,
        flex: "none",
        borderRadius: 8,
        border: "1px solid #33363d",
        color: "var(--color-text)",
        fontSize: 17,
        lineHeight: 1,
        fontFamily: "var(--font-display)",
      }}
    >
      {children}
    </button>
  );
}

function DoneDot({ n }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        flex: "none",
        borderRadius: 999,
        background: "var(--color-teal)",
        color: "#0e0f12",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {n}
    </span>
  );
}

function PendingDot({ n }) {
  return (
    <span
      style={{
        width: 22,
        height: 22,
        flex: "none",
        borderRadius: 999,
        border: "1px solid #33363d",
        color: "var(--color-dim)",
        fontSize: 11,
        fontWeight: 700,
        fontFamily: "var(--font-display)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {n}
    </span>
  );
}

export default function SessionPage({ sessionKey, onExit, onFinish, onOpenMovement }) {
  const {
    sessions,
    settings,
    logSet,
    updateSessionSet,
    completeSession,
    deleteSession,
    getLastPerformance,
    getDetail,
    getRoutine,
    addSetTo,
    updateSessionNote,
    exerciseBank,
  } = useWorkout();

  const session = sessions[sessionKey];
  const [confirmClose, setConfirmClose] = useState(false);
  const [restEndsAt, setRestEndsAt] = useState(null);
  const [restTotal, setRestTotal] = useState(Number(settings.defaultRestSeconds) || 90);
  const [noteOpen, setNoteOpen] = useState(false);

  // Hold the screen awake for the whole session; released on unmount.
  useWakeLock(!!session && settings.keepScreenAwake !== false);

  const entries = session?.entries || {};
  // The routine is the tie-breaker for sessions written before entries
  // carried their own order.
  const routine = getRoutine(session?.routineId);
  const order = useMemo(() => setOrder(entries, routine), [entries, routine]);
  const active = useMemo(() => firstPendingSet(entries, routine), [entries, routine]);
  const elapsed = useElapsed(session?.startedAt || Date.now());
  const restLeft = useRestClock(restEndsAt);
  const { done, total } = countSets(entries);

  // The whole in-flight session, mirrored locally on every change. This is
  // what brings the user back to the same set after a crash or a reload.
  useEffect(() => {
    if (!session) return;
    saveActiveSession({
      id: sessionKey,
      startedAt: session.startedAt,
      restEndsAt,
      label: session.label,
      entries: session.entries,
    });
  }, [sessionKey, session, restEndsAt]);

  if (!session) return null;

  const movementNames = orderedMovements(entries, routine).map(([name]) => name);
  const activeName = active?.name || movementNames[movementNames.length - 1];
  const activeEntry = entries[activeName];
  const activeSets = activeEntry?.sets || [];
  const activeSetIdx = active?.setIndex ?? activeSets.length - 1;
  const movementIndex = movementNames.indexOf(activeName);
  const isLastSet = !active;

  const currentSet = activeSets[activeSetIdx] || {};
  const prefill = prefillFor(activeSets, activeSetIdx, {
    weight: currentSet.weight,
    reps: currentSet.targetReps,
  });
  const weight = currentSet.weight !== "" && currentSet.weight != null ? currentSet.weight : prefill.weight;
  const reps = currentSet.reps !== "" && currentSet.reps != null ? currentSet.reps : prefill.reps;

  // A container ("Core Workout") holds sub-movements, not a load. It still
  // has sets — you work the list once per set — but showing it a weight
  // stepper and a "last time 40 kg" line is nonsense.
  const activeDetail = getDetail(activeName);
  const activeIsContainer = isContainer(activeDetail);
  const activeSteps = containerSteps(activeDetail);

  /*
   * Not every movement is a barbell. A set carries its own units:
   *   weightUnit "Body Wt."  — no load to enter, the body is the load
   *   repsUnit "Secs"/"Mins" — a hold, measured in time, not reps
   * Forcing "kg × reps" onto a 1-minute bodyweight plank asks for a number
   * that does not exist, and logs a zero where a minute happened.
   */
  const weightUnit = currentSet.weightUnit || "KG";
  const repsUnit = currentSet.repsUnit || "Reps";
  const isBodyweight = weightUnit === "Body Wt.";
  const isTimed = repsUnit === "Secs" || repsUnit === "Mins";

  const bankData = exerciseBank?.[activeName];

  /*
   * Two hints, both derived from history rather than typed by anyone: the
   * warm-up ramp to today's working weight, and what to do with the load
   * next. Neither is a rule and neither blocks anything — the app suggests,
   * the user decides.
   */
  const workingKg = parseFloat(weight) || 0;
  const warmups = activeSetIdx === 0 && !activeIsContainer ? warmupSets(workingKg) : [];

  const last = getLastPerformance(activeName, sessionKey);
  const lastTop = last?.sets?.reduce(
    (best, s) => Math.max(best, parseFloat(s.weight) || 0),
    0
  );

  const suggestion = last?.sets ? suggestNextLoad(bankData, last.sets) : null;

  const nextUp = (() => {
    const idx = order.findIndex(
      (o) => o.name === activeName && o.setIndex === activeSetIdx
    );
    const rest = order.slice(idx + 1).find((o) => o.name !== activeName);
    if (!rest) return null;
    const count = entries[rest.name]?.sets?.length || 0;
    // A container has no rep target — say how many rounds of the list.
    if (isContainer(getDetail(rest.name))) {
      return `${rest.name} · ${count} set${count === 1 ? "" : "s"}`;
    }
    const target = entries[rest.name]?.sets?.[0]?.targetReps;
    return `${rest.name} · ${count} × ${target || "?"}`;
  })();

  const bump = (field, delta) => {
    const step = field === "weight" ? (settings.plateIncrementKg || 2.5) : 1;
    const base = parseFloat(field === "weight" ? weight : reps) || 0;
    const next = Math.max(0, Math.round((base + delta * step) * 100) / 100);
    updateSessionSet(sessionKey, activeName, activeSetIdx, { [field]: String(next) });
  };

  const logCurrent = () => {
    logSet(sessionKey, activeName, activeSetIdx, { weight, reps, rpe: currentSet.rpe });
    const seconds = Number(bankData?.restSeconds) || Number(settings.defaultRestSeconds) || 90;
    setRestTotal(seconds);
    setRestEndsAt(Date.now() + seconds * 1000);
  };

  /** ±30s on the rest already running, floored at the current moment. */
  const adjustRest = (delta) => {
    setRestEndsAt((prev) => (prev ? Math.max(Date.now(), prev + delta * 1000) : prev));
    setRestTotal((prev) => Math.max(15, prev + delta));
  };

  const finish = () => {
    clearActiveSession();
    // completeSession computes tonnage and new bests, writes them onto the
    // record and advances the cursor — and hands back which finish screen
    // this session earned, so nothing has to ask the cursor twice.
    const outcome = completeSession(sessionKey);
    onFinish(sessionKey, outcome);
  };

  const discard = () => {
    clearActiveSession();
    deleteSession(sessionKey);
    onExit();
  };

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto" }}
    >
      {/* ---- poster hero, held for the whole session ---- */}
      <div
        className="relative flex-none flex flex-col justify-between"
        style={{ height: HERO_HEIGHT, padding: "14px 24px 20px" }}
      >
        <ArtLayer mood="charge" seedKey={artSeed.session(sessionKey)} scrim="poster" />

        <div className="relative flex items-center justify-between">
          <span style={{ fontSize: 12, color: "var(--color-muted-poster)" }}>
            {(session.label || "Session").toUpperCase()} · {elapsed}
          </span>
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            style={{ fontSize: 13, color: "var(--color-text)" }}
          >
            Close
          </button>
        </div>

        <div className="relative flex flex-col gap-[6px]">
          <Kicker>
            {/* A movement inside a nested routine says so — you are part-way
                through a workout inside the workout. */}
            {activeEntry?.via ? `${activeEntry.via} · ` : ""}
            Movement {movementIndex + 1} of {movementNames.length} · Set{" "}
            {activeSetIdx + 1} of {activeSets.length}
          </Kicker>
          {/* The title is the way into this movement's notes and cues — the
              one place you actually want them is mid-session. */}
          <button
            type="button"
            className="text-left"
            onClick={() => onOpenMovement?.(activeName)}
          >
            <span className="poster-title" data-lines={activeName.length > 14 ? "2" : "1"}>
              {activeName}
            </span>
          </button>
          <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>
            {activeIsContainer
              ? `${activeSteps.length} movements · set ${activeSetIdx + 1} of ${activeSets.length}`
              : `target ${activeSets.length} × ${currentSet.targetReps || "?"}${
                  isTimed ? ` ${repsUnit.toLowerCase()}` : ""
                }${!isBodyweight && lastTop ? ` · last time ${lastTop} kg` : ""}${
                  isBodyweight ? " · bodyweight" : ""
                }`}
          </span>
        </div>
      </div>

      {/* ---- hints, both optional and both ignorable ---- */}
      {(warmups.length > 0 || suggestion) && (
        <div className="flex flex-col gap-[6px]" style={{ padding: "0 24px 12px" }}>
          {warmups.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="label" style={{ flex: "none" }}>
                Warm-up
              </span>
              {warmups.map((w, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 12,
                    color: "var(--color-muted-poster)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {w.weight} × {w.reps}
                </span>
              ))}
            </div>
          )}
          {suggestion && (
            <span style={{ fontSize: 12, color: "var(--color-dim)" }}>{suggestion.reason}</span>
          )}
        </div>
      )}

      {/* ---- the set list ---- */}
      <div className="flex flex-col gap-[8px]" style={{ padding: "0 24px" }}>
        {activeSets.map((set, index) => {
          const isActive = index === activeSetIdx && !isLastSet;
          if (set.done && !isActive) {
            return (
              <button
                key={index}
                type="button"
                // Tapping a logged set reopens it; the rest timer is untouched.
                onClick={() => updateSessionSet(sessionKey, activeName, index, { done: false })}
                className="flex items-center gap-3 w-full text-left"
                style={{ minHeight: 48 }}
              >
                <DoneDot n={index + 1} />
                <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: 16 }}>
                  {activeIsContainer
                    ? `Set ${index + 1}`
                    : set.weightUnit === "Body Wt."
                    ? `${set.reps} ${(set.repsUnit || "reps").toLowerCase()}`
                    : `${set.weight} kg × ${set.reps}`}
                </span>
                <span style={{ fontSize: 12, color: "var(--color-teal)" }}>logged</span>
              </button>
            );
          }

          if (!isActive) {
            return (
              <div key={index} className="flex items-center gap-3" style={{ minHeight: 48 }}>
                <PendingDot n={index + 1} />
                <span style={{ flex: 1, fontSize: 15, color: "var(--color-dim)" }}>
                  {activeIsContainer
                    ? `Set ${index + 1}`
                    : set.weightUnit === "Body Wt."
                    ? `${set.targetReps || "—"} ${(set.repsUnit || "reps").toLowerCase()}`
                    : `${set.weight || "—"} kg × ${set.targetReps || "—"}`}
                </span>
              </div>
            );
          }

          return (
            <div
              key={index}
              aria-current="step"
              className="flex items-center gap-3"
              style={{
                borderRadius: 10,
                background: "#17181d",
                border: "1px solid var(--color-brass)",
                padding: "10px 12px",
                minHeight: 48,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  flex: "none",
                  borderRadius: 999,
                  background: "var(--color-brass)",
                  color: "var(--color-on-brass)",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "var(--font-display)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {index + 1}
              </span>

              {activeIsContainer ? (
                <div className="flex-1 flex flex-col gap-[6px] min-w-0">
                  {activeSteps.map((step, i) => (
                    <span key={i} style={{ fontSize: 14, color: "var(--color-text)" }}>
                      {step}
                    </span>
                  ))}
                </div>
              ) : isBodyweight ? (
                <span style={{ flex: 1, fontSize: 13, color: "var(--color-muted-poster)" }}>
                  Bodyweight
                </span>
              ) : (
                <div className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) =>
                    updateSessionSet(sessionKey, activeName, index, { weight: e.target.value })
                  }
                  aria-label={`Weight in ${weightUnit === "LBS" ? "pounds" : "kilograms"}`}
                  style={{
                    width: 62,
                    background: "transparent",
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--color-text-strong)",
                    outline: "none",
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
                  {weightUnit === "LBS" ? "lb" : "kg"}
                </span>
                <Tile onClick={() => bump("weight", -1)} label="Less weight">
                  −
                </Tile>
                <Tile onClick={() => bump("weight", 1)} label="More weight">
                  +
                </Tile>
                </div>
              )}

              {!activeIsContainer && (
              <div className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  value={reps}
                  onChange={(e) =>
                    updateSessionSet(sessionKey, activeName, index, { reps: e.target.value })
                  }
                  aria-label={repsUnit}
                  style={{
                    width: 34,
                    background: "transparent",
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "var(--color-text-strong)",
                    outline: "none",
                    textAlign: "right",
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
                  {repsUnit.toLowerCase()}
                </span>
              </div>
              )}
            </div>
          );
        })}
      </div>

      {/* RPE is optional and off by default in Settings. When it is on it is
          a tap, never a keyboard — nobody types a decimal between sets. */}
      {settings.showRpe && !activeIsContainer && !isLastSet && (
        <div className="flex items-center gap-2 flex-wrap" style={{ padding: "12px 24px 0" }}>
          <span className="label" style={{ flex: "none" }}>
            RPE
          </span>
          {[6, 7, 8, 9, 10].map((value) => (
            <button
              key={value}
              type="button"
              className="mode-chip"
              data-active={String(currentSet.rpe) === String(value)}
              onClick={() =>
                updateSessionSet(sessionKey, activeName, activeSetIdx, {
                  rpe: String(currentSet.rpe) === String(value) ? "" : String(value),
                })
              }
            >
              {value}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "12px 24px 0" }}>
        <button
          type="button"
          className="link-teal"
          onClick={() => addSetTo(sessionKey, activeName)}
        >
          Add a set to {activeName}
        </button>
      </div>

      {/* ---- primary action ---- */}
      <div style={{ padding: "16px 24px 0" }}>
        {isLastSet ? (
          <button type="button" onClick={finish} className="btn-primary btn-poster w-full">
            Finish session
          </button>
        ) : (
          <button type="button" onClick={logCurrent} className="btn-primary btn-poster w-full">
            Log set {activeSetIdx + 1}
          </button>
        )}
      </div>

      {/* ---- rest ---- */}
      {restEndsAt && restLeft > 0 && (
        <div style={{ padding: "16px 24px 0" }}>
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: 8 }}>
            <span className="label">Rest</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="mode-chip"
                onClick={() => adjustRest(-30)}
                aria-label="30 seconds less rest"
              >
                −30s
              </button>
              <button
                type="button"
                className="mode-chip"
                onClick={() => adjustRest(30)}
                aria-label="30 seconds more rest"
              >
                +30s
              </button>
              <button
                type="button"
                className="mode-chip"
                onClick={() => setRestEndsAt(null)}
                aria-label="Skip rest"
              >
                Skip
              </button>
              <span
                className="tabular"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 15,
                  color: "var(--color-teal)",
                  flex: "none",
                }}
              >
                {formatClock(restLeft)}
              </span>
            </div>
          </div>
          <div style={{ height: 4, background: "var(--color-track)", borderRadius: 2 }}>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: "var(--color-teal)",
                width: `${100 - (restLeft / restTotal) * 100}%`,
                transition: "width 250ms linear",
              }}
            />
          </div>
        </div>
      )}

      {/* ---- what's after this ---- */}
      <div style={{ marginTop: "auto", padding: "24px 24px 16px" }}>
        <Rule />
        <div className="flex items-baseline justify-between gap-3" style={{ paddingTop: 12 }}>
          <span style={{ fontSize: 12, color: "var(--color-dim)" }}>
            {nextUp ? `NEXT · ${nextUp}` : `${done} of ${total} sets logged`}
          </span>
          <button
            type="button"
            className="link-teal"
            style={{ fontSize: 12, flex: "none" }}
            onClick={() => setNoteOpen((v) => !v)}
          >
            {session.note ? "Edit note" : "Add a note"}
          </button>
        </div>

        {noteOpen && (
          <textarea
            autoFocus
            value={session.note || ""}
            onChange={(e) => updateSessionNote(sessionKey, e.target.value)}
            placeholder="How it felt, what to change next time…"
            rows={3}
            style={{
              marginTop: 10,
              width: "100%",
              borderRadius: "var(--radius-control)",
              background: "var(--color-poster-card)",
              border: "1px solid var(--color-rule)",
              padding: 12,
              color: "var(--color-text)",
              outline: "none",
              resize: "none",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          />
        )}
      </div>

      {confirmClose && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="w-full max-w-lg mx-auto flex flex-col gap-3"
            style={{
              background: "var(--color-card)",
              borderTop: "1px solid var(--color-border)",
              padding: 22,
            }}
          >
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600 }}>
              Leave this session?
            </span>
            <span style={{ fontSize: 13, color: "var(--color-muted)" }}>
              It stays unfinished and nothing is logged.
            </span>
            <button type="button" className="btn-secondary" onClick={discard}>
              Discard
            </button>
            <button type="button" className="btn-primary" onClick={() => setConfirmClose(false)}>
              Keep going
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
