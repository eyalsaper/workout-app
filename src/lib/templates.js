// First-run starter plans. Exercise names match src/lib/exerciseLibrary.js
// exactly so the seeded routine picks up muscle groups, cues and rest times
// the moment it's created.
import { WEEKDAY_NAMES } from "./training";

const REST = { exercises: ["Rest"] };

function week(byWeekday) {
  return WEEKDAY_NAMES.map((day, i) => ({
    day,
    exercises: byWeekday[i] || ["Rest"],
  }));
}

export const TEMPLATES = [
  {
    id: "ppl",
    label: "Push / Pull / Legs",
    description: "4 days a week — the classic split",
    days: week({
      1: ["Bench Press", "Overhead Press", "Cable Fly"], // Monday — Push
      2: ["Deadlift", "Barbell Row", "Face Pull"], // Tuesday — Pull
      3: ["Back Squat", "Romanian Deadlift", "Standing Calf Raise"], // Wednesday — Legs
      5: ["Bench Press", "Overhead Press", "Barbell Curl"], // Friday — Push
    }),
  },
  {
    id: "upper-lower",
    label: "Upper / Lower",
    description: "3 days a week — easier to keep",
    days: week({
      1: ["Bench Press", "Barbell Row", "Overhead Press"], // Monday — Upper
      3: ["Back Squat", "Romanian Deadlift", "Leg Press"], // Wednesday — Lower
      5: ["Bench Press", "Barbell Row", "Lateral Raise"], // Friday — Upper
    }),
  },
  {
    id: "full-body",
    label: "Full body",
    description: "2–3 days — good for coming back",
    days: week({
      1: ["Back Squat", "Bench Press", "Barbell Row"], // Monday
      3: ["Deadlift", "Overhead Press", "Pull-Up"], // Wednesday
      5: ["Back Squat", "Bench Press", "Barbell Row"], // Friday
    }),
  },
];
