// Training maths and date helpers. Pure functions — no React, no Firebase.

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

/** Monday-based week id, e.g. "2026-W34". Used to group volume. */
export function weekKey(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayNum + 3); // nearest Thursday
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      (d - firstThursday) / 86400000 / 7 -
        ((firstThursday.getDay() + 6) % 7) / 7
    );
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
