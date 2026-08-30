/*
 * Targets — what you are trying to hit, and when the slate wipes.
 *
 * Two groups, each with its OWN cycle, independent of the programme's mode:
 *
 *   habits  — "Every week". Things beside the training: water, stretching.
 *   workout — "Workout targets". Exercises, muscle groups, routines, or a
 *             plain session count.
 *
 * A cycle is either:
 *   'weekly'     — clears on the week boundary, whatever happened.
 *   'onComplete' — clears itself and starts over once every target is hit,
 *                  the way a round of the plan does.
 *
 * Nothing here nags. A cycle that ends unmet just starts again; there is no
 * streak, no penalty, and no record of the miss.
 */

import { dateKey, weekKey, weekKeyFromDay } from "./training.js";

export const TARGET_KINDS = ["exercise", "muscle", "routine", "sessions"];

export const KIND_LABEL = {
  exercise: "Exercise",
  muscle: "Muscle group",
  routine: "Routine",
  sessions: "Any training",
};

/** How a target counts itself, in the user's words. */
export const KIND_HINT = {
  exercise: "counted from logged sessions",
  muscle: "any lift for it",
  routine: "times finished",
  sessions: "sessions of any kind",
};

export const CYCLES = [
  ["weekly", "Every week"],
  ["onComplete", "When I finish them"],
];

export const CYCLE_BLURB = {
  weekly: "Clears Sunday, whatever happened",
  onComplete: "Clears itself and starts over — like the plan",
};

export function emptyTargets() {
  return {
    items: [],
    habitCycle: "weekly",
    // Workout targets default to the plan-like cycle; habits default weekly.
    // Neither follows program.mode — they are their own settings.
    workoutCycle: "onComplete",
    habitState: { startedAt: null, checked: {} },
    workoutState: { startedAt: null, checked: {} },
  };
}

export const newTargetId = () =>
  `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ------------------------------------------------------------------ cycles

/**
 * Has this group's window rolled over since `startedAt`?
 *
 * Only 'weekly' expires on its own — 'onComplete' waits to be finished, which
 * is the whole point of it.
 */
export function cycleExpired(cycle, startedAt, today = dateKey()) {
  if (cycle !== "weekly") return false;
  if (!startedAt) return true;
  return weekKeyFromDay(startedAt) !== weekKey(new Date(`${today}T12:00:00`));
}

/** The state a group should be read with, after any due rollover. */
export function currentState(cycle, state, today = dateKey()) {
  if (cycleExpired(cycle, state?.startedAt, today)) {
    return { startedAt: today, checked: {} };
  }
  return { startedAt: state?.startedAt || today, checked: state?.checked || {} };
}

// ---------------------------------------------------------------- counting

/** Sessions that count towards a cycle that began on `startedAt`. */
function sessionsSince(sessions, startedAt) {
  return Object.values(sessions || {}).filter(
    (s) => s?.finishedAt && s?.date && (!startedAt || s.date >= startedAt)
  );
}

/** Did this session include the movement named `ref`? */
function sessionHasExercise(session, ref) {
  const entry = session?.entries?.[ref];
  return !!entry && (entry.sets || []).some((set) => set?.done);
}

/** Did this session include anything tagged with muscle group `ref`? */
function sessionHitsMuscle(session, ref, exerciseBank) {
  return Object.entries(session?.entries || {}).some(([name, entry]) => {
    if (!(entry.sets || []).some((set) => set?.done)) return false;
    return (exerciseBank?.[name]?.muscleGroups || []).includes(ref);
  });
}

/**
 * How far along one target is.
 *
 * A MANUAL target is never counted from the log — the user ticks it, exactly
 * like a habit. That is what the `manual` flag buys: a target the app has no
 * way to observe ("stretched properly", "trained fasted") still belongs here.
 */
export function progressFor(target, { sessions, exerciseBank, routines, state }) {
  const goal = Math.max(1, Number(target.goal) || 1);

  if (target.manual) {
    return { done: state?.checked?.[target.id] ? goal : 0, goal, manual: true };
  }

  const list = sessionsSince(sessions, state?.startedAt);
  let done = 0;

  if (target.kind === "sessions") {
    done = list.length;
  } else if (target.kind === "exercise") {
    done = list.filter((s) => sessionHasExercise(s, target.ref)).length;
  } else if (target.kind === "muscle") {
    done = list.filter((s) => sessionHitsMuscle(s, target.ref, exerciseBank)).length;
  } else if (target.kind === "routine") {
    done = list.filter((s) => s.routineId === target.ref).length;
  }

  return { done: Math.min(done, goal), goal, manual: false };
}

/** One target's display name. */
export function targetLabel(target, routines) {
  if (target.kind === "routine") return routines?.[target.ref]?.name || "Routine";
  if (target.kind === "sessions") return "Train";
  return target.ref;
}

// ------------------------------------------------------------- the rollup

/**
 * Everything the Targets screen renders, in one call.
 *
 * The header count and every row come from here, so the "4 of 6" at the top
 * can never disagree with the rows under it.
 */
export function targetsOverview({ targets, sessions, exerciseBank, routines, habits, today = dateKey() }) {
  const config = { ...emptyTargets(), ...(targets || {}) };
  const habitState = currentState(config.habitCycle, config.habitState, today);
  const workoutState = currentState(config.workoutCycle, config.workoutState, today);

  const habitList = (habits || [])
    .map((text, index) => ({ index, text: (text || "").trim() }))
    .filter((h) => h.text)
    .map((h) => ({ ...h, done: !!habitState.checked[h.index] }));

  const items = (config.items || []).map((target) => ({
    target,
    label: targetLabel(target, routines),
    progress: progressFor(target, { sessions, exerciseBank, routines, state: workoutState }),
  }));

  const habitsMet = habitList.filter((h) => h.done).length;
  const workoutMet = items.filter((i) => i.progress.done >= i.progress.goal).length;
  const total = habitList.length + items.length;
  const met = habitsMet + workoutMet;

  return {
    config,
    habitState,
    workoutState,
    habits: habitList,
    items,
    habitsMet,
    workoutMet,
    met,
    total,
    // The bar at the top of the screen.
    progress: total ? met / total : 0,
    // 'onComplete' groups roll over the moment everything in them is hit.
    habitsComplete: habitList.length > 0 && habitsMet === habitList.length,
    workoutComplete: items.length > 0 && workoutMet === items.length,
  };
}

/**
 * The state to write back after a group has been fully met on an
 * 'onComplete' cycle: a fresh window starting today.
 */
export function rolledOver(today = dateKey()) {
  return { startedAt: today, checked: {} };
}
