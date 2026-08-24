// Turns a free-text description into a real week plan, using only the
// exercise library's own metadata (pattern, muscle groups, equipment) —
// keyword matching, not an AI call. Pure functions, no React, no Firebase.

import {
  EXERCISE_LIBRARY,
  LIBRARY_BY_NAME,
  libraryEntry,
  categoryFor,
  equipmentFor,
} from "./exerciseLibrary";

// ---------------------------------------------------------------- parsing

const GOAL_KEYWORDS = {
  strength: [/strength/, /stronger/, /powerlift/, /\b1rm\b/, /get strong/, /max(imal)? (lift|strength)/],
  hypertrophy: [/muscle/, /hypertrophy/, /\bsize\b/, /\bbulk/, /\bgrow/, /bigger/, /\bmass\b/, /aesthetic/, /bodybuild/],
  fatloss: [/fat loss/, /lose weight/, /\bcut(ting)?\b/, /\blean/, /\btone/, /endurance/, /conditioning/, /shred/],
};

export function parseGoal(text) {
  const t = text.toLowerCase();
  for (const [goal, patterns] of Object.entries(GOAL_KEYWORDS)) {
    if (patterns.some((re) => re.test(t))) return goal;
  }
  return "general";
}

const MUSCLE_KEYWORDS = {
  Chest: [/chest/, /\bpecs?\b/],
  Back: [/\bback\b/, /\blats?\b/],
  Shoulders: [/shoulders?/, /\bdelts?\b/],
  Biceps: [/biceps?/],
  Triceps: [/triceps?/],
  Quads: [/quads?/, /quadriceps/, /thighs?/],
  Hamstrings: [/hamstrings?/],
  Glutes: [/glutes?/, /\bbutt\b/],
  Calves: [/calves|calf/],
  Core: [/\bcore\b/, /\babs\b/, /abdominal/],
};

const GROUP_ALIASES = {
  arms: ["Biceps", "Triceps"],
  legs: ["Quads", "Hamstrings", "Glutes", "Calves"],
  upper: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
  lower: ["Quads", "Hamstrings", "Glutes", "Calves"],
};

export function parseMuscles(text) {
  const t = text.toLowerCase();
  const found = new Set();
  Object.entries(MUSCLE_KEYWORDS).forEach(([muscle, patterns]) => {
    if (patterns.some((re) => re.test(t))) found.add(muscle);
  });
  Object.entries(GROUP_ALIASES).forEach(([word, muscles]) => {
    if (new RegExp(`\\b${word}\\b`).test(t)) muscles.forEach((m) => found.add(m));
  });
  return found;
}

const EQUIPMENT_KEYWORDS = {
  Barbell: [/barbell/],
  Dumbbell: [/dumbbells?/, /\bdb\b/],
  Cable: [/cables?/, /\bpulley\b/],
  Machine: [/machines?/],
  Bodyweight: [/bodyweight/, /body weight/, /no equipment/, /calisthenics/, /home workout/],
};

export function parseEquipment(text) {
  const t = text.toLowerCase();
  const found = new Set();
  Object.entries(EQUIPMENT_KEYWORDS).forEach(([eq, patterns]) => {
    if (patterns.some((re) => re.test(t))) found.add(eq);
  });
  return found;
}

const NUMBER_WORDS = { once: 1, one: 1, twice: 2, two: 2, three: 3, four: 4, five: 5, six: 6 };

/** "3 days a week", "three times a week", "train 4x" — a plain day count, or null. */
export function parseDaysPerWeek(text) {
  const t = text.toLowerCase();
  const digit = t.match(/\b([1-6])\s*(?:days?|x|times?)\b/);
  if (digit) return parseInt(digit[1], 10);
  const hasDayWord = /\b(day|days|time|times)\b/.test(t);
  if (hasDayWord) {
    for (const [word, n] of Object.entries(NUMBER_WORDS)) {
      if (new RegExp(`\\b${word}\\b`).test(t)) return n;
    }
  }
  return null;
}

// Common shorthand that doesn't literally match a library name.
const EXERCISE_ALIASES = {
  ohp: "Overhead Press",
  squat: "Back Squat",
  squats: "Back Squat",
  deadlifts: "Deadlift",
  bench: "Bench Press",
  pullups: "Pull-Up",
  "pull ups": "Pull-Up",
  chinups: "Chin-Up",
  "chin ups": "Chin-Up",
  pushups: "Push-Up",
  "push ups": "Push-Up",
  curls: "Barbell Curl",
  rows: "Barbell Row",
  lunges: "Walking Lunge",
};

function normalize(s) {
  return ` ${s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()} `;
}

// A word within this many characters before a match flips it from a
// request to a exclusion — "avoid heavy lunges" must not guarantee lunges.
const NEGATION_WINDOW = 18;
const NEGATION_WORDS = ["avoid", "no ", "not ", "n t ", "skip", "without", "except", "excluding", "cant", "cannot", "dont"];

function isNegated(t, matchIndex) {
  const window = t.slice(Math.max(0, matchIndex - NEGATION_WINDOW), matchIndex);
  return NEGATION_WORDS.some((w) => window.includes(w));
}

/**
 * Specific lifts named in the text, matched against the library plus common
 * shorthand. Split into what to guarantee and what to keep out entirely —
 * "no lunges, bad knee" excludes rather than includes.
 */
export function parseExplicitExercises(text) {
  const t = normalize(text);
  const entries = [
    ...EXERCISE_LIBRARY.map((item) => [item.name, item.name]),
    ...Object.entries(EXERCISE_ALIASES),
  ].sort((a, b) => b[0].length - a[0].length);

  const included = [];
  const excluded = [];
  const seen = new Set();
  entries.forEach(([alias, canonical]) => {
    if (seen.has(canonical)) return;
    const needle = normalize(alias);
    const index = t.indexOf(needle);
    if (index === -1) return;
    seen.add(canonical);
    if (isNegated(t, index)) excluded.push(canonical);
    else included.push(canonical);
  });
  return { included, excluded };
}

// ---------------------------------------------------------------- structure

const SPREAD = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
};

const SPLIT_TEMPLATES = {
  1: ["Full body"],
  2: ["Full body", "Full body"],
  3: ["Full body", "Full body", "Full body"],
  4: ["Upper", "Lower", "Upper", "Lower"],
  5: ["Push", "Pull", "Legs", "Upper", "Lower"],
  6: ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
};

const UPPER_MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps"];
const LOWER_MUSCLES = ["Quads", "Hamstrings", "Glutes", "Calves"];

/** Skips leg days for an upper-only request, and vice versa. */
function biasSplit(template, muscles) {
  if (!muscles.size) return template;
  const wantsUpper = UPPER_MUSCLES.some((m) => muscles.has(m));
  const wantsLower = LOWER_MUSCLES.some((m) => muscles.has(m));
  if (wantsUpper && !wantsLower) return template.map((d) => (d === "Lower" || d === "Legs" ? "Upper" : d));
  if (wantsLower && !wantsUpper) return template.map((d) => (d === "Upper" || d === "Push" || d === "Pull" ? "Legs" : d));
  return template;
}

// Each day is a list of slots; each slot is a list of patterns tried in
// order until one has an available exercise.
const DAY_SLOTS = {
  "Full body": [["squat"], ["horizontal-push"], ["horizontal-pull", "vertical-pull"], ["hinge"], ["plank", "crunch"]],
  Upper: [
    ["horizontal-push"],
    ["vertical-push"],
    ["horizontal-pull"],
    ["vertical-pull"],
    ["curl"],
    ["tricep-extension", "lateral-raise"],
  ],
  Lower: [["squat"], ["hinge"], ["lunge"], ["calf-raise", "hip-thrust"]],
  Push: [
    ["horizontal-push"],
    ["vertical-push"],
    ["horizontal-push", "vertical-push"],
    ["tricep-extension"],
    ["lateral-raise"],
  ],
  Pull: [["vertical-pull"], ["horizontal-pull"], ["horizontal-pull", "vertical-pull"], ["curl"], ["lateral-raise"]],
  Legs: [["squat"], ["hinge"], ["lunge"], ["calf-raise"], ["hip-thrust"]],
};

// Most standard/compound lift per pattern, tried first when available.
const PRIORITY_BY_PATTERN = {
  squat: ["Back Squat", "Front Squat", "Leg Press", "Goblet Squat", "Hack Squat", "Box Squat", "Leg Extension"],
  hinge: ["Deadlift", "Romanian Deadlift", "Trap Bar Deadlift", "Sumo Deadlift", "Good Morning", "Kettlebell Swing"],
  "horizontal-push": ["Bench Press", "Incline Bench Press", "Dumbbell Bench Press", "Machine Chest Press", "Push-Up", "Dip", "Cable Fly"],
  "vertical-push": ["Overhead Press", "Seated Dumbbell Press", "Arnold Press", "Landmine Press", "Pike Push-Up"],
  "horizontal-pull": ["Barbell Row", "Seated Cable Row", "Dumbbell Row", "Chest Supported Row", "Inverted Row", "Face Pull"],
  "vertical-pull": ["Pull-Up", "Lat Pulldown", "Chin-Up", "Straight Arm Pulldown"],
  lunge: ["Bulgarian Split Squat", "Walking Lunge", "Reverse Lunge", "Step-Up"],
  curl: ["Barbell Curl", "Dumbbell Curl", "Cable Curl", "Hammer Curl", "Incline Dumbbell Curl", "Preacher Curl"],
  "tricep-extension": ["Tricep Pushdown", "Close Grip Bench Press", "Skull Crusher", "Overhead Tricep Extension", "Tricep Kickback"],
  "lateral-raise": ["Lateral Raise", "Cable Lateral Raise", "Rear Delt Raise", "Upright Row", "Shrug"],
  "hip-thrust": ["Hip Thrust", "Glute Bridge", "Cable Pull Through", "Leg Curl", "Nordic Curl"],
  "calf-raise": ["Standing Calf Raise", "Seated Calf Raise"],
  plank: ["Plank", "Side Plank", "Ab Wheel Rollout", "Farmer's Carry"],
  crunch: ["Hanging Leg Raise", "Cable Crunch", "Crunch", "Dead Bug"],
};

// Compound patterns first, then accessories — a stand-in for "popularity"
// with no real usage data to rank by. Every library exercise appears once.
const PATTERN_POPULARITY_ORDER = [
  "squat",
  "hinge",
  "horizontal-push",
  "vertical-push",
  "horizontal-pull",
  "vertical-pull",
  "lunge",
  "hip-thrust",
  "curl",
  "tricep-extension",
  "lateral-raise",
  "calf-raise",
  "plank",
  "crunch",
];

export const POPULAR_EXERCISES = (() => {
  const seen = new Set();
  const ordered = [];
  const add = (name) => {
    if (!seen.has(name)) {
      seen.add(name);
      ordered.push(name);
    }
  };
  PATTERN_POPULARITY_ORDER.forEach((pattern) => {
    (PRIORITY_BY_PATTERN[pattern] || []).forEach(add);
    EXERCISE_LIBRARY.filter((item) => item.pattern === pattern).forEach((item) => add(item.name));
  });
  EXERCISE_LIBRARY.forEach((item) => add(item.name));
  return ordered;
})();

const COMPOUND_PATTERNS = ["squat", "hinge", "horizontal-push", "vertical-push", "horizontal-pull", "vertical-pull"];

function repsForGoal(pattern, goal, defaultReps) {
  if (!COMPOUND_PATTERNS.includes(pattern)) return defaultReps;
  if (goal === "strength") return "4-6";
  if (goal === "hypertrophy") return "8-12";
  return defaultReps;
}

function setsForGoal(pattern, goal, defaultSets) {
  if (goal === "strength" && COMPOUND_PATTERNS.includes(pattern)) return Math.max(4, defaultSets);
  return defaultSets;
}

function candidatesForPattern(pattern, { equipment, muscles, excluded, exerciseBank }) {
  const stockNames = EXERCISE_LIBRARY.filter((item) => item.pattern === pattern).map((item) => item.name);
  const customNames = Object.entries(exerciseBank || {})
    .filter(([name, data]) => !data.isHidden && data.pattern === pattern && !LIBRARY_BY_NAME[name])
    .map(([name]) => name);
  let names = [...stockNames, ...customNames];

  if (excluded.size) {
    names = names.filter((name) => !excluded.has(name));
  }
  if (equipment.size) {
    names = names.filter((name) => {
      const item = LIBRARY_BY_NAME[name];
      const unit = item?.weightUnit || exerciseBank?.[name]?.weightUnit;
      return equipment.has(equipmentFor(name, unit));
    });
  }
  if (muscles.size) {
    names = names.filter((name) => {
      const groups = LIBRARY_BY_NAME[name]?.muscleGroups || exerciseBank?.[name]?.muscleGroups || [];
      return groups.some((g) => muscles.has(g));
    });
  }
  return names;
}

function pickForSlot(patterns, ctx, usedTodayNames, usedTodayPatterns) {
  for (const pattern of patterns) {
    if (usedTodayPatterns.has(pattern)) continue;
    const names = candidatesForPattern(pattern, ctx).filter((n) => !usedTodayNames.has(n));
    if (names.length === 0) continue;
    const priority = PRIORITY_BY_PATTERN[pattern] || [];
    const pick = priority.find((n) => names.includes(n)) || names[0];
    return { name: pick, pattern };
  }
  return null;
}

/**
 * Builds a 7-slot week (Sunday-first, matching the app's plan shape) plus
 * any brand-new exercises it needs to seed into the bank. `exerciseBank` is
 * read-only here — nothing is written until the caller commits the result.
 */
export function buildPlanFromText(
  text,
  { daysPerWeek: daysOverride, trainingDays, extraExercises, exerciseBank } = {}
) {
  const goal = parseGoal(text);
  const muscles = parseMuscles(text);
  const equipment = parseEquipment(text);
  const { included: parsedExplicit, excluded } = parseExplicitExercises(text);
  const excludedSet = new Set(excluded);
  // Checkbox picks are exact names, not text to re-parse — they're merged in
  // directly so a stray negation word elsewhere in the notes can't drop them.
  const explicit = [...new Set([...(extraExercises || []), ...parsedExplicit])].filter(
    (name) => !excludedSet.has(name)
  );

  let trainingSlots = trainingDays?.length ? [...new Set(trainingDays)].sort((a, b) => a - b) : null;
  if (trainingSlots && trainingSlots.length > 6) trainingSlots = trainingSlots.slice(0, 6);
  const daysPerWeek = trainingSlots
    ? trainingSlots.length
    : Math.min(6, Math.max(1, daysOverride || parseDaysPerWeek(text) || 3));
  if (!trainingSlots) trainingSlots = SPREAD[daysPerWeek];

  const template = biasSplit(SPLIT_TEMPLATES[daysPerWeek], muscles);
  const ctx = { equipment, muscles, excluded: excludedSet, exerciseBank: exerciseBank || {} };

  const dayAssignments = trainingSlots.map((dayIdx, i) => ({
    dayIdx,
    category: template[i],
    exercises: [],
    usedPatterns: new Set(),
  }));

  const usedThisWeek = new Set();

  // Anything named outright is guaranteed a spot before the generic slots run.
  explicit.forEach((name) => {
    if (usedThisWeek.has(name)) return;
    const pattern = LIBRARY_BY_NAME[name]?.pattern || exerciseBank?.[name]?.pattern;
    const category = pattern ? categoryFor(pattern) : null;
    const slot =
      dayAssignments.find(
        (d) => d.exercises.length < 6 && (d.category === "Full body" || !category || d.category === category)
      ) || dayAssignments[0];
    slot.exercises.push(name);
    if (pattern) slot.usedPatterns.add(pattern);
    usedThisWeek.add(name);
  });

  dayAssignments.forEach((day) => {
    const slots = DAY_SLOTS[day.category] || DAY_SLOTS["Full body"];
    slots.forEach((patterns) => {
      if (day.exercises.length >= 6) return;
      const picked = pickForSlot(patterns, ctx, new Set(day.exercises), day.usedPatterns);
      if (picked) {
        day.exercises.push(picked.name);
        day.usedPatterns.add(picked.pattern);
        usedThisWeek.add(picked.name);
      }
    });
  });

  const week = Array.from({ length: 7 }, () => ({ exercises: ["Rest"] }));
  dayAssignments.forEach(({ dayIdx, exercises }) => {
    week[dayIdx] = { exercises: exercises.length ? exercises : ["Rest"] };
  });

  // New library exercises this plan needs, seeded with goal-adjusted
  // defaults — anything already in the bank keeps whatever the user set.
  const newBankEntries = [];
  usedThisWeek.forEach((name) => {
    if (exerciseBank?.[name]) return;
    const item = LIBRARY_BY_NAME[name];
    if (!item) return;
    const entry = libraryEntry(item);
    newBankEntries.push({
      name,
      bankData: {
        ...entry,
        sets: setsForGoal(item.pattern, goal, entry.sets),
        reps: repsForGoal(item.pattern, goal, entry.reps),
      },
    });
  });

  return {
    days: week,
    newBankEntries,
    summary: { goal, muscles: [...muscles], equipment: [...equipment], daysPerWeek, explicit },
  };
}
