/*
 * Muscle groups, rest and movement pattern for the movements an account added
 * itself — the ones the stock library in lib/exerciseLibrary.js does not know.
 *
 * Why this exists: the record book, the volume-by-muscle rollups and the
 * library's grouping all read `muscleGroups`, and a movement without them is
 * invisible to every one of those. Four of the names below DO exist in the
 * stock library (Bench Press, Deadlift, Plank, Pull-Up) and are filled from
 * there rather than from here — a stock movement should never have two
 * different sets of numbers.
 *
 * Applied once, by hand, against the live account. Kept in the repo so the
 * values are reviewable and re-appliable rather than living only in a console
 * scrollback. Dev only; never imported by the app.
 *
 * Rest is the working guess for the movement's job, not a rule:
 *   180–210s heavy compound · 90–120s accessory · 60s core · 30s mobility.
 */

export const BANK_BACKFILL = {
  // ---- pulls ----
  "Bent-Over Rows": {
    muscleGroups: ["Back", "Biceps"],
    pattern: "horizontal-pull",
    restSeconds: 150,
  },
  "Dead-Hang": {
    // Not a lift — a grip and decompression hold. Lats hold the shoulder.
    muscleGroups: ["Back", "Core"],
    pattern: "vertical-pull",
    restSeconds: 60,
  },

  // ---- pushes ----
  "Over-Head Press": {
    muscleGroups: ["Shoulders", "Triceps"],
    pattern: "vertical-push",
    restSeconds: 180,
  },

  // ---- arms ----
  "Bicep Curls": {
    muscleGroups: ["Biceps"],
    pattern: "curl",
    restSeconds: 90,
  },
  "Tricep Extension": {
    muscleGroups: ["Triceps"],
    pattern: "extension",
    restSeconds: 90,
  },

  // ---- legs and hips ----
  Squat: {
    muscleGroups: ["Quads", "Glutes"],
    pattern: "squat",
    restSeconds: 180,
  },
  "Hips Thrusts": {
    muscleGroups: ["Glutes", "Hamstrings"],
    pattern: "hinge",
    restSeconds: 120,
  },
  "Deep Squat": {
    // Held as a mobility position rather than loaded for reps.
    muscleGroups: ["Quads", "Glutes"],
    pattern: "squat",
    restSeconds: 30,
  },
  "Deep Lunge": {
    muscleGroups: ["Quads", "Glutes"],
    pattern: "lunge",
    restSeconds: 30,
  },

  // ---- core ----
  "Lying Leg Raises": {
    muscleGroups: ["Core"],
    pattern: "core",
    restSeconds: 60,
  },
  "Weighted Crunch": {
    muscleGroups: ["Core"],
    pattern: "core",
    restSeconds: 60,
  },
  "Oak Tree Step": {
    // A slow, controlled step-through: the load is anti-rotation on the trunk
    // and single-leg stability at the hip.
    muscleGroups: ["Core", "Glutes"],
    pattern: "core",
    restSeconds: 60,
  },
  "SledgeHammer Swing": {
    // Rotational power — trunk drives it, shoulders and back steer it.
    muscleGroups: ["Core", "Shoulders", "Back"],
    pattern: "carry",
    restSeconds: 90,
  },

  // ---- mobility ----
  "Child's Pose": {
    muscleGroups: ["Back"],
    pattern: "mobility",
    restSeconds: 30,
  },
  Cobra: {
    muscleGroups: ["Back", "Core"],
    pattern: "mobility",
    restSeconds: 30,
  },
  "Hug Knee": {
    muscleGroups: ["Glutes", "Back"],
    pattern: "mobility",
    restSeconds: 30,
  },
  "Soccer Stretch": {
    muscleGroups: ["Hamstrings", "Glutes"],
    pattern: "mobility",
    restSeconds: 30,
  },
  "Open Chest Routine": {
    muscleGroups: ["Chest", "Shoulders"],
    pattern: "mobility",
    restSeconds: 30,
  },
};

/** Names that should take the stock library's numbers, not the table above. */
export const FROM_STOCK = ["Bench Press", "Deadlift", "Plank", "Pull-Up"];
