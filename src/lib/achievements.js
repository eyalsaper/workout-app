// Achievements: computed standing, not awarded badges. Everything here is
// pure and re-derived from session history each time — nothing is stored
// except the handful of closed-chapter summaries (WorkoutContext handles
// that write; this file never touches Firebase).

import { e1rm, toKg, dateKey, weekKey, weekKeyFromDay } from "./training";

// Approximate e1RM-to-bodyweight ratios, split by sex — a real ladder to
// climb, not a lab-grade standard. The male column is the app's original
// estimate; the female column scales it down (roughly 80% for the
// posterior-chain-heavy squat/deadlift, roughly 70% for the press
// movements) rather than coming from a second independently sourced table,
// so treat both as approximate. Nothing here is shown until the account
// has a sex set — this app never guesses at that.
export const STRENGTH_STANDARDS_BY_SEX = {
  male: {
    Squat: { novice: 0.75, intermediate: 1.25, advanced: 1.75, elite: 2.25 },
    "Bench Press": { novice: 0.5, intermediate: 0.9, advanced: 1.25, elite: 1.75 },
    Deadlift: { novice: 1.0, intermediate: 1.5, advanced: 2.0, elite: 2.5 },
    "Overhead Press": { novice: 0.35, intermediate: 0.55, advanced: 0.8, elite: 1.1 },
  },
  female: {
    Squat: { novice: 0.6, intermediate: 1.0, advanced: 1.4, elite: 1.8 },
    "Bench Press": { novice: 0.35, intermediate: 0.6, advanced: 0.8, elite: 1.15 },
    Deadlift: { novice: 0.8, intermediate: 1.2, advanced: 1.6, elite: 2.0 },
    "Overhead Press": { novice: 0.25, intermediate: 0.35, advanced: 0.5, elite: 0.7 },
  },
};

function standardsTable(liftName, sex) {
  return STRENGTH_STANDARDS_BY_SEX[sex]?.[liftName] || null;
}

export const RANKS = ["Novice", "Intermediate", "Advanced", "Elite"];
const RANK_KEYS = ["novice", "intermediate", "advanced", "elite"];

// Only lifts with a natural "times your bodyweight" phrasing get this ledger
// mechanic — it would read strangely for an isolation exercise.
const LIFT_VERBS = { Squat: "Squatted", "Bench Press": "Benched", Deadlift: "Deadlifted" };
const BODYWEIGHT_MULTIPLES = [1, 1.5, 2, 2.5];

function weightLabel(weight, unit) {
  if (unit === "Body Wt.") return "bodyweight";
  if (unit === "LBS") return `${weight} lb`;
  return `${weight} kg`;
}

/** Bodyweight in kg on or before `day`, falling back to the current value. */
export function bodyweightAt(day, bodyweightLog, fallbackKg) {
  const dates = Object.keys(bodyweightLog || {})
    .filter((d) => d <= day)
    .sort();
  const nearest = dates[dates.length - 1];
  return (nearest && parseFloat(bodyweightLog[nearest])) || fallbackKg || 0;
}

/** Where a ratio sits on one lift's ladder: the rank crossed, and what's next. */
export function standingForRatio(ratio, table) {
  let idx = -1;
  RANK_KEYS.forEach((key, i) => {
    if (ratio >= table[key]) idx = i;
  });
  const nextKey = RANK_KEYS[idx + 1];
  return {
    rankIndex: idx,
    rank: idx >= 0 ? RANKS[idx] : null,
    nextRank: nextKey ? RANKS[idx + 1] : null,
    nextRatio: nextKey ? table[nextKey] : null,
  };
}

/** Current standing for one lift: best e1RM ever, against today's bodyweight. */
export function getStanding(liftName, sessions, bodyweightKg, sex) {
  const table = standardsTable(liftName, sex);
  if (!table || !bodyweightKg) return null;

  let bestE1rm = 0;
  Object.values(sessions || {}).forEach((s) => {
    (s?.entries?.[liftName]?.sets || []).forEach((set) => {
      if (!set || !set.done) return;
      const value = e1rm(toKg(set.weight, set.weightUnit, bodyweightKg), set.reps);
      if (value > bestE1rm) bestE1rm = value;
    });
  });
  if (bestE1rm <= 0) return null;

  const ratio = bestE1rm / bodyweightKg;
  const standing = standingForRatio(ratio, table);
  return {
    liftName,
    e1rmKg: bestE1rm,
    ratio,
    ...standing,
    kgToNext: standing.nextRatio ? Math.max(0, Math.round(standing.nextRatio * bodyweightKg - bestE1rm)) : null,
  };
}

/** Standing for every lift with a standards table and some history, strongest first. */
export function getAllStandings(sessions, bodyweightKg, sex) {
  if (!sex) return [];
  return Object.keys(STRENGTH_STANDARDS_BY_SEX[sex] || {})
    .map((name) => getStanding(name, sessions, bodyweightKg, sex))
    .filter(Boolean)
    .sort((a, b) => b.rankIndex - a.rankIndex || b.ratio - a.ratio);
}

/** The next un-crossed "N× bodyweight" goal for a lift, if it has one. */
export function nextBodyweightMultipleGoal(liftName, ratio, bodyweightKg) {
  if (!LIFT_VERBS[liftName]) return null;
  const next = BODYWEIGHT_MULTIPLES.find((m) => m > ratio);
  if (!next) return null;
  return { multiple: next, kgAway: Math.max(0, Math.round(next * bodyweightKg - ratio * bodyweightKg)) };
}

// ---------------------------------------------------------------- chapters

const CHAPTER_TITLES = ["Foundation", "Building", "Momentum", "Grinding", "Peak", "Steady state"];
const CHAPTER_WEEKS = 12;

function daysBetween(dayA, dayB) {
  const [ya, ma, da] = dayA.split("-").map(Number);
  const [yb, mb, db] = dayB.split("-").map(Number);
  return Math.round((new Date(yb, mb - 1, db) - new Date(ya, ma - 1, da)) / 86400000);
}

function firstSessionDate(sessions) {
  const dates = Object.values(sessions || {})
    .map((s) => s?.date)
    .filter(Boolean)
    .sort();
  return dates[0] || null;
}

/** Which 12-week chapter "today" falls in, and how far into it. */
export function getChapterInfo(sessions, today = dateKey()) {
  const start = firstSessionDate(sessions);
  if (!start) return null;
  const weeksElapsed = Math.max(0, Math.floor(daysBetween(start, today) / 7));
  const chapterIndex = Math.floor(weeksElapsed / CHAPTER_WEEKS);
  const weekInChapter = (weeksElapsed % CHAPTER_WEEKS) + 1;
  return {
    number: chapterIndex + 1,
    title: CHAPTER_TITLES[chapterIndex % CHAPTER_TITLES.length],
    weekInChapter,
    weeksLeft: CHAPTER_WEEKS - weekInChapter,
  };
}

/** The [from, to) dateKey range chapter `number` (1-based) covers. */
export function chapterDateRange(sessions, number) {
  const start = firstSessionDate(sessions);
  if (!start) return null;
  const [y, m, d] = start.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const from = new Date(base);
  from.setDate(from.getDate() + (number - 1) * CHAPTER_WEEKS * 7);
  const to = new Date(base);
  to.setDate(to.getDate() + number * CHAPTER_WEEKS * 7);
  return { from: dateKey(from), to: dateKey(to) };
}

/** A short, factual summary of one chapter — real counts, no invented praise. */
export function summarizeChapter(sessions, ledger, range, bodyweightKg) {
  let sessionCount = 0;
  let tonnageKg = 0;
  Object.values(sessions || {}).forEach((s) => {
    if (!s?.finishedAt || !s?.date || s.date < range.from || s.date >= range.to) return;
    sessionCount++;
    const doneSets = Object.values(s.entries || {}).flatMap((e) => (e.sets || []).filter((x) => x && x.done));
    tonnageKg += doneSets.reduce(
      (sum, x) => sum + toKg(x.weight, x.weightUnit, bodyweightKg) * (Number(x.reps) || 0),
      0
    );
  });
  if (sessionCount === 0) return "A quiet chapter — nothing logged.";
  const milestoneCount = ledger.filter((e) => e.date >= range.from && e.date < range.to).length;
  return `${sessionCount} session${sessionCount === 1 ? "" : "s"} logged, ${milestoneCount} milestone${
    milestoneCount === 1 ? "" : "s"
  } written in, ${Math.round(tonnageKg).toLocaleString()} kg lifted in total.`;
}

// ---------------------------------------------------------------- the ledger

const SESSION_MILESTONES = [1, 10, 25, 50, 100, 250, 500];

const STREAK_MILESTONES = [4, 8, 12, 26, 52];

function parseDay(day) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Every first-ever thing the account has done, dated. Replays finished
 * sessions in order so each entry lands on the date it actually happened.
 * Pure and re-derived each call — nothing here is persisted. `sex` gates
 * the rank and bodyweight-multiple mechanics only — without one set, PRs,
 * session counts, and streaks still write in, just not standards.
 */
export function buildLedger(sessions, bodyweightLog, fallbackBodyweightKg, sex) {
  const finished = Object.values(sessions || {})
    .filter((s) => s?.finishedAt && s?.date)
    .sort((a, b) => a.date.localeCompare(b.date) || a.finishedAt - b.finishedAt);

  const entries = [];
  const bestE1rmByLift = {};
  const bestRatioByStandard = {};
  const crossedMultiples = {};
  let finishedCount = 0;

  finished.forEach((session) => {
    finishedCount++;
    if (SESSION_MILESTONES.includes(finishedCount)) {
      entries.push({
        date: session.date,
        text: `${finishedCount} session${finishedCount === 1 ? "" : "s"} logged`,
        tag: "habit",
        kind: "session-count",
      });
    }

    const bodyweightKg = bodyweightAt(session.date, bodyweightLog, fallbackBodyweightKg);

    Object.entries(session.entries || {}).forEach(([name, entry]) => {
      const doneSets = (entry.sets || []).filter((s) => s && s.done);
      if (doneSets.length === 0) return;

      let sessionBest = null;
      doneSets.forEach((s) => {
        const value = e1rm(toKg(s.weight, s.weightUnit, bodyweightKg), s.reps);
        if (value > 0 && (!sessionBest || value > sessionBest.value)) {
          sessionBest = { value, weight: s.weight, unit: s.weightUnit, reps: s.reps };
        }
      });
      if (!sessionBest) return;

      const priorBest = bestE1rmByLift[name] || 0;
      if (priorBest > 0 && sessionBest.value > priorBest * 1.001) {
        entries.push({
          date: session.date,
          text: `New best on ${name}: ${weightLabel(sessionBest.weight, sessionBest.unit)} × ${sessionBest.reps}`,
          tag: "PR",
          kind: "pr",
        });
      }
      bestE1rmByLift[name] = Math.max(priorBest, sessionBest.value);

      const table = standardsTable(name, sex);
      if (!table || !bodyweightKg) return;

      const ratio = bestE1rmByLift[name] / bodyweightKg;
      const priorRatio = bestRatioByStandard[name] || 0;
      const priorStanding = standingForRatio(priorRatio, table);
      const standing = standingForRatio(ratio, table);
      if (standing.rankIndex > priorStanding.rankIndex) {
        for (let i = priorStanding.rankIndex + 1; i <= standing.rankIndex; i++) {
          entries.push({
            date: session.date,
            text: `${name} reached ${RANKS[i]}`,
            tag: "rank",
            kind: "rank",
            liftName: name,
            rankIndex: i,
          });
        }
      }
      bestRatioByStandard[name] = Math.max(priorRatio, ratio);

      const verb = LIFT_VERBS[name];
      if (verb) {
        BODYWEIGHT_MULTIPLES.forEach((mult) => {
          const key = `${name}_${mult}`;
          if (!crossedMultiples[key] && ratio >= mult) {
            crossedMultiples[key] = true;
            entries.push({
              date: session.date,
              text: `${verb} your bodyweight × ${mult}`,
              tag: "rank",
              kind: "bodyweight-multiple",
              liftName: name,
            });
          }
        });
      }
    });
  });

  // Consecutive Sunday-Saturday weeks with at least one finished session,
  // walked forward so each streak milestone lands on the date it was
  // actually reached, not recomputed backward from today.
  if (finished.length > 0) {
    const finishedWeeks = new Set(finished.map((s) => weekKeyFromDay(s.date)));
    const lastDateInWeek = {};
    finished.forEach((s) => {
      const wk = weekKeyFromDay(s.date);
      if (!lastDateInWeek[wk] || s.date > lastDateInWeek[wk]) lastDateInWeek[wk] = s.date;
    });

    let run = 0;
    const hit = new Set();
    const cursor = parseDay(finished[0].date);
    const last = parseDay(finished[finished.length - 1].date);
    while (cursor <= last) {
      const wk = weekKey(cursor);
      if (finishedWeeks.has(wk)) {
        run++;
        if (STREAK_MILESTONES.includes(run) && !hit.has(run)) {
          hit.add(run);
          entries.push({
            date: lastDateInWeek[wk],
            text: `${run} week${run === 1 ? "" : "s"} without missing a planned session`,
            tag: "habit",
            kind: "streak",
          });
        }
      } else {
        run = 0;
      }
      cursor.setDate(cursor.getDate() + 7);
    }
  }

  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * The one rank crossing (if any) to show as a full-screen milestone for a
 * just-finished session — "at most one milestone. Others queue to the
 * ledger silently." Picks the highest rank if more than one lift crossed
 * the same day.
 */
export function findSessionMilestone(ledger, sessionDate) {
  const rankEntries = ledger.filter((e) => e.date === sessionDate && e.kind === "rank");
  if (rankEntries.length === 0) return null;
  return rankEntries.sort((a, b) => b.rankIndex - a.rankIndex)[0];
}
