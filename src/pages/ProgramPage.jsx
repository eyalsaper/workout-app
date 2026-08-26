import React, { useState } from "react";
import { useWorkout } from "../state/WorkoutContext";
import ArtLayer from "../components/ArtLayer";
import { Kicker, Rule } from "../components/poster";
import { artSeed } from "../lib/art";
import {
  WEEKDAY_KEYS,
  orderedDays,
  sessionDayId,
  switchModeCopy,
  waitingLabel,
} from "../lib/plan";
import { dateKey, weekDates, weekKey, weekKeyFromDay } from "../lib/training";

/*
 * 8I · Program in plan mode (the default) and 8P · schedule mode (opt-in).
 *
 * Deliberately the same shell, so the switch reads as the same screen with a
 * different clock. The difference that matters: plan mode never prints a
 * future weekday, because the app does not know when Thursday's session will
 * happen and must not pretend.
 */

const HERO = 250;

const WEEKDAY_LABEL = {
  sun: "Sun",
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
};

const WEEKDAY_FULL = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

function ModeChips({ mode, onSwitch }) {
  return (
    <div className="flex gap-2">
      {[
        ["plan", "Plan"],
        ["schedule", "Schedule"],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          className="mode-chip"
          data-active={mode === key}
          onClick={() => key !== mode && onSwitch(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** The cursor block: a brass rule above AND below, and the day that is next. */
function CursorBlock({ title, badge, sub, waiting }) {
  return (
    <>
      <Rule brass />
      <div className="flex flex-col gap-[5px]" style={{ padding: "14px 0" }}>
        <div className="flex items-baseline justify-between gap-3">
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              color: "var(--color-text-strong)",
            }}
          >
            {title}
          </span>
          <span className="kicker" style={{ flex: "none" }}>
            {badge}
          </span>
        </div>
        <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>{sub}</span>
        {waiting && (
          <span style={{ fontSize: 12, color: "var(--color-dim)" }}>{waiting}</span>
        )}
      </div>
      <Rule brass />
    </>
  );
}

function DayRow({ title, sub, status, statusColor }) {
  return (
    <>
      <Rule />
      <div className="flex items-center justify-between gap-3" style={{ padding: "13px 0" }}>
        <div className="flex flex-col gap-[2px] min-w-0">
          <span
            className="truncate"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 600,
              color: "var(--color-muted-poster)",
            }}
          >
            {title}
          </span>
          <span style={{ fontSize: 12, color: "var(--color-dim)" }}>{sub}</span>
        </div>
        <span style={{ fontSize: 12, color: statusColor || "var(--color-dim)", flex: "none" }}>
          {status}
        </span>
      </div>
    </>
  );
}

export default function ProgramPage({ onEditPlan, onOpenRoutine, onOpenBlocks }) {
  const {
    program,
    routines,
    sessions,
    roundInfo,
    lastSessionDate,
    setProgramMode,
    getRoutine,
  } = useWorkout();

  const [pendingMode, setPendingMode] = useState(null);
  const days = orderedDays(program);
  // Skips are recorded when the user advances the cursor without training.
  // Shown as a fact on the day it happened to, never as a judgement.
  const skips = program?.skips || [];
  const mode = program?.mode === "schedule" ? "schedule" : "plan";
  const cursorIndex = program?.cursor?.dayIndex ?? 0;

  const movementCount = (day) => {
    const routine = getRoutine(day.routineId);
    const n = routine?.movements?.length || 0;
    return `${n} movement${n === 1 ? "" : "s"}`;
  };

  /** The most recent finished session for a plan day, for "done · 23 Aug". */
  const lastDoneFor = (dayId) => {
    const match = Object.values(sessions || {})
      .filter((s) => s?.finishedAt && sessionDayId(s, program) === dayId)
      .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
      .pop();
    if (!match) return null;
    const [, m, d] = match.date.split("-").map(Number);
    const month = new Date(2000, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
    return { date: match.date, label: `done · ${d} ${month}` };
  };

  const totalSessions = Object.values(sessions || {}).filter((s) => s?.finishedAt).length;
  const planned = days.length * roundInfo.round;

  const confirmSwitch = () => {
    setProgramMode(pendingMode);
    setPendingMode(null);
  };

  // ---- shared hero ------------------------------------------------------
  const kicker =
    mode === "plan"
      ? `${program?.focus || "Strength"} · ${days.length}-day plan`
      : `${program?.focus || "Strength"} · ${WEEKDAY_KEYS.filter((k) => program?.weekdays?.[k])
          .map((k) => WEEKDAY_LABEL[k].toUpperCase())
          .join(" ")}`;

  const sub =
    mode === "plan"
      ? `round ${roundInfo.round} · day ${roundInfo.position} of ${roundInfo.total} · ${totalSessions} of ${planned} sessions logged`
      : `${totalSessions} sessions logged`;

  return (
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: "var(--color-poster)", overflowY: "auto" }}
    >
      <div
        className="relative flex-none flex flex-col justify-end"
        style={{ height: HERO, padding: "0 24px 20px" }}
      >
        <ArtLayer mood="charge" seedKey={artSeed.band("program")} scrim="poster" />
        <div className="relative flex flex-col gap-[7px]">
          <Kicker>{kicker}</Kicker>
          {/* The title is the way to the other blocks. */}
          <button type="button" className="text-left" onClick={onOpenBlocks}>
            <span className="poster-title">{program?.name || "Block 1"}</span>
          </button>
          <span style={{ fontSize: 13, color: "var(--color-muted-poster)" }}>{sub}</span>
        </div>
      </div>

      <div className="flex flex-col flex-1" style={{ padding: "0 24px 16px" }}>
        <ModeChips mode={mode} onSwitch={setPendingMode} />

        {mode === "plan" ? (
          <PlanBody
            days={days}
            skips={skips}
            cursorIndex={cursorIndex}
            roundInfo={roundInfo}
            movementCount={movementCount}
            lastDoneFor={lastDoneFor}
            lastSessionDate={lastSessionDate}
            getRoutine={getRoutine}
            onOpenRoutine={onOpenRoutine}
          />
        ) : (
          <ScheduleBody
            program={program}
            days={days}
            sessions={sessions}
            movementCount={movementCount}
            getRoutine={getRoutine}
          />
        )}

        <button
          type="button"
          className="link-teal text-left"
          style={{ marginTop: "auto", paddingTop: 12 }}
          onClick={onEditPlan}
        >
          {mode === "plan" ? "Edit this plan" : "Edit this block"}
        </button>
      </div>

      {pendingMode && (
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
            {/* One line. No modal essay (§7.4). */}
            <span style={{ fontSize: 14, color: "var(--color-text)" }}>
              {switchModeCopy(pendingMode)}
            </span>
            <button type="button" className="btn-primary" onClick={confirmSwitch}>
              Switch to {pendingMode === "schedule" ? "Schedule" : "Plan"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPendingMode(null)}
            >
              Keep {pendingMode === "schedule" ? "Plan" : "Schedule"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ 8I

function PlanBody({
  days,
  skips,
  cursorIndex,
  roundInfo,
  movementCount,
  lastDoneFor,
  lastSessionDate,
  getRoutine,
  onOpenRoutine,
}) {
  const waiting = waitingLabel(lastSessionDate);

  return (
    <>
      {/* One 5px segment per plan day — not per week. */}
      <div className="flex gap-[4px]" style={{ margin: "14px 0 16px" }}>
        {days.map((day, index) => (
          <span
            key={day.id}
            style={{
              flex: 1,
              height: 5,
              background:
                index < cursorIndex
                  ? "var(--color-brass)"
                  : index === cursorIndex
                  ? "var(--color-teal)"
                  : "var(--color-rule)",
            }}
          />
        ))}
      </div>

      {days.map((day, index) => {
        const done = lastDoneFor(day.id);
        const routine = getRoutine(day.routineId);
        const skipped = skips.filter((skip) => skip.dayId === day.id).length;

        if (index === cursorIndex) {
          return (
            <CursorBlock
              key={day.id}
              title={`Day ${index + 1} · ${day.name}`}
              badge="Next"
              // The migration falls back to "N movements" as a focus when the
              // bank has no muscle groups, so don't print it twice.
              sub={
                routine?.focus && routine.focus !== movementCount(day)
                  ? `${movementCount(day)} · ${routine.focus}`
                  : movementCount(day)
              }
              waiting={waiting}
            />
          );
        }

        return (
          <button key={day.id} type="button" className="text-left" onClick={() => onOpenRoutine?.(day)}>
            <DayRow
              title={`Day ${index + 1} · ${day.name}`}
              sub={movementCount(day)}
              // A past date is fine and good. A future weekday is a bug.
              status={
                done
                  ? done.label
                  : skipped
                  ? `skipped ${skipped > 1 ? `${skipped}×` : "once"}`
                  : index < cursorIndex
                  ? "done"
                  : "after that"
              }
              statusColor={done ? "var(--color-teal)" : "var(--color-dim)"}
            />
          </button>
        );
      })}

      <span style={{ fontSize: 12, color: "var(--color-dim)", paddingTop: 12 }}>
        No weekdays anywhere. Finish Day {days.length} and the plan starts over at Day 1 as
        round {roundInfo.round + 1}.
      </span>
    </>
  );
}

// ------------------------------------------------------------------ 8P

function ScheduleBody({ program, days, sessions, movementCount, getRoutine }) {
  const today = dateKey();
  const todayKey = WEEKDAY_KEYS[new Date().getDay()];
  const thisWeek = weekKey();
  const dates = weekDates();
  const byId = new Map(days.map((day) => [day.id, day]));

  /** Was this weekday's day logged this week? */
  const stateFor = (key, index) => {
    const dayId = program?.weekdays?.[key];
    if (!dayId) return "empty";
    const logged = Object.values(sessions || {}).some(
      (s) =>
        s?.finishedAt &&
        s?.date &&
        weekKeyFromDay(s.date) === thisWeek &&
        sessionDayId(s, program) === dayId
    );
    if (logged) return "done";
    if (key === todayKey) return "today";
    // A weekday that passes unlogged is missed, and stays missed.
    if (dates[index] < today) return "missed";
    return "upcoming";
  };

  const SEGMENT_FILL = {
    done: "var(--color-brass)",
    today: "var(--color-teal)",
    missed: "#3a3f48",
    upcoming: "var(--color-rule)",
    empty: "var(--color-rule)",
  };

  return (
    <>
      <div className="flex flex-col gap-[8px]" style={{ margin: "14px 0 16px" }}>
        <div className="flex gap-[4px]">
          {WEEKDAY_KEYS.map((key, index) => (
            <span
              key={key}
              style={{ flex: 1, height: 5, background: SEGMENT_FILL[stateFor(key, index)] }}
            />
          ))}
        </div>
        <div className="flex" style={{ fontSize: 11 }}>
          {WEEKDAY_KEYS.map((key) => (
            <span
              key={key}
              style={{
                flex: 1,
                textAlign: "center",
                color: key === todayKey ? "var(--color-teal)" : "var(--color-dim)",
              }}
            >
              {WEEKDAY_LABEL[key]}
            </span>
          ))}
        </div>
      </div>

      {WEEKDAY_KEYS.map((key, index) => {
        const dayId = program?.weekdays?.[key];
        if (!dayId || !byId.has(dayId)) return null;
        const day = byId.get(dayId);
        const state = stateFor(key, index);

        if (key === todayKey) {
          return (
            <CursorBlock
              key={key}
              title={`${WEEKDAY_LABEL[key]} · ${day.name}`}
              badge="Today"
              sub={movementCount(day)}
            />
          );
        }

        return (
          <DayRow
            key={key}
            title={`${WEEKDAY_FULL[key]} · ${day.name}`}
            sub={movementCount(day)}
            status={state === "done" ? "done" : state === "missed" ? "missed" : WEEKDAY_FULL[key]}
            statusColor={state === "done" ? "var(--color-teal)" : "var(--color-dim)"}
          />
        );
      })}

      {/* Must stay on one line; two lines clip the link below at 800px. */}
      <span
        style={{
          fontSize: 12,
          color: "var(--color-dim)",
          paddingTop: 12,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        Miss Thursday and Thursday is gone. Plan mode doesn&apos;t do that.
      </span>
    </>
  );
}
