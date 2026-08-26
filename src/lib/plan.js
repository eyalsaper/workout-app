/*
 * The cursor — the app's most important state.
 *
 * A programme is an ORDERED LIST OF DAYS, not a calendar. The cursor holds
 * which day is up next. Log Day 2 and the cursor moves to Day 3 — tomorrow,
 * or five days from now, it makes no difference. Nothing is ever "missed",
 * because nothing was ever promised for a particular Tuesday.
 *
 * Pure functions only: no React, no Firebase, no Date reads except where a
 * function takes `today` as an argument. Every rule below is numbered against
 * IRON-LOG-BUILD-SPEC §7.2.
 */

import { dateKey, daysAgo, WEEKDAY_NAMES } from "./training.js";
import { isRestEntry, cleanName } from "./format.js";

export const PROGRAM_VERSION = 1;

/** Sunday first — the week starts on Sunday everywhere in this app. */
export const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const newId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// ------------------------------------------------------------------ shape

export function emptyProgram() {
  return {
    version: PROGRAM_VERSION,
    id: newId("p"),
    name: "Block 1",
    focus: "Strength",
    mode: "plan",
    days: [],
    cursor: { dayIndex: 0, round: 1 },
    weekdays: Object.fromEntries(WEEKDAY_KEYS.map((k) => [k, null])),
    startedAt: Date.now(),
    chapterId: null,
  };
}

/** Days in plan order, defensive about a Firebase round-trip dropping order. */
export function orderedDays(program) {
  const days = program?.days || [];
  return [...days]
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((day, index) => ({ ...day, order: index }));
}

/** Always in range, even if days were deleted behind the cursor's back. */
export function currentCursor(program) {
  const days = orderedDays(program);
  const round = Math.max(1, program?.cursor?.round ?? 1);
  if (!days.length) return { dayIndex: 0, round };
  const raw = program?.cursor?.dayIndex ?? 0;
  const dayIndex = Math.min(Math.max(0, raw), days.length - 1);
  return { dayIndex, round };
}

/**
 * Rule 7.2.1 — Today always offers days[cursor.dayIndex]. While a programme
 * has days there is no empty Today and no "nothing scheduled".
 */
export function nextDay(program) {
  const days = orderedDays(program);
  if (!days.length) return null;
  const { dayIndex, round } = currentCursor(program);
  return {
    day: days[dayIndex],
    dayIndex,
    round,
    total: days.length,
    // Position in the plan, 1-based, for "Day 3 of 4".
    position: dayIndex + 1,
    isLastOfRound: dayIndex === days.length - 1,
  };
}

// ---------------------------------------------------------------- advance

/**
 * Rule 7.2.2 — logging a session advances the cursor by exactly one, whatever
 * the date. Rule 7.2.4 — past the last day, the round rolls over.
 *
 * Returns the NEW cursor plus which finish screen the session earned. Never
 * mutates; the caller writes the cursor back.
 *
 * `roundClosed` is the fact (the round really did roll over). `showRoundClosed`
 * is the screen choice, and they differ in exactly one case: a one-day plan
 * would close a round every single session, so §7.7 keeps it on 8G forever.
 * A celebration that fires every Tuesday means nothing.
 */
export function advance(program) {
  const days = orderedDays(program);
  const { dayIndex, round } = currentCursor(program);

  if (!days.length) {
    return { cursor: { dayIndex: 0, round }, roundClosed: false, showRoundClosed: false };
  }

  const wasLast = dayIndex >= days.length - 1;
  if (!wasLast) {
    return {
      cursor: { dayIndex: dayIndex + 1, round },
      roundClosed: false,
      showRoundClosed: false,
    };
  }

  return {
    cursor: { dayIndex: 0, round: round + 1 },
    roundClosed: true,
    showRoundClosed: days.length > 1,
  };
}

/**
 * Rule 7.2.5 — skipping is explicit. It advances the cursor and records a
 * skip against that day. It does NOT close the round early: a skipped last
 * day rolls the round over like any other, but the user gets no celebration
 * for a round they did not train.
 */
export function skipDay(program) {
  const day = nextDay(program);
  const result = advance(program);
  return {
    ...result,
    // Never a celebration for a skip.
    showRoundClosed: false,
    skip: day
      ? { dayId: day.day.id, round: day.round, at: Date.now() }
      : null,
  };
}

/**
 * The cursor after a round closes — used by 8H's "START ROUND 9" button,
 * which rolls the cursor and returns to Today.
 */
export function closeRound(program) {
  const { round } = currentCursor(program);
  return { dayIndex: 0, round: round + 1 };
}

/**
 * Rule 7.2.6 — editing the plan keeps the cursor on the same day id if it
 * still exists, otherwise clamps to the nearest lower index. Adding,
 * reordering or deleting days never resets a round.
 *
 * Call with the day id the cursor pointed at BEFORE the edit.
 */
export function reconcileCursor(nextDays, cursor, anchorDayId) {
  const days = [...(nextDays || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const round = Math.max(1, cursor?.round ?? 1);
  if (!days.length) return { dayIndex: 0, round };

  const moved = days.findIndex((day) => day.id === anchorDayId);
  if (moved !== -1) return { dayIndex: moved, round };

  // The day the cursor sat on is gone — fall back to the nearest lower index
  // rather than jumping forward, so nothing is silently skipped.
  const clamped = Math.min(Math.max(0, cursor?.dayIndex ?? 0), days.length - 1);
  return { dayIndex: clamped, round };
}

// ---------------------------------------------------------------- waiting

/**
 * Rule 7.2.7 — "waiting N days" is today minus the last logged session's
 * date. Display only, never a nag. Past 14 days it softens, because a precise
 * count that far out reads as an accusation.
 */
export function waitingLabel(lastSessionDate, today = dateKey()) {
  if (!lastSessionDate) return null;
  const days = daysAgo(lastSessionDate);
  if (days <= 0) return null;
  if (days > 14) return "waiting a while";
  if (days === 1) return "waiting 1 day";
  return `waiting ${days} days`;
}

// ----------------------------------------------------------- mode switching

/**
 * Plan → Schedule (§7.4). Days take a weekday each, pre-filled by spreading
 * forward from today. A migrated programme remembers the weekdays it
 * originally had, and those win — restoring the layout the user actually had
 * beats inventing a new one.
 */
export function toScheduleMode(program, today = new Date()) {
  const days = orderedDays(program);
  const remembered = program?.weekdays || {};
  const hasRemembered = days.some((day) =>
    WEEKDAY_KEYS.some((key) => remembered[key] === day.id)
  );

  let weekdays;
  if (hasRemembered) {
    weekdays = Object.fromEntries(
      WEEKDAY_KEYS.map((key) => [
        key,
        days.some((day) => day.id === remembered[key]) ? remembered[key] : null,
      ])
    );
  } else {
    weekdays = Object.fromEntries(WEEKDAY_KEYS.map((key) => [key, null]));
    const start = today.getDay();
    days.forEach((day, index) => {
      // Spread forward from today; a plan longer than a week overflows and
      // the extra days land unassigned for the user to place.
      if (index < 7) weekdays[WEEKDAY_KEYS[(start + index) % 7]] = day.id;
    });
  }

  // The cursor is dropped, but round history is kept for the record.
  return { ...program, mode: "schedule", weekdays };
}

/**
 * Schedule → Plan (§7.4). Days keep their weekday order (week-start first) as
 * Day 1…Day N, the cursor lands on the first day with no session this week,
 * and the round restarts at 1.
 */
export function toPlanMode(program, loggedDayIdsThisWeek = []) {
  const byId = new Map(orderedDays(program).map((day) => [day.id, day]));
  const weekdays = program?.weekdays || {};

  const ordered = [];
  WEEKDAY_KEYS.forEach((key) => {
    const dayId = weekdays[key];
    if (dayId && byId.has(dayId)) {
      ordered.push(byId.get(dayId));
      byId.delete(dayId);
    }
  });
  // Anything not bound to a weekday keeps its existing order, after the rest.
  byId.forEach((day) => ordered.push(day));

  const days = ordered.map((day, index) => ({ ...day, order: index }));
  const firstUnlogged = days.findIndex((day) => !loggedDayIdsThisWeek.includes(day.id));

  return {
    ...program,
    mode: "plan",
    days,
    cursor: { dayIndex: firstUnlogged === -1 ? 0 : firstUnlogged, round: 1 },
  };
}

/** The one-line confirmation each switch shows. No modal essay (§7.4). */
export function switchModeCopy(toMode) {
  return toMode === "schedule"
    ? "Each day takes a weekday, and a weekday you miss stays missed. Your sessions are kept."
    : "Days become an ordered plan and nothing is tied to a weekday. Your sessions are kept.";
}

// -------------------------------------------------------------- migration

/**
 * Reads the dominant body areas of a day's movements. The legacy model has no
 * routine names — every account's rows are literally "Day 1".."Day 7" — so a
 * migrated routine is named after what it trains, which is at least true, and
 * the user can rename it in the builder.
 */
function deriveRoutineName(movementNames, exerciseBank) {
  const tally = {};
  movementNames.forEach((name) => {
    (exerciseBank?.[name]?.muscleGroups || []).forEach((group) => {
      tally[group] = (tally[group] || 0) + 1;
    });
  });
  const top = Object.entries(tally)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 2)
    .map(([group]) => group);

  if (top.length) return top.join(" + ");
  return movementNames[0] || "Routine";
}

function deriveFocus(movementNames, exerciseBank) {
  const groups = new Set();
  movementNames.forEach((name) => {
    (exerciseBank?.[name]?.muscleGroups || []).forEach((group) => groups.add(group));
  });
  if (!groups.size) return `${movementNames.length} movements`;
  return [...groups].map((g) => g.toLowerCase()).join(", ");
}

/**
 * §7.5 — everyone lands in plan mode.
 *
 * The legacy shape is a 7-slot weekday array per plan, where a slot holds
 * exercise names and "Rest" means an empty slot. Each non-rest slot becomes
 * one day and one routine, in Sunday-first order. Round starts at 1, and the
 * cursor lands on the first day not logged in the last 7 days.
 *
 * Non-destructive by design: the caller writes `program` and `routines` to new
 * nodes and leaves `plans` / `planNames` exactly as they were, so nothing is
 * lost and the old screens could still read them.
 *
 * Returns { program, routines }.
 */
export function migrateToPlan({ planId, planDays, planName, exerciseBank, sessions }) {
  const routines = {};
  const days = [];
  // Which legacy weekday slot became which day — this is what lets historical
  // sessions (which only know `dayIndex` 0–6) resolve a planDayId at read time
  // instead of us rewriting hundreds of session records.
  const legacySlotToDayId = {};
  const weekdays = Object.fromEntries(WEEKDAY_KEYS.map((k) => [k, null]));

  (planDays || []).forEach((slot, slotIndex) => {
    const movementNames = (slot?.exercises || [])
      .filter((name) => !isRestEntry(name))
      .map(cleanName)
      .filter((name) => !exerciseBank?.[name]?.isHidden);
    if (!movementNames.length) return;

    const routineId = newId("r");
    const name = deriveRoutineName(movementNames, exerciseBank);
    routines[routineId] = {
      id: routineId,
      name,
      focus: deriveFocus(movementNames, exerciseBank),
      // Sets / reps / target load move from the global bank onto the routine,
      // which is where the new model keeps them. The bank stays as the
      // movement catalogue (muscle groups, cues, rest times).
      movements: movementNames.map((movementId, order) => {
        const bank = exerciseBank?.[movementId] || {};
        return {
          movementId,
          order,
          sets: Math.max(1, parseInt(bank.sets, 10) || 3),
          reps: bank.reps ?? "",
          targetLoadKg: parseFloat(bank.weight) || 0,
        };
      }),
    };

    const dayId = newId("d");
    days.push({ id: dayId, order: days.length, name, routineId });
    legacySlotToDayId[slotIndex] = dayId;
    weekdays[WEEKDAY_KEYS[slotIndex]] = dayId;
  });

  // The cursor lands on the first day not logged in the last 7 days (0 if all
  // of them were) — the closest thing to "where were you" the old data knows.
  const recent = new Set();
  Object.values(sessions || {}).forEach((session) => {
    if (!session?.date || Number(session.planId) !== Number(planId)) return;
    if (daysAgo(session.date) > 7) return;
    const dayId = legacySlotToDayId[session.dayIndex];
    if (dayId) recent.add(dayId);
  });
  const firstUnlogged = days.findIndex((day) => !recent.has(day.id));

  return {
    program: {
      ...emptyProgram(),
      name: planName?.trim() || "Block 1",
      days,
      cursor: { dayIndex: firstUnlogged === -1 ? 0 : firstUnlogged, round: 1 },
      weekdays,
      legacySlotToDayId,
      legacyPlanId: planId,
    },
    routines,
  };
}

/**
 * A historical session's plan day. New sessions store `planDayId` outright;
 * migrated ones resolve it through the map the migration left behind.
 */
export function sessionDayId(session, program) {
  if (session?.planDayId) return session.planDayId;
  if (session?.dayIndex === null || session?.dayIndex === undefined) return null;
  if (Number(session.planId) !== Number(program?.legacyPlanId)) return null;
  return program?.legacySlotToDayId?.[session.dayIndex] || null;
}

/** "Monday", for past dates only — never to promise a future session. */
export function weekdayNameFor(dateString) {
  const [y, m, d] = (dateString || "").split("-").map(Number);
  if (!y) return "";
  return WEEKDAY_NAMES[new Date(y, m - 1, d).getDay()];
}
