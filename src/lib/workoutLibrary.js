// A library of ready-to-go, single-day workouts — distinct from `templates.js`
// (which seeds a whole week). These are what "Pick something else" offers
// under Pre-made: pick one and it starts a session immediately, no plan
// involved. Pure data + pure helpers, no React, no Firebase.

import { LIBRARY_BY_NAME, equipmentFor } from "./exerciseLibrary";

export const PREMADE_WORKOUTS = [
  {
    id: "push-day",
    name: "Push Day",
    blurb: "Chest, shoulders, triceps.",
    exercises: ["Bench Press", "Overhead Press", "Incline Bench Press", "Tricep Pushdown", "Lateral Raise"],
  },
  {
    id: "pull-day",
    name: "Pull Day",
    blurb: "Back, biceps, posterior delts.",
    exercises: ["Deadlift", "Barbell Row", "Pull-Up", "Face Pull", "Barbell Curl"],
  },
  {
    id: "leg-day",
    name: "Leg Day",
    blurb: "Quads, hamstrings, glutes, calves.",
    exercises: ["Back Squat", "Romanian Deadlift", "Bulgarian Split Squat", "Standing Calf Raise"],
  },
  {
    id: "full-body-strength",
    name: "Full Body Strength",
    blurb: "The four big lifts, one session.",
    exercises: ["Back Squat", "Bench Press", "Barbell Row", "Overhead Press"],
  },
  {
    id: "upper-body-blast",
    name: "Upper Body Blast",
    blurb: "Everything above the waist.",
    exercises: ["Bench Press", "Barbell Row", "Overhead Press", "Barbell Curl", "Tricep Pushdown"],
  },
  {
    id: "posterior-chain",
    name: "Posterior Chain",
    blurb: "Hamstrings, glutes, back — the pulling side.",
    exercises: ["Deadlift", "Romanian Deadlift", "Hip Thrust", "Face Pull"],
  },
  {
    id: "glutes-hamstrings",
    name: "Glutes & Hamstrings",
    blurb: "Hip-hinge focused.",
    exercises: ["Hip Thrust", "Romanian Deadlift", "Walking Lunge", "Leg Curl"],
  },
  {
    id: "core-stability",
    name: "Core & Stability",
    blurb: "Bracing and anti-rotation work.",
    exercises: ["Plank", "Hanging Leg Raise", "Ab Wheel Rollout", "Dead Bug", "Side Plank"],
  },
  {
    id: "bodyweight-only",
    name: "Bodyweight Only",
    blurb: "No equipment needed.",
    exercises: ["Push-Up", "Pull-Up", "Dip", "Plank", "Hanging Leg Raise"],
  },
  {
    id: "quick-fifteen",
    name: "Quick 15",
    blurb: "Short on time — three moves, no fluff.",
    exercises: ["Push-Up", "Plank", "Glute Bridge"],
  },
  {
    id: "shoulders-arms",
    name: "Shoulders & Arms",
    blurb: "Delts, biceps, triceps.",
    exercises: ["Overhead Press", "Lateral Raise", "Barbell Curl", "Tricep Pushdown", "Face Pull"],
  },
  {
    id: "chest-back",
    name: "Chest & Back",
    blurb: "An antagonist pairing.",
    exercises: ["Bench Press", "Barbell Row", "Cable Fly", "Seated Cable Row"],
  },
  {
    id: "machine-cable-only",
    name: "Machine & Cable Only",
    blurb: "For a busy gym floor — no barbell needed.",
    exercises: ["Machine Chest Press", "Seated Cable Row", "Leg Press", "Cable Curl", "Lat Pulldown"],
  },
  {
    id: "home-dumbbell",
    name: "Home Dumbbell Workout",
    blurb: "Just a pair of dumbbells.",
    exercises: ["Dumbbell Bench Press", "Dumbbell Row", "Goblet Squat", "Dumbbell Curl"],
  },
];

// Finer library muscle groups (Biceps/Triceps, Quads/Hamstrings/Glutes/Calves)
// collapse to this coarser set for filter chips — matching how the plan
// builder's questionnaire already groups them.
const MUSCLE_GROUP_MAP = {
  Chest: "Chest",
  Back: "Back",
  Shoulders: "Shoulders",
  Biceps: "Arms",
  Triceps: "Arms",
  Quads: "Legs",
  Hamstrings: "Legs",
  Glutes: "Legs",
  Calves: "Legs",
  Core: "Core",
};

export const MUSCLE_FILTERS = ["Chest", "Back", "Shoulders", "Arms", "Legs", "Core"];
export const EQUIPMENT_FILTERS = ["Barbell", "Dumbbell", "Cable", "Machine", "Bodyweight"];

/** The coarse muscle groups a list of exercise names trains. */
export function workoutMuscles(exerciseNames) {
  const found = new Set();
  (exerciseNames || []).forEach((name) => {
    (LIBRARY_BY_NAME[name]?.muscleGroups || []).forEach((g) => {
      const mapped = MUSCLE_GROUP_MAP[g];
      if (mapped) found.add(mapped);
    });
  });
  return found;
}

/** The equipment a list of exercise names needs. */
export function workoutEquipment(exerciseNames) {
  const found = new Set();
  (exerciseNames || []).forEach((name) => {
    const item = LIBRARY_BY_NAME[name];
    found.add(equipmentFor(name, item?.weightUnit));
  });
  return found;
}
