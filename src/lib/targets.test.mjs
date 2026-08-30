import test from "node:test";
import assert from "node:assert/strict";

import {
  cycleExpired,
  currentState,
  emptyTargets,
  progressFor,
  targetsOverview,
} from "./targets.js";
import { dateKey } from "./training.js";

const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return dateKey(d);
};

const session = (date, entries, over = {}) => ({
  date,
  finishedAt: new Date(`${date}T19:00:00`).getTime(),
  entries,
  ...over,
});

const set = () => ({ weight: "100", reps: "5", done: true });

const BANK = {
  "Back Squat": { muscleGroups: ["Quads", "Glutes"] },
  "Bench Press": { muscleGroups: ["Chest"] },
  "Leg Press": { muscleGroups: ["Quads"] },
};

// ------------------------------------------------------------------ cycles

test("a weekly cycle expires on the week boundary, onComplete never does", () => {
  const lastWeek = day(-8);
  assert.equal(cycleExpired("weekly", lastWeek), true);
  assert.equal(cycleExpired("weekly", dateKey()), false);
  // onComplete waits to be finished — that is the whole point of it.
  assert.equal(cycleExpired("onComplete", lastWeek), false);
  assert.equal(cycleExpired("onComplete", null), false);
});

test("a never-started weekly cycle counts as expired", () => {
  assert.equal(cycleExpired("weekly", null), true);
  assert.deepEqual(currentState("weekly", { startedAt: null, checked: { 0: true } }), {
    startedAt: dateKey(),
    checked: {},
  });
});

test("an expired weekly cycle drops its ticks; a live one keeps them", () => {
  const stale = { startedAt: day(-8), checked: { 0: true } };
  assert.deepEqual(currentState("weekly", stale).checked, {});

  const live = { startedAt: dateKey(), checked: { 0: true } };
  assert.deepEqual(currentState("weekly", live).checked, { 0: true });

  // onComplete holds its ticks across weeks until the group is finished.
  assert.deepEqual(currentState("onComplete", stale).checked, { 0: true });
});

// ---------------------------------------------------------------- counting

test("an exercise target counts sessions that actually logged it", () => {
  const sessions = {
    a: session(day(-2), { "Back Squat": { sets: [set()] } }),
    b: session(day(-1), { "Bench Press": { sets: [set()] } }),
    c: session(day(0), { "Back Squat": { sets: [set()] } }),
    // Present but never logged — must not count.
    d: session(day(0), { "Back Squat": { sets: [{ done: false }] } }),
  };
  const target = { id: "t1", kind: "exercise", ref: "Back Squat", goal: 2 };
  assert.deepEqual(progressFor(target, { sessions, state: { startedAt: day(-7) } }), {
    done: 2,
    goal: 2,
    manual: false,
  });
});

test("a muscle target counts any lift tagged with it", () => {
  const sessions = {
    a: session(day(-1), { "Back Squat": { sets: [set()] } }),
    b: session(day(0), { "Leg Press": { sets: [set()] } }),
    c: session(day(0), { "Bench Press": { sets: [set()] } }),
  };
  const target = { id: "t2", kind: "muscle", ref: "Quads", goal: 3 };
  const p = progressFor(target, {
    sessions,
    exerciseBank: BANK,
    state: { startedAt: day(-7) },
  });
  assert.equal(p.done, 2, "squat and leg press, not bench");
});

test("a routine target counts times that routine was finished", () => {
  const sessions = {
    a: session(day(-1), {}, { routineId: "r1" }),
    b: session(day(0), {}, { routineId: "r1" }),
    c: session(day(0), {}, { routineId: "r2" }),
  };
  const target = { id: "t3", kind: "routine", ref: "r1", goal: 2 };
  assert.equal(progressFor(target, { sessions, state: { startedAt: day(-7) } }).done, 2);
});

test("a session-count target counts any training", () => {
  const sessions = {
    a: session(day(-1), {}),
    b: session(day(0), {}),
    c: session(day(0), {}),
  };
  const target = { id: "t4", kind: "sessions", goal: 4 };
  assert.deepEqual(progressFor(target, { sessions, state: { startedAt: day(-7) } }), {
    done: 3,
    goal: 4,
    manual: false,
  });
});

test("counting ignores sessions from before the cycle began", () => {
  const sessions = {
    old: session(day(-10), { "Back Squat": { sets: [set()] } }),
    now: session(day(0), { "Back Squat": { sets: [set()] } }),
  };
  const target = { id: "t5", kind: "exercise", ref: "Back Squat", goal: 5 };
  assert.equal(progressFor(target, { sessions, state: { startedAt: day(-3) } }).done, 1);
});

test("progress never exceeds the goal", () => {
  const sessions = Object.fromEntries(
    [0, 1, 2, 3].map((i) => [i, session(day(-i), { "Back Squat": { sets: [set()] } })])
  );
  const target = { id: "t6", kind: "exercise", ref: "Back Squat", goal: 2 };
  assert.equal(progressFor(target, { sessions, state: { startedAt: day(-7) } }).done, 2);
});

// ----------------------------------------------------------------- manual

test("a manual target is ticked by hand and never read from the log", () => {
  const sessions = {
    a: session(day(0), { "Back Squat": { sets: [set()] } }),
  };
  const target = { id: "m1", kind: "exercise", ref: "Back Squat", goal: 1, manual: true };

  const unticked = progressFor(target, { sessions, state: { checked: {} } });
  assert.deepEqual(unticked, { done: 0, goal: 1, manual: true });

  const ticked = progressFor(target, { sessions, state: { checked: { m1: true } } });
  assert.equal(ticked.done, 1);
});

// --------------------------------------------------------------- overview

test("the header count is the sum of the rows beneath it", () => {
  const sessions = {
    a: session(day(-1), { "Back Squat": { sets: [set()] } }),
    b: session(day(0), { "Back Squat": { sets: [set()] } }),
  };
  const view = targetsOverview({
    targets: {
      ...emptyTargets(),
      habitState: { startedAt: dateKey(), checked: { 0: true, 1: true } },
      workoutState: { startedAt: day(-7), checked: {} },
      items: [
        { id: "t1", kind: "exercise", ref: "Back Squat", goal: 2 },
        { id: "t2", kind: "muscle", ref: "Quads", goal: 3 },
      ],
    },
    sessions,
    exerciseBank: BANK,
    habits: ["Drink 2L water", "Stretch 10 mins", "Hit protein goal"],
  });

  assert.equal(view.habits.length, 3);
  assert.equal(view.habitsMet, 2);
  assert.equal(view.workoutMet, 1, "squat hit 2 of 2; quads only 2 of 3");
  assert.equal(view.total, 5);
  assert.equal(view.met, 3);
  assert.equal(view.progress, 3 / 5);
});

test("blank habit rows are not targets", () => {
  const view = targetsOverview({
    targets: emptyTargets(),
    sessions: {},
    habits: ["Drink 2L water", "", "   "],
  });
  assert.equal(view.habits.length, 1);
  assert.equal(view.total, 1);
});

test("an empty group is not 'complete' — there is nothing to finish", () => {
  const view = targetsOverview({ targets: emptyTargets(), sessions: {}, habits: [] });
  assert.equal(view.habitsComplete, false);
  assert.equal(view.workoutComplete, false);
  assert.equal(view.total, 0);
  assert.equal(view.progress, 0);
});

test("a group reports complete once every one of its targets is hit", () => {
  const sessions = { a: session(day(0), {}, { routineId: "r1" }) };
  const view = targetsOverview({
    targets: {
      ...emptyTargets(),
      workoutState: { startedAt: day(-2), checked: {} },
      items: [{ id: "t1", kind: "routine", ref: "r1", goal: 1 }],
    },
    sessions,
    habits: [],
  });
  assert.equal(view.workoutComplete, true);
  assert.equal(view.progress, 1);
});

test("the two groups keep separate cycles", () => {
  const view = targetsOverview({
    targets: {
      ...emptyTargets(),
      habitCycle: "weekly",
      workoutCycle: "onComplete",
      // Both last touched over a week ago.
      habitState: { startedAt: day(-9), checked: { 0: true } },
      workoutState: { startedAt: day(-9), checked: { t1: true } },
      items: [{ id: "t1", kind: "sessions", goal: 1, manual: true }],
    },
    sessions: {},
    habits: ["Drink 2L water"],
  });

  // The weekly group rolled over and lost its tick; the onComplete one did not.
  assert.equal(view.habits[0].done, false);
  assert.equal(view.items[0].progress.done, 1);
});
