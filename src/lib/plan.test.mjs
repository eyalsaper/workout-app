/*
 * Cursor rules 7.2.1 – 7.2.6, plus the edge cases in §7.7.
 *
 * Run with `npm test` — Node's built-in runner, no dependency added. The spec
 * asks for these before any screen consumes the cursor, because every one of
 * these rules is invisible in the UI until it is wrong.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  advance,
  closeRound,
  currentCursor,
  emptyProgram,
  migrateToPlan,
  nextDay,
  reconcileCursor,
  sessionDayId,
  skipDay,
  toPlanMode,
  toScheduleMode,
  waitingLabel,
} from "./plan.js";
import { roundProgress } from "./training.js";

/** A plan of `n` days, cursor wherever you put it. */
function planOf(n, dayIndex = 0, round = 1) {
  return {
    ...emptyProgram(),
    days: Array.from({ length: n }, (_, i) => ({
      id: `d${i + 1}`,
      order: i,
      name: `Day ${i + 1}`,
      routineId: `r${i + 1}`,
    })),
    cursor: { dayIndex, round },
  };
}

// ---------------------------------------------------------------- 7.2.1

test("7.2.1 — Today always offers days[cursor.dayIndex]", () => {
  const program = planOf(4, 2, 8);
  const up = nextDay(program);
  assert.equal(up.day.id, "d3");
  assert.equal(up.position, 3);
  assert.equal(up.total, 4);
  assert.equal(up.round, 8);
  assert.equal(up.isLastOfRound, false);
});

test("7.2.1 — a programme with no days has no next day, and does not throw", () => {
  assert.equal(nextDay(emptyProgram()), null);
  assert.deepEqual(currentCursor(emptyProgram()), { dayIndex: 0, round: 1 });
});

test("7.2.1 — a cursor left out of range by an edit is clamped, not trusted", () => {
  const program = planOf(3, 9, 2);
  assert.deepEqual(currentCursor(program), { dayIndex: 2, round: 2 });
  assert.equal(nextDay(program).day.id, "d3");
});

// ---------------------------------------------------------------- 7.2.2

test("7.2.2 — logging advances the cursor by exactly one", () => {
  const { cursor, roundClosed } = advance(planOf(4, 1, 8));
  assert.deepEqual(cursor, { dayIndex: 2, round: 8 });
  assert.equal(roundClosed, false);
});

test("7.2.2 — two sessions in one day advance it twice", () => {
  const program = planOf(4, 0, 1);
  const first = advance(program);
  const second = advance({ ...program, cursor: first.cursor });
  assert.deepEqual(second.cursor, { dayIndex: 2, round: 1 });
});

// ---------------------------------------------------------------- 7.2.3

test("7.2.3 — time never advances the cursor", () => {
  // Logging Day 2 four days late still lands on Day 3, and nothing anywhere
  // is marked missed. The only input to advance() is the plan itself.
  const program = planOf(4, 1, 8);
  const late = advance(program);
  assert.deepEqual(late.cursor, { dayIndex: 2, round: 8 });
  // Re-reading the same programme days later returns the same day.
  assert.equal(nextDay(program).day.id, "d2");
  assert.equal(nextDay(program).day.id, "d2");
});

// ---------------------------------------------------------------- 7.2.4

test("7.2.4 — past the last day the round rolls over and 8H fires", () => {
  const { cursor, roundClosed, showRoundClosed } = advance(planOf(4, 3, 8));
  assert.deepEqual(cursor, { dayIndex: 0, round: 9 });
  assert.equal(roundClosed, true);
  assert.equal(showRoundClosed, true);
});

test("§7.7 — a one-day plan closes rounds but never shows 8H", () => {
  const { cursor, roundClosed, showRoundClosed } = advance(planOf(1, 0, 3));
  assert.deepEqual(cursor, { dayIndex: 0, round: 4 });
  assert.equal(roundClosed, true, "the round really did roll over");
  assert.equal(showRoundClosed, false, "but the celebration must not fire");
});

test("closeRound rolls to Day 1 of the next round", () => {
  assert.deepEqual(closeRound(planOf(4, 3, 8)), { dayIndex: 0, round: 9 });
});

// ---------------------------------------------------------------- 7.2.5

test("7.2.5 — skipping advances the cursor and records a skip", () => {
  const result = skipDay(planOf(4, 1, 8));
  assert.deepEqual(result.cursor, { dayIndex: 2, round: 8 });
  assert.equal(result.skip.dayId, "d2");
  assert.equal(result.skip.round, 8);
});

test("7.2.5 — skipping the last day rolls the round but earns no celebration", () => {
  const result = skipDay(planOf(4, 3, 8));
  assert.deepEqual(result.cursor, { dayIndex: 0, round: 9 });
  assert.equal(result.roundClosed, true);
  assert.equal(result.showRoundClosed, false);
});

// ---------------------------------------------------------------- 7.2.6

test("7.2.6 — reordering keeps the cursor on the same day", () => {
  const days = [
    { id: "d3", order: 0, name: "Day 3" },
    { id: "d1", order: 1, name: "Day 1" },
    { id: "d2", order: 2, name: "Day 2" },
  ];
  // Cursor was on d2 at index 1; d2 is now at index 2.
  assert.deepEqual(reconcileCursor(days, { dayIndex: 1, round: 8 }, "d2"), {
    dayIndex: 2,
    round: 8,
  });
});

test("7.2.6 — adding a day never resets the round", () => {
  const days = [
    { id: "d1", order: 0 },
    { id: "d2", order: 1 },
    { id: "d3", order: 2 },
    { id: "d4", order: 3 },
    { id: "d5", order: 4 },
  ];
  assert.deepEqual(reconcileCursor(days, { dayIndex: 2, round: 8 }, "d3"), {
    dayIndex: 2,
    round: 8,
  });
});

test("7.2.6 — deleting the cursor's day clamps to the nearest lower index", () => {
  const days = [
    { id: "d1", order: 0 },
    { id: "d2", order: 1 },
  ];
  // Cursor sat on d3 at index 2; d3 is gone and the plan is now 2 long.
  assert.deepEqual(reconcileCursor(days, { dayIndex: 2, round: 8 }, "d3"), {
    dayIndex: 1,
    round: 8,
  });
});

test("7.2.6 — deleting every day leaves a valid cursor", () => {
  assert.deepEqual(reconcileCursor([], { dayIndex: 3, round: 8 }, "d4"), {
    dayIndex: 0,
    round: 8,
  });
});

// ---------------------------------------------------------------- 7.2.7

test("7.2.7 — waiting is a fact, and softens past 14 days", () => {
  assert.equal(waitingLabel(null), null);
  const today = new Date();
  const ago = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };
  assert.equal(waitingLabel(ago(0)), null, "trained today is not waiting");
  assert.equal(waitingLabel(ago(1)), "waiting 1 day");
  assert.equal(waitingLabel(ago(3)), "waiting 3 days");
  assert.equal(waitingLabel(ago(20)), "waiting a while");
});

// -------------------------------------------------------- the ring agrees

test("the ring, its caption and the pills come from one call", () => {
  const program = planOf(4, 2, 8);
  const progress = roundProgress(program, program.days);
  assert.equal(progress.dayLabel, "Day 3 of 4");
  assert.equal(progress.roundLabel, "round 8");
  assert.equal(progress.progress, 0.5, "2 of 4 done");
  assert.deepEqual(
    progress.pills.map((p) => p.state),
    ["done", "done", "next", "upcoming"]
  );
  // The design's own numbers: dashoffset 125 of a 251 circumference.
  assert.equal(Math.round(251 * (1 - progress.progress)), 126);
});

test("a brand-new programme reads as an empty ring on Day 1", () => {
  const program = planOf(4, 0, 1);
  const progress = roundProgress(program, program.days);
  assert.equal(progress.progress, 0);
  assert.equal(progress.dayLabel, "Day 1 of 4");
  assert.equal(progress.roundLabel, "round 1");
});

test("plans past six days collapse to a bar plus a numeral", () => {
  const progress = roundProgress(planOf(8, 2, 1), planOf(8, 2, 1).days);
  assert.equal(progress.collapsed, true);
  assert.equal(progress.countLabel, "2 of 8");
});

// ------------------------------------------------------------ mode switch

test("7.4 — switching to Schedule and back loses no days", () => {
  const program = planOf(3, 1, 5);
  const scheduled = toScheduleMode(program, new Date(2026, 7, 24)); // a Monday
  assert.equal(scheduled.mode, "schedule");
  assert.equal(Object.values(scheduled.weekdays).filter(Boolean).length, 3);

  const replanned = toPlanMode(scheduled, []);
  assert.equal(replanned.mode, "plan");
  assert.deepEqual(
    replanned.days.map((d) => d.id),
    ["d1", "d2", "d3"]
  );
  assert.equal(replanned.cursor.round, 1);
});

test("7.4 — Schedule → Plan puts the cursor on the first day not logged this week", () => {
  const scheduled = toScheduleMode(planOf(3, 0, 1), new Date(2026, 7, 24));
  const replanned = toPlanMode(scheduled, ["d1"]);
  assert.equal(replanned.cursor.dayIndex, 1);
});

test("7.4 — a migrated programme restores its original weekdays, not a fresh spread", () => {
  const { program } = migrateToPlan({
    planId: 1,
    planName: "Block 1",
    exerciseBank: { Squat: { sets: 3, reps: "5", weight: "100" } },
    sessions: {},
    planDays: [
      { exercises: ["Rest"] }, // Sunday
      { exercises: ["Squat"] }, // Monday
      { exercises: ["Rest"] },
      { exercises: ["Squat"] }, // Wednesday
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
    ],
  });
  const scheduled = toScheduleMode(program, new Date(2026, 7, 28)); // a Friday
  assert.equal(scheduled.weekdays.mon, program.days[0].id);
  assert.equal(scheduled.weekdays.wed, program.days[1].id);
  assert.equal(scheduled.weekdays.fri, null, "not re-spread from today");
});

// -------------------------------------------------------------- migration

test("7.5 — migration drops rest slots and keeps Sunday-first order", () => {
  const { program, routines } = migrateToPlan({
    planId: 1,
    planName: "Block 2",
    exerciseBank: {
      Squat: { sets: 4, reps: "5", weight: "110", muscleGroups: ["Quads", "Glutes"] },
      "Bench Press": { sets: 3, reps: "8", weight: "80", muscleGroups: ["Chest"] },
    },
    sessions: {},
    planDays: [
      { exercises: ["Rest"] },
      { exercises: ["Squat"] },
      { exercises: [] },
      { exercises: ["Bench Press"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
    ],
  });

  assert.equal(program.mode, "plan", "everyone lands in plan mode");
  assert.equal(program.cursor.round, 1);
  assert.equal(program.days.length, 2, "empty and Rest slots are not days");
  assert.deepEqual(
    program.days.map((d) => d.order),
    [0, 1]
  );
  assert.equal(program.days[0].name, "Glutes + Quads");
  assert.equal(program.days[1].name, "Chest");

  const routine = routines[program.days[0].routineId];
  assert.equal(routine.movements[0].movementId, "Squat");
  assert.equal(routine.movements[0].sets, 4);
  assert.equal(routine.movements[0].targetLoadKg, 110);
});

test("7.5 — the cursor lands on the first day not logged in the last 7 days", () => {
  const today = new Date();
  const key = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);

  const { program } = migrateToPlan({
    planId: 1,
    planName: "Block 1",
    exerciseBank: {},
    // Slot 1 (Monday) was trained two days ago, so the cursor moves past it.
    sessions: { s1: { date: key(twoDaysAgo), planId: 1, dayIndex: 1 } },
    planDays: [
      { exercises: ["Rest"] },
      { exercises: ["Squat"] },
      { exercises: ["Bench Press"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
    ],
  });
  assert.equal(program.cursor.dayIndex, 1);
});

test("7.5 — a historical session resolves its plan day without being rewritten", () => {
  const { program } = migrateToPlan({
    planId: 1,
    planName: "Block 1",
    exerciseBank: {},
    sessions: {},
    planDays: [
      { exercises: ["Rest"] },
      { exercises: ["Squat"] },
      { exercises: ["Rest"] },
      { exercises: ["Bench Press"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
      { exercises: ["Rest"] },
    ],
  });

  // An old record: no planDayId of its own, just a weekday slot.
  assert.equal(sessionDayId({ planId: 1, dayIndex: 3 }, program), program.days[1].id);
  // A new record carries its own, and is trusted over the map.
  assert.equal(sessionDayId({ planDayId: "d_new", dayIndex: 3, planId: 1 }, program), "d_new");
  // An ad-hoc session belongs to no day.
  assert.equal(sessionDayId({ planId: null, dayIndex: null }, program), null);
});
