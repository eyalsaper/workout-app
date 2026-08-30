import React, { useState } from "react";
import { Settings } from "lucide-react";
import { useWorkout } from "../state/WorkoutContext";
import ArtLayer from "../components/ArtLayer";
import DayStrip from "../components/DayStrip";
import Ring from "../components/Ring";
import { artSeed } from "../lib/art";
import { waitingLabel } from "../lib/plan";
import { dateKey, routineSummary, toKg } from "../lib/training";

/*
 * 8A · Today, a training day, and 8B · Today, rest with the plan held.
 *
 * The most important screen in the app. It answers "what am I lifting today"
 * and gets the user to "Begin session" without a scroll.
 *
 * There is no scheduled rest day here. 8B is a consequence of the user's own
 * actions — today's session is already logged, or they asked for rest — never
 * of the calendar. In plan mode Today always offers days[cursor.dayIndex], for
 * as long as it takes.
 */

/**
 * "MONDAY 24 AUGUST" — today's date, which is a fact and not a promise.
 *
 * Assembled from parts rather than one toLocaleDateString call, because the
 * locale decides the order and the punctuation and the design does not want
 * either ("THURSDAY, AUGUST 27" in en-US).
 */
function todayKicker(date = new Date()) {
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const month = date.toLocaleDateString(undefined, { month: "long" });
  return `${weekday} ${date.getDate()} ${month}`.toUpperCase();
}

function Header({ onOpenSettings }) {
  return (
    <div className="flex items-center justify-between flex-none">
      <span
        className="text-[11px] font-bold uppercase"
        style={{ letterSpacing: "0.16em", color: "var(--color-brass)" }}
      >
        {todayKicker()}
      </span>
      <button
        type="button"
        onClick={onOpenSettings}
        aria-label="Settings"
        className="press flex items-center justify-center"
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: "#1d2026",
          border: "1px solid #2a2e35",
          color: "var(--color-muted)",
          // The circle reads as an avatar until something is in it. A cog is
          // the one icon in the app, and it is here because this is the only
          // control on Today that does not say what it does in words.
          flex: "none",
        }}
      >
        <Settings size={15} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * The round card — ring, caption, pills and day names, all from one
 * `roundInfo`. The arc equals the number printed beside it because neither
 * of them did their own arithmetic.
 */
function RoundCard({ roundInfo, kicker }) {
  if (!roundInfo.total) return null;

  // 8B leads with a kicker instead of the ring: nothing is being asked, so the
  // card states where the plan stands rather than measuring progress into it.
  if (kicker) {
    return (
      <div className="card flex-none flex flex-col gap-[10px]" style={{ padding: 18 }}>
        <span className="label" style={{ paddingLeft: 2 }}>
          {kicker}
        </span>
        <DayStrip roundInfo={roundInfo} />
      </div>
    );
  }

  return (
    <div className="card flex-none flex items-center gap-[18px]" style={{ padding: 18 }}>
      <Ring progress={roundInfo.progress} size={62} label={roundInfo.a11y} />
      <div className="flex-1 flex flex-col gap-[9px] min-w-0">
        <div className="flex items-baseline justify-between">
          <span
            className="text-[17px] font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {roundInfo.dayLabel}
          </span>
          <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
            {roundInfo.roundLabel}
          </span>
        </div>
        <DayStrip roundInfo={roundInfo} />
      </div>
    </div>
  );
}

/**
 * One "ON THE BAR" row: movement, its prescription, and the target load.
 *
 * Tappable, straight to the movement's own page. The design file has these
 * inert, but that left the notes and cues reachable only from Settings, which
 * is the wrong end of the app when you are standing at the rack.
 */
function MovementRow({ name, movement, lastLoad, onOpen }) {
  const reps = movement.reps ? `${movement.sets} × ${movement.reps}` : `${movement.sets} sets`;
  const last = lastLoad ? ` · last ${lastLoad}` : "";
  return (
    <button
      type="button"
      onClick={() => onOpen?.(name)}
      className="row-card flex justify-between items-center w-full text-left press"
    >
      <div className="flex flex-col gap-[3px] min-w-0">
        <span className="row-title truncate">{name}</span>
        <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
          {reps}
          {last}
        </span>
      </div>
      <span className="row-value tabular" style={{ flex: "none", paddingLeft: 12 }}>
        {movement.targetLoadKg ? movement.targetLoadKg : "—"}
      </span>
    </button>
  );
}

export default function TodayPage({
  segmentControl,
  onBeginSession,
  onOpenSettings,
  onAddMeasurement,
  onBuildRoutine,
  onOpenMovement,
  onRunRoutine,
}) {
  const [swapping, setSwapping] = useState(false);

  const {
    program,
    planDays,
    routines,
    upNext,
    roundInfo,
    nextRoutine,
    settings,
    sessions,
    bodyweightKg,
    loggedToday,
    skipCurrentDay,
    getLastPerformance,
  } = useWorkout();

  /**
   * The last weight logged for a movement, for the "last 107.5" on each row.
   * Read from history rather than stored on the routine — the log is the
   * product, and the routine's target is an intention, not a record.
   */
  const lastLoadFor = (movementId) => {
    const performance = getLastPerformance(movementId);
    if (!performance?.sets?.length) return null;
    const heaviest = performance.sets.reduce(
      (best, set) => Math.max(best, toKg(set.weight, set.weightUnit, bodyweightKg)),
      0
    );
    return heaviest ? Math.round(heaviest * 10) / 10 : null;
  };

  // ---- 8B · rest, plan held -------------------------------------------
  //
  // Only ever reached because today's session is already logged. The cursor
  // has not moved on its own and nothing is marked missed.
  if (loggedToday && upNext) {
    const restName = upNext.day.name;
    return (
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
        <Header onOpenSettings={onOpenSettings} />
        {segmentControl}

        <div
          className="relative overflow-hidden flex-none"
          style={{
            height: 300,
            borderRadius: "var(--radius-hero)",
            border: "1px solid var(--color-border-hi)",
            background: "var(--color-hero-a)",
          }}
        >
          <ArtLayer mood="calm" seedKey={artSeed.rest(dateKey())} scrim="rest" />
          <div
            className="absolute flex flex-col gap-[6px]"
            style={{ left: 20, right: 20, bottom: 18 }}
          >
            <span
              className="text-[11px] font-bold uppercase"
              style={{ letterSpacing: "0.2em", color: "var(--color-brass)" }}
            >
              Rest day
            </span>
            <span className="poster-title" data-lines="2">
              Nothing
              <br />
              today
            </span>
            <span className="text-[13px]" style={{ color: "#b9b6b0" }}>
              Day {upNext.position} keeps its place. {restName} is there when you are.
            </span>
          </div>
        </div>

        <RoundCard
          roundInfo={roundInfo}
          kicker={`ROUND ${roundInfo.round} · DAY ${roundInfo.position} NEXT`}
        />

        {/* No primary brass button on this screen. Nothing is being asked of
            the user, and that absence is the design. */}
        <button type="button" className="btn-secondary" onClick={onBeginSession}>
          Log something anyway
        </button>
        <button type="button" className="link-teal text-left" onClick={onAddMeasurement}>
          Add a body measurement
        </button>

      </div>
    );
  }

  // ---- No days in the plan --------------------------------------------
  if (!upNext) {
    return (
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
        <Header onOpenSettings={onOpenSettings} />
        {segmentControl}
        <div className="hero-card flex-none flex flex-col gap-[18px]" style={{ padding: 22 }}>
          <div className="flex flex-col gap-[5px]">
            <span className="label">No days yet</span>
            <span
              className="text-[33px] font-bold"
              style={{
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.02em",
                color: "var(--color-text-strong)",
              }}
            >
              No days in this plan yet
            </span>
            <span className="text-[13px]" style={{ color: "#a3a09a" }}>
              Build a routine and it becomes Day 1.
            </span>
          </div>
          <button type="button" className="btn-primary" onClick={onBuildRoutine}>
            Build a routine
          </button>
        </div>
      </div>
    );
  }

  // ---- 8A · a training day --------------------------------------------

  const summary = routineSummary(nextRoutine, settings.defaultRestSeconds);
  const movements = (nextRoutine?.movements || []).slice(0, 2);
  const lastDate = Object.values(sessions || {})
    .filter((s) => s?.finishedAt && s?.date)
    .map((s) => s.date)
    .sort()
    .pop();
  const waiting = waitingLabel(lastDate);

  return (
    <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-[14px]">
      <Header onOpenSettings={onOpenSettings} />
      {segmentControl}

      <div className="hero-card flex-none flex flex-col gap-[18px]" style={{ padding: 22 }}>
        {/* A charge draw, seeded once a day, filling the whole card. The
            horizontal scrim runs the full width so the type sits on the
            opaque left end and the art still reads on the right. */}
        <ArtLayer
          mood="charge"
          seedKey={artSeed.today(dateKey(), upNext.day.id)}
          scrim="heroCard"
        />

        <div className="relative flex flex-col gap-[5px]">
          <span className="label">
            Next up · Day {upNext.position} of {upNext.total}
          </span>
          <span
            className="text-[33px] font-bold"
            style={{
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
              color: "var(--color-text-strong)",
            }}
          >
            {upNext.day.name}
          </span>
          <span className="text-[13px]" style={{ color: "#a3a09a" }}>
            {summary.label}
          </span>
        </div>

        <div className="relative">
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => onBeginSession(upNext.day.id)}
          >
            Begin session
          </button>
        </div>
      </div>

      <RoundCard roundInfo={roundInfo} />

      <div className="flex flex-col gap-[8px] min-h-0">
        <span className="label" style={{ paddingLeft: 2 }}>
          On the bar
        </span>
        {/* Two rows, not the whole session — the rest is behind Begin, and a
            third row overruns the tab bar at 800px. */}
        {movements.map((movement) => (
          <MovementRow
            key={movement.movementId}
            name={movement.movementId}
            movement={movement}
            lastLoad={lastLoadFor(movement.movementId)}
            onOpen={onOpenMovement}
          />
        ))}
        <div className="flex items-center justify-between">
          <button type="button" className="link-teal text-left" onClick={() => setSwapping(true)}>
            Swap in another routine
          </button>
          {/* Skipping is the only way to advance the cursor without training,
              and it must never compete with Begin session. A dim text link is
              the fallback §15.3 allows if the hero overflow reads as hidden. */}
          <button
            type="button"
            className="text-[12px]"
            style={{ color: "var(--color-dim)" }}
            onClick={skipCurrentDay}
          >
            Skip this day
          </button>
        </div>
        {waiting && (
          <span className="text-[12px]" style={{ color: "var(--color-dim)" }}>
            {waiting}
          </span>
        )}

      </div>

      {swapping && (
        <SwapSheet
          planDays={planDays}
          routines={routines}
          currentDayId={upNext.day.id}
          onPickDay={(dayId) => {
            setSwapping(false);
            onBeginSession(dayId, { isSwap: dayId !== upNext.day.id });
          }}
          onPickRoutine={(routine) => {
            setSwapping(false);
            onRunRoutine(routine);
          }}
          onBuild={() => {
            setSwapping(false);
            onBuildRoutine();
          }}
          onClose={() => setSwapping(false)}
        />
      )}
    </div>
  );
}

/**
 * Train a different day today.
 *
 * This swaps THIS SESSION only — it does not edit the plan and it does not
 * move the cursor, so the day you were on is still the day you were on
 * afterwards. That is what lets a plan survive a day where the squat rack was
 * taken.
 */
function SwapSheet({
  planDays,
  routines,
  currentDayId,
  onPickDay,
  onPickRoutine,
  onBuild,
  onClose,
}) {
  const dayRoutineIds = new Set(planDays.map((day) => day.routineId));
  const offPlan = Object.values(routines || {}).filter((r) => !dayRoutineIds.has(r.id));

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.6)" }}>
      <button type="button" style={{ flex: 1 }} onClick={onClose} aria-label="Close" />
      <div
        className="w-full max-w-lg mx-auto flex flex-col gap-2"
        style={{
          background: "var(--color-card)",
          borderTop: "1px solid var(--color-border)",
          padding: 22,
          maxHeight: "72dvh",
          overflowY: "auto",
        }}
      >
        <span className="label">Train another day</span>
        <span className="text-[12px]" style={{ color: "var(--color-dim)", paddingBottom: 4 }}>
          This session only. Your place in the plan does not move.
        </span>
        {planDays.map((day, index) => {
          const routine = routines?.[day.routineId];
          const count = routine?.movements?.length || 0;
          return (
            <button
              key={day.id}
              type="button"
              onClick={() => onPickDay(day.id)}
              className="row-card flex justify-between items-center w-full text-left press"
            >
              <div className="flex flex-col gap-[2px] min-w-0">
                <span className="row-title truncate">
                  Day {index + 1} · {day.name}
                </span>
                <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                  {count} movement{count === 1 ? "" : "s"}
                </span>
              </div>
              {day.id === currentDayId && (
                <span className="text-[11px]" style={{ color: "var(--color-brass)", flex: "none" }}>
                  UP NEXT
                </span>
              )}
            </button>
          );
        })}
        {/* Anything on the shelf, not only the days of this plan. */}
        {offPlan.length > 0 && (
          <>
            <span className="label" style={{ paddingTop: 6 }}>
              Off the plan
            </span>
            {offPlan.map((routine) => (
              <button
                key={routine.id}
                type="button"
                onClick={() => onPickRoutine(routine)}
                className="row-card flex justify-between items-center w-full text-left press"
              >
                <span className="row-title truncate">{routine.name}</span>
                <span className="text-[12px]" style={{ color: "var(--color-muted)", flex: "none" }}>
                  {(routine.movements || []).length} movements
                </span>
              </button>
            ))}
          </>
        )}

        <button type="button" className="btn-secondary" onClick={onBuild}>
          Build one now
        </button>
        <button type="button" className="link-teal" onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}
