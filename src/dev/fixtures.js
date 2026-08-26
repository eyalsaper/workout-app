/*
 * Fixture data for the preview harness — the design file's own numbers, so a
 * screen rendered here can be compared to `Iron Log App.dc.html` side by side.
 *
 * Dev only. Never imported by the app.
 */

import { dateKey } from "../lib/training";

export const DAYS = [
  { id: "d1", order: 0, name: "Upper A", routineId: "r1" },
  { id: "d2", order: 1, name: "Lower B", routineId: "r2" },
  { id: "d3", order: 2, name: "Lower A", routineId: "r3" },
  { id: "d4", order: 3, name: "Upper B", routineId: "r4" },
];

export const PROGRAM = {
  version: 1,
  id: "p1",
  name: "Block 2",
  focus: "Strength",
  mode: "plan",
  days: DAYS,
  // Day 3 of 4, round 8 — the state every screen in the design file is drawn in.
  cursor: { dayIndex: 2, round: 8 },
  weekdays: {},
  startedAt: Date.now(),
  chapterId: "c2",
};

const movement = (movementId, sets, reps, targetLoadKg, order) => ({
  movementId,
  order,
  sets,
  reps,
  targetLoadKg,
});

export const ROUTINES = {
  r1: {
    id: "r1",
    name: "Upper A",
    focus: "chest + back",
    movements: [
      movement("Bench Press", 4, "5", 92.5, 0),
      movement("Barbell Row", 4, "8", 75, 1),
      movement("Overhead Press", 3, "8", 47.5, 2),
    ],
  },
  r2: {
    id: "r2",
    name: "Lower B",
    focus: "deadlift + quads",
    movements: [
      movement("Deadlift", 3, "5", 150, 0),
      movement("Leg Press", 4, "10", 180, 1),
    ],
  },
  // 5 movements, 17 sets — the hero line in the design file.
  r3: {
    id: "r3",
    name: "Lower A",
    focus: "squat + posterior",
    movements: [
      movement("Back Squat", 4, "5", 110, 0),
      movement("Romanian Deadlift", 3, "8", 87.5, 1),
      movement("Leg Press", 4, "10", 180, 2),
      movement("Standing Calf Raise", 3, "12", 60, 3),
      movement("Plank", 3, "1", 0, 4),
    ],
  },
  r4: {
    id: "r4",
    name: "Upper B",
    focus: "shoulders + arms",
    movements: [
      movement("Overhead Press", 4, "5", 50, 0),
      movement("Pull-Up", 4, "8", 0, 1),
      movement("Barbell Curl", 3, "10", 30, 2),
    ],
  },
};

function daysBack(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateKey(d);
}

const set = (weight, reps) => ({
  weight: String(weight),
  weightUnit: "KG",
  reps: String(reps),
  repsUnit: "Reps",
  targetReps: String(reps),
  done: true,
  at: Date.now(),
});

/** Enough history for the charts, the record book and "last 107.5" to fill. */
function history() {
  const out = {};
  // Eight weeks of sessions, climbing, so 8J has a real series to draw.
  for (let week = 7; week >= 0; week--) {
    for (let n = 0; n < 2; n++) {
      const day = daysBack(week * 7 + n * 3);
      const squat = 92.5 + (7 - week) * 2.5;
      out[`h_${week}_${n}`] = {
        date: day,
        planDayId: n === 0 ? "d1" : "d2",
        roundNumber: 8 - Math.floor(week / 2),
        routineId: n === 0 ? "r1" : "r2",
        label: n === 0 ? "Upper A" : "Lower B",
        startedAt: new Date(`${day}T18:00:00`).getTime(),
        finishedAt: new Date(`${day}T18:52:00`).getTime(),
        tonnageKg: 3200 + (7 - week) * 180,
        newBests: week === 0 && n === 0 ? [{ movementId: "Back Squat", reps: 5, weightKg: 110 }] : [],
        entries: {
          "Back Squat": { sets: [set(squat, 5), set(squat, 5), set(squat, 5)] },
          "Bench Press": { sets: [set(75 + (7 - week) * 1.5, 5), set(75 + (7 - week) * 1.5, 5)] },
          Deadlift: { sets: [set(130 + (7 - week) * 2.5, 5)] },
          "Overhead Press": { sets: [set(45 + (7 - week), 5)] },
          "Romanian Deadlift": { sets: [set(85, 8)] },
        },
      };
    }
  }
  return out;
}

export const SESSIONS = {
  ...history(),
  s1: {
    date: daysBack(3),
    planDayId: "d2",
    roundNumber: 8,
    routineId: "r2",
    label: "Lower A",
    startedAt: new Date(`${daysBack(3)}T18:00:00`).getTime(),
    finishedAt: new Date(`${daysBack(3)}T18:52:00`).getTime(),
    tonnageKg: 6400,
    newBests: [{ movementId: "Back Squat", reps: 5, weightKg: 110 }],
    entries: {
      "Back Squat": { sets: [set(107.5, 5), set(107.5, 5), set(110, 5), set(110, 5)] },
      "Romanian Deadlift": { sets: [set(85, 8), set(85, 8), set(85, 8)] },
    },
  },
};

/** An in-flight session for 8F — two sets logged, the third active. */
export function activeSessionFixture() {
  const pending = (weight, reps) => ({
    weight: String(weight),
    weightUnit: "KG",
    reps: "",
    repsUnit: "Reps",
    targetReps: String(reps),
    done: false,
    at: null,
  });
  return {
    s_active: {
      date: dateKey(),
      planDayId: "d3",
      roundNumber: 8,
      routineId: "r3",
      label: "Lower A",
      startedAt: Date.now() - 18 * 60 * 1000 - 24 * 1000,
      finishedAt: null,
      entries: {
        "Back Squat": {
          sets: [set(110, 5), set(110, 5), pending(110, 5), pending(110, 5)],
        },
        "Core Workout": {
          sets: [pending(0, 0), pending(0, 0), pending(0, 0)],
        },
        "Romanian Deadlift": {
          sets: [pending(87.5, 8), pending(87.5, 8), pending(87.5, 8)],
        },
      },
      note: "",
    },
  };
}

export const BODYWEIGHT_LOG = (() => {
  const out = {};
  for (let week = 7; week >= 0; week--) {
    out[daysBack(week * 7)] = String(77.3 + (7 - week) * 0.16);
  }
  return out;
})();

export const MEASUREMENTS = {
  [daysBack(56)]: { chestCm: "104", waistCm: "83", armCm: "37.5" },
  [daysBack(0)]: { chestCm: "105.5", waistCm: "82", armCm: "38.5" },
};

/** A container movement, the shape real accounts have. */
export const EXERCISE_DETAILS = {
  "Core Workout": {
    type: "routine",
    routine: ["Lying Leg Raises", "Oak Tree Step", "SledgeHammer Swing", "Weighted Crunch", "Plank"],
    routineChecked: {},
    explanation: "",
  },
  "Back Squat": {
    type: "explanation",
    routine: [],
    explanation: "Brace hard before the unrack. Knees track over the toes.",
  },
};

export const SETTINGS = {
  defaultRestSeconds: 90,
  plateIncrementKg: 2.5,
  units: "kg",
  programMode: "plan",
  weekStartsOn: "sun",
  characterArt: true,
  artOnlyMine: false,
  hiddenArtIds: [],
  sex: "male",
  keepScreenAwake: false,
};
