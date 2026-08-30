/*
 * Ready-made programmes for first run (8O) and the Routines shelf (8C).
 *
 * These are PLANS — ordered lists of days — not weekly calendars. Each one
 * creates a programme in plan mode with the cursor at Day 1, round 1, and the
 * user chooses nothing about modes.
 *
 * Movement names match src/lib/exerciseLibrary.js exactly, so a seeded routine
 * picks up muscle groups, cues and rest times the moment it is created.
 */

const m = (movementId, sets, reps, targetLoadKg = 0) => ({ movementId, sets, reps, targetLoadKg });

export const READY_MADE = [
  {
    id: "minimum",
    name: "Two-day minimum",
    description: "2 days — the least that still works",
    days: [
      {
        name: "Full A",
        focus: "squat + press",
        movements: [m("Back Squat", 3, "5"), m("Bench Press", 3, "5"), m("Barbell Row", 3, "8")],
      },
      {
        name: "Full B",
        focus: "hinge + press",
        movements: [m("Deadlift", 2, "5"), m("Overhead Press", 3, "5"), m("Pull-Up", 3, "8")],
      },
    ],
  },
  {
    id: "full-body-3",
    name: "Full body",
    description: "3 days — good for coming back",
    days: [
      {
        name: "Full A",
        focus: "squat + press",
        movements: [m("Back Squat", 3, "5"), m("Bench Press", 3, "5"), m("Barbell Row", 3, "8")],
      },
      {
        name: "Full B",
        focus: "hinge + overhead",
        movements: [m("Deadlift", 2, "5"), m("Overhead Press", 3, "5"), m("Pull-Up", 3, "8")],
      },
      {
        name: "Full C",
        focus: "squat + accessories",
        movements: [
          m("Back Squat", 3, "5"),
          m("Bench Press", 3, "8"),
          m("Romanian Deadlift", 3, "8"),
        ],
      },
    ],
  },
  {
    id: "upper-lower-4",
    name: "Upper / Lower",
    description: "4 days — the standard split",
    days: [
      {
        name: "Upper A",
        focus: "chest + back",
        movements: [
          m("Bench Press", 4, "5"),
          m("Barbell Row", 4, "8"),
          m("Overhead Press", 3, "8"),
        ],
      },
      {
        name: "Lower A",
        focus: "squat + posterior",
        movements: [
          m("Back Squat", 4, "5"),
          m("Romanian Deadlift", 3, "8"),
          m("Standing Calf Raise", 3, "12"),
        ],
      },
      {
        name: "Upper B",
        focus: "shoulders + arms",
        movements: [
          m("Overhead Press", 4, "5"),
          m("Pull-Up", 4, "8"),
          m("Barbell Curl", 3, "10"),
        ],
      },
      {
        name: "Lower B",
        focus: "deadlift + quads",
        movements: [m("Deadlift", 3, "5"), m("Leg Press", 4, "10"), m("Plank", 3, "1")],
      },
    ],
  },
  {
    id: "ppl-5",
    name: "Push / Pull / Legs",
    description: "5 days — the most volume",
    days: [
      {
        name: "Push A",
        focus: "chest + shoulders",
        movements: [m("Bench Press", 4, "5"), m("Overhead Press", 3, "8"), m("Cable Fly", 3, "12")],
      },
      {
        name: "Pull A",
        focus: "back + biceps",
        movements: [m("Deadlift", 3, "5"), m("Barbell Row", 4, "8"), m("Face Pull", 3, "15")],
      },
      {
        name: "Legs",
        focus: "quads + posterior",
        movements: [
          m("Back Squat", 4, "5"),
          m("Romanian Deadlift", 3, "8"),
          m("Standing Calf Raise", 4, "12"),
        ],
      },
      {
        name: "Push B",
        focus: "shoulders + triceps",
        movements: [m("Overhead Press", 4, "5"), m("Bench Press", 3, "8"), m("Cable Fly", 3, "12")],
      },
      {
        name: "Pull B",
        focus: "back + arms",
        movements: [m("Pull-Up", 4, "8"), m("Barbell Row", 3, "10"), m("Barbell Curl", 3, "10")],
      },
    ],
  },
];
