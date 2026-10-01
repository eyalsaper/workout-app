// Plan export — the programme as a portable file, for other apps or a backup.
// Pure builders here; downloadTextFile in csv.js does the DOM part.

import { orderedDays, dayMovements, expandMovements } from "./plan.js";

export const PLAN_EXPORT_FORMAT = "iron-log-plan";
export const PLAN_EXPORT_VERSION = 1;

function csvCell(value) {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** A day's items flattened to lifts, nested routines expanded in place. */
function flatMovements(day, routines) {
  return expandMovements(dayMovements(day, routines), routines);
}

/** The whole plan as a plain object: days in order, each with its movements. */
export function planToObject(program, routines = {}, exerciseBank = {}) {
  const days = orderedDays(program).map((day, index) => ({
    position: index + 1,
    name: day.name || `Workout ${index + 1}`,
    movements: flatMovements(day, routines).map((m, order) => ({
      order: order + 1,
      name: m.movementId,
      sets: m.sets ?? null,
      reps: m.reps ?? "",
      targetLoadKg: m.targetLoadKg ?? 0,
      muscleGroups: exerciseBank?.[m.movementId]?.muscleGroups || [],
      fromRoutine: m.viaName || "",
    })),
  }));

  return {
    format: PLAN_EXPORT_FORMAT,
    version: PLAN_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plan: {
      name: program?.name || "Plan",
      focus: program?.focus || "",
      mode: program?.mode || "plan",
      days,
    },
  };
}

export function planToJson(program, routines, exerciseBank) {
  return JSON.stringify(planToObject(program, routines, exerciseBank), null, 2);
}

/** One row per movement, so it opens cleanly in a spreadsheet. */
export function planToCsv(program, routines, exerciseBank) {
  const header = [
    "plan",
    "day",
    "day_name",
    "order",
    "movement",
    "sets",
    "reps",
    "target_load_kg",
    "muscle_groups",
  ];
  const out = [header];
  const { plan } = planToObject(program, routines, exerciseBank);
  plan.days.forEach((day) => {
    day.movements.forEach((m) => {
      out.push([
        plan.name,
        day.position,
        day.name,
        m.order,
        m.name,
        m.sets ?? "",
        m.reps,
        m.targetLoadKg || "",
        m.muscleGroups.join("; "),
      ]);
    });
  });
  return out.map((row) => row.map(csvCell).join(",")).join("\n");
}

const slug = (s) =>
  String(s || "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "plan";

export function planFilename(program, ext) {
  return `iron-log-plan-${slug(program?.name)}.${ext}`;
}
