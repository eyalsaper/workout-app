// Training maths and date helpers. Pure functions — no React, no Firebase.

import { isRestEntry, cleanName, setCountFor } from "./format.js";

export const MUSCLE_GROUPS = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
];

/**
 * Plan rows have never had an editable day-name field — every account's
 * `row.day` is still literally "Day 1".."Day 7" — so labeling them by
 * position is a pure presentation change, not a migration. The week is
 * Sunday-first by position: slot 0 is always labeled Sunday, whatever was
 * already stored there.
 */
export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function weekdayLabel(dayIndex) {
  return WEEKDAY_NAMES[dayIndex] || `Day ${dayIndex + 1}`;
}

const LB_TO_KG = 0.45359237;

// ---------------------------------------------------------------- dates
// Deliberately local time, not toISOString(). An 8pm workout in Jerusalem is
// already "tomorrow" in UTC, which would file it under the wrong day.
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function sessionId(day, planId, dayIndex) {
  return `${day}__${planId}-${dayIndex}`;
}

/**
 * Sunday-based week id, e.g. "2026-W34" — an app-internal label, not the
 * ISO 8601 week number (which is defined Monday-first and would disagree
 * with the Sunday-anchored week this app now displays).
 */
export function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay()); // back to this week's Sunday
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const yearStartSunday = new Date(yearStart);
  yearStartSunday.setDate(yearStart.getDate() - yearStart.getDay());
  const week = Math.round((d - yearStartSunday) / (7 * 86400000)) + 1;
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function weekKeyFromDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  return weekKey(new Date(y, m - 1, d));
}

export function friendlyDate(day) {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = dateKey();
  if (day === today) return "Today";
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === dateKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** "2026-08" for a date — one photo slot per calendar month. */
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short" });
}

export function daysAgo(day) {
  const [y, m, d] = day.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  return Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()) - then) / 86400000
  );
}

// ---------------------------------------------------------------- weights
export function toKg(weight, unit, bodyweightKg = 0) {
  if (unit === "Body Wt.") return bodyweightKg || 0;
  const value = parseFloat(weight);
  if (Number.isNaN(value)) return 0;
  return unit === "LBS" ? value * LB_TO_KG : value;
}

export function roundToPlate(kg, step = 2.5) {
  if (!kg) return 0;
  return Math.round(kg / step) * step;
}

/** Smallest sensible jump for a unit. */
export function loadIncrement(unit) {
  if (unit === "LBS") return 5;
  return 2.5;
}

// ---------------------------------------------------------------- rep targets
/**
 * "8" -> {min:8,max:8}; "8-12" -> {min:8,max:12}; "AMRAP" or "" -> null.
 * Rep ranges are why `reps` is a text field, so this has to be tolerant.
 */
export function parseRepTarget(reps) {
  if (reps === null || reps === undefined) return null;
  const text = String(reps).trim();
  if (!text) return null;
  const range = text.match(/^(\d+)\s*[-–to]+\s*(\d+)$/i);
  if (range) {
    const min = parseInt(range[1], 10);
    const max = parseInt(range[2], 10);
    return { min: Math.min(min, max), max: Math.max(min, max) };
  }
  const single = text.match(/^(\d+)$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { min: n, max: n };
  }
  return null;
}

// ---------------------------------------------------------------- e1RM
/** Epley. Good to roughly 10 reps; beyond that it flatters you. */
export function e1rm(weightKg, reps) {
  const w = Number(weightKg) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

/** Best e1RM across a set of logged sets. */
export function bestE1rm(sets, bodyweightKg = 0) {
  return (sets || []).reduce((best, s) => {
    if (!s || !s.done) return best;
    const value = e1rm(toKg(s.weight, s.weightUnit, bodyweightKg), s.reps);
    return Math.max(best, value);
  }, 0);
}

// ---------------------------------------------------------------- warm-ups
/**
 * Ramp to a working weight. Skipped for light or bodyweight work — nobody
 * needs a warm-up ladder for 20kg curls.
 */
export function warmupSets(workingKg, unit = "KG") {
  if (!workingKg || workingKg < 40) return [];
  const step = unit === "LBS" ? 5 : 2.5;
  const bar = unit === "LBS" ? 45 : 20;
  const ramp = [
    { pct: 0.4, reps: 5 },
    { pct: 0.6, reps: 3 },
    { pct: 0.8, reps: 2 },
  ];
  const out = [];
  for (const { pct, reps } of ramp) {
    const weight = roundToPlate(workingKg * pct, step);
    if (weight < bar) continue;
    if (out.length && out[out.length - 1].weight === weight) continue;
    out.push({ weight, reps });
  }
  return out;
}

// ---------------------------------------------------------------- overload
/**
 * Double progression: clear the top of the rep range on every set, then add
 * weight. Fall short and you repeat. Returns null when there's nothing
 * meaningful to say (no history, no rep target, bodyweight work).
 */
export function suggestNextLoad(bankData, lastSets, unit = "KG") {
  if (!bankData || bankData.isHidden) return null;
  if (unit === "Body Wt.") return null;

  const done = (lastSets || []).filter((s) => s && s.done && Number(s.reps) > 0);
  if (done.length === 0) return null;

  const target = parseRepTarget(
    bankData.isAlternative ? bankData.altSets?.[0]?.reps : bankData.reps
  );
  if (!target) return null;

  const increment = loadIncrement(unit);
  const weights = done.map((s) => parseFloat(s.weight) || 0);
  const topWeight = Math.max(...weights);
  const clearedAll = done.every((s) => Number(s.reps) >= target.max);
  const missedBadly = done.some((s) => Number(s.reps) < target.min);

  if (clearedAll) {
    return {
      action: "increase",
      weight: topWeight + increment,
      reps: target.min,
      reason: `Cleared ${target.max} on every set — add ${increment}${unit}.`,
    };
  }
  if (missedBadly) {
    return {
      action: "hold",
      weight: topWeight,
      reps: target.min,
      reason: `Missed ${target.min} last time. Repeat this weight.`,
    };
  }
  return {
    action: "push",
    weight: topWeight,
    reps: target.max,
    reason: `Same weight — chase ${target.max} reps to earn the jump.`,
  };
}

// ---------------------------------------------------------------- volume
/** Tonnage (kg lifted) per muscle group for one week's sessions. */
export function volumeByMuscle(sessions, exerciseBank, week, bodyweightKg = 0) {
  const totals = {};
  Object.values(sessions || {}).forEach((session) => {
    if (!session?.date || weekKeyFromDay(session.date) !== week) return;
    Object.entries(session.entries || {}).forEach(([name, entry]) => {
      const groups = exerciseBank[name]?.muscleGroups || [];
      if (groups.length === 0) return;
      const tonnage = (entry.sets || []).reduce((sum, s) => {
        if (!s || !s.done) return sum;
        return sum + toKg(s.weight, s.weightUnit, bodyweightKg) * (Number(s.reps) || 0);
      }, 0);
      if (tonnage <= 0) return;
      // Split across groups so a compound doesn't triple-count.
      const share = tonnage / groups.length;
      groups.forEach((g) => {
        totals[g] = (totals[g] || 0) + share;
      });
    });
  });
  return totals;
}

/** Working sets per muscle group — the number most programs actually target. */
export function setsByMuscle(sessions, exerciseBank, week) {
  const totals = {};
  Object.values(sessions || {}).forEach((session) => {
    if (!session?.date || weekKeyFromDay(session.date) !== week) return;
    Object.entries(session.entries || {}).forEach(([name, entry]) => {
      const groups = exerciseBank[name]?.muscleGroups || [];
      const count = (entry.sets || []).filter((s) => s && s.done).length;
      if (count === 0) return;
      groups.forEach((g) => {
        totals[g] = (totals[g] || 0) + count;
      });
    });
  });
  return totals;
}

/** e1RM per session for one exercise, oldest first — the chart's input. */
export function exerciseHistory(sessions, exerciseName, bodyweightKg = 0) {
  return Object.values(sessions || {})
    .filter((s) => s?.entries?.[exerciseName])
    .map((s) => {
      const sets = s.entries[exerciseName].sets || [];
      const doneSets = sets.filter((x) => x && x.done);
      return {
        date: s.date,
        e1rm: bestE1rm(sets, bodyweightKg),
        sets: doneSets.length,
        tonnage: doneSets.reduce(
          (sum, x) => sum + toKg(x.weight, x.weightUnit, bodyweightKg) * (Number(x.reps) || 0),
          0
        ),
        topSet: doneSets.reduce(
          (best, x) =>
            !best || (parseFloat(x.weight) || 0) > (parseFloat(best.weight) || 0) ? x : best,
          null
        ),
      };
    })
    .filter((point) => point.sets > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------- dashboard
/** Rough minutes for a plan day — set count times its own rest, plus ~40s of work per set. */
export function estimateMinutes(day, exerciseBank) {
  let seconds = 0;
  (day?.exercises || []).forEach((raw) => {
    if (isRestEntry(raw)) return;
    const bankData = exerciseBank[cleanName(raw)];
    if (bankData?.isHidden) return;
    const count = setCountFor(bankData);
    seconds += count * ((parseInt(bankData?.restSeconds, 10) || 90) + 40);
  });
  return Math.round(seconds / 60);
}

/** The 7 dateKey strings, Sunday through Saturday, for the week containing `date`. */
export function weekDates(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return dateKey(day);
  });
}

/**
 * Per-calendar-day status for the Sun-Sat strip of one plan. A plan's rows
 * are an ordered weekly checklist, not fixed weekdays — nothing pins "Day 1"
 * to Sunday — so this reports whether *any* row of the plan was finished on
 * each real date, rather than trying to line up dayIndex with weekday.
 */
export function weekStrip(plans, sessions, planId) {
  const dates = weekDates();
  const today = dateKey();
  const sessionList = Object.values(sessions || {}).filter(
    (s) => Number(s?.planId) === Number(planId)
  );
  return dates.map((day) => {
    const daySessions = sessionList.filter((s) => s?.date === day);
    return {
      date: day,
      isToday: day === today,
      isPast: day < today,
      isRest: (plans[planId] || []).length === 0,
      done: daySessions.some((s) => !!s.finishedAt),
      inProgress: daySessions.some((s) => !s.finishedAt),
    };
  });
}

/**
 * Consecutive Sunday-Saturday weeks, ending at the current or most recent
 * finished week, with at least one finished session. The in-progress
 * current week never breaks the streak before it's over — it just isn't
 * counted until it has a finished session of its own.
 */
export function computeStreak(sessions) {
  const finishedWeeks = new Set(
    Object.values(sessions || {})
      .filter((s) => s?.finishedAt && s?.date)
      .map((s) => weekKeyFromDay(s.date))
  );

  const cursor = new Date();
  let checking = weekKey(cursor);
  if (!finishedWeeks.has(checking)) {
    cursor.setDate(cursor.getDate() - 7);
    checking = weekKey(cursor);
  }

  let streak = 0;
  while (finishedWeeks.has(checking)) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
    checking = weekKey(cursor);
  }
  return streak;
}

/** Heaviest single set, best single-session tonnage, and average RPE for one exercise. */
export function liftStats(sessions, exerciseName, bodyweightKg = 0) {
  let heaviestWeight = 0;
  let heaviestReps = 0;
  let bestVolume = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  Object.values(sessions || {}).forEach((session) => {
    const sets = (session?.entries?.[exerciseName]?.sets || []).filter(
      (s) => s && s.done
    );
    if (sets.length === 0) return;

    let sessionVolume = 0;
    sets.forEach((s) => {
      const weight = parseFloat(s.weight) || 0;
      if (weight > heaviestWeight) {
        heaviestWeight = weight;
        heaviestReps = Number(s.reps) || 0;
      }
      sessionVolume += toKg(s.weight, s.weightUnit, bodyweightKg) * (Number(s.reps) || 0);
      if (s.rpe) {
        rpeSum += Number(s.rpe);
        rpeCount++;
      }
    });
    bestVolume = Math.max(bestVolume, sessionVolume);
  });

  return {
    heaviestWeight,
    heaviestReps,
    bestVolume: Math.round(bestVolume),
    avgRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
  };
}

/** Total tonnage per week for the last `weeks` Sun-Sat weeks, oldest first. */
export function weeklyVolumeSeries(sessions, bodyweightKg = 0, weeks = 12) {
  const byWeek = {};
  Object.values(sessions || {}).forEach((session) => {
    if (!session?.date) return;
    const week = weekKeyFromDay(session.date);
    const doneSets = Object.values(session.entries || {}).flatMap((e) =>
      (e.sets || []).filter((s) => s && s.done)
    );
    const tonnage = doneSets.reduce(
      (sum, s) => sum + toKg(s.weight, s.weightUnit, bodyweightKg) * (Number(s.reps) || 0),
      0
    );
    byWeek[week] = (byWeek[week] || 0) + tonnage;
  });

  const series = [];
  const cursor = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(d.getDate() - i * 7);
    const week = weekKey(d);
    series.push({ week, tonnage: Math.round(byWeek[week] || 0) });
  }
  return series;
}

/** Sunday=0..Saturday=6 index for a date — plan rows are pinned to weekdays by position. */
export function todayDayIndex(date = new Date()) {
  return date.getDay();
}

/** Total logged sets and tonnage across every session in one Sun-Sat week. */
export function weekSummary(sessions, week, bodyweightKg = 0) {
  let sets = 0;
  let tonnageKg = 0;
  Object.values(sessions || {}).forEach((session) => {
    if (!session?.date || weekKeyFromDay(session.date) !== week) return;
    const doneSets = Object.values(session.entries || {}).flatMap((e) =>
      (e.sets || []).filter((s) => s && s.done)
    );
    sets += doneSets.length;
    tonnageKg += doneSets.reduce(
      (sum, s) => sum + toKg(s.weight, s.weightUnit, bodyweightKg) * (Number(s.reps) || 0),
      0
    );
  });
  return { sets, tonnageKg: Math.round(tonnageKg) };
}

// ---------------------------------------------------------------- the round
/*
 * Everything derived from the plan cursor, in ONE call.
 *
 * The Today ring, the caption beside it, the day strip, the day-name labels
 * and the Program screen's segment bar all read this object. That is the
 * point: the single most common bug in the last version was a caption
 * disagreeing with the bar above it, and it happened because two screens each
 * did their own arithmetic. If a number appears next to a ring, both come
 * from here.
 */
export function roundProgress(program, days) {
  const list = days || [];
  const total = list.length;
  const round = Math.max(1, program?.cursor?.round ?? 1);
  const dayIndex = total ? Math.min(Math.max(0, program?.cursor?.dayIndex ?? 0), total - 1) : 0;

  // Days before the cursor are the ones done this round. The cursor IS the
  // progress — nothing here counts sessions, because time never moves it.
  const done = dayIndex;
  const progress = total ? done / total : 0;

  return {
    total,
    done,
    dayIndex,
    round,
    position: total ? dayIndex + 1 : 0,
    progress,
    dayLabel: total ? `Day ${dayIndex + 1} of ${total}` : "No days in this plan",
    roundLabel: `round ${round}`,
    countLabel: `${done} of ${total}`,
    pills: list.map((day, index) => ({
      id: day.id,
      name: day.name,
      state: index < dayIndex ? "done" : index === dayIndex ? "next" : "upcoming",
    })),
    // Six pills is the most that fits at 390px; past that it becomes one bar
    // plus the numeral (§5.5).
    collapsed: total > 6,
    a11y: total ? `Day ${dayIndex + 1} of ${total}, round ${round}` : "No days in this plan",
  };
}

/**
 * The hero's "5 movements · 17 sets · about 52 min" line. Rounded to 5 minutes
 * because a one-minute estimate for a gym session is false precision.
 */
export function routineSummary(routine, defaultRestSeconds = 90) {
  const movements = routine?.movements || [];
  const sets = movements.reduce((sum, m) => sum + Math.max(1, Number(m.sets) || 0), 0);
  // Work time is ~40s a set; rest is the user's own default.
  const minutes = Math.round((sets * (defaultRestSeconds + 40)) / 60 / 5) * 5;
  return {
    movements: movements.length,
    sets,
    minutes,
    label: `${movements.length} movement${movements.length === 1 ? "" : "s"} · ${sets} set${
      sets === 1 ? "" : "s"
    } · about ${minutes} min`,
  };
}

/**
 * Tonnage over an arbitrary set of sessions — Σ (weight × reps) over completed
 * sets only. Round and week rollups both call this so they can never disagree.
 */
export function tonnageOf(sessionList, bodyweightKg = 0) {
  return (sessionList || []).reduce((total, session) => {
    const doneSets = Object.values(session?.entries || {}).flatMap((e) =>
      (e.sets || []).filter((s) => s && s.done)
    );
    return (
      total +
      doneSets.reduce(
        (sum, s) => sum + toKg(s.weight, s.weightUnit, bodyweightKg) * (Number(s.reps) || 0),
        0
      )
    );
  }, 0);
}

/** Tonnes to one decimal above 1t, kilograms below it (§10.3). */
export function formatTonnage(kg) {
  const value = Number(kg) || 0;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}t`;
  return `${Math.round(value)} kg`;
}

// ------------------------------------------------------------- new bests
/**
 * A new best is a weight for a GIVEN REP COUNT that beats everything before it
 * for that movement.
 *
 * Detected once, at save time, and stored on the session — so the finish
 * screen and the record book can never reach different answers about the same
 * lift, which is exactly what §10.2 is guarding against.
 */
export function detectNewBests(sessions, session, sessionId) {
  // Best weight per movement per rep count, across every OTHER session.
  const history = {};
  Object.entries(sessions || {}).forEach(([id, other]) => {
    if (id === sessionId || !other?.date) return;
    Object.entries(other.entries || {}).forEach(([name, entry]) => {
      (entry.sets || []).forEach((set) => {
        if (!set?.done) return;
        const reps = Number(set.reps) || 0;
        const kg = parseFloat(set.weight) || 0;
        if (!reps || !kg) return;
        const key = `${name}|${reps}`;
        history[key] = Math.max(history[key] || 0, kg);
      });
    });
  });

  const bests = {};
  Object.entries(session?.entries || {}).forEach(([name, entry]) => {
    (entry.sets || []).forEach((set) => {
      if (!set?.done) return;
      const reps = Number(set.reps) || 0;
      const kg = parseFloat(set.weight) || 0;
      if (!reps || !kg) return;
      const key = `${name}|${reps}`;
      // A first-ever attempt at a rep count is not a "new best" — there was
      // nothing to beat, and calling it one would cheapen the row.
      if (history[key] === undefined) return;
      if (kg <= history[key]) return;
      if (!bests[key] || kg > bests[key].weightKg) {
        bests[key] = { movementId: name, reps, weightKg: kg };
      }
    });
  });

  return Object.values(bests);
}

/** Sessions belonging to one round of the plan. */
export function sessionsInRound(sessions, roundNumber) {
  return Object.values(sessions || {}).filter(
    (s) => s?.finishedAt && Number(s.roundNumber) === Number(roundNumber)
  );
}

/** The 8-week rolling window the charts and their captions both read. */
export function eightWeekSeries(sessions, bodyweightKg = 0, weeks = 8) {
  const series = weeklyVolumeSeries(sessions, bodyweightKg, weeks);
  const last = series[series.length - 1]?.tonnage || 0;
  const prev = series[series.length - 2]?.tonnage || 0;
  // The header delta MUST come from these same two numbers (§8J).
  const deltaPct = prev > 0 ? Math.round(((last - prev) / prev) * 100) : null;
  return {
    series: series.map((point) => ({ key: point.week, value: point.tonnage })),
    thisWeekKg: last,
    lastWeekKg: prev,
    deltaPct,
  };
}
