import test from "node:test";
import assert from "node:assert/strict";
import { planToObject, planToCsv, planFilename } from "./planExport.js";

const program = {
  name: "Block 1",
  days: [
    { id: "d2", order: 1, name: "Pull", movements: [{ movementId: "Row", sets: 3, reps: "10", targetLoadKg: 40 }] },
    {
      id: "d1",
      order: 0,
      name: "Push, heavy",
      movements: [
        { movementId: "Bench", sets: 4, reps: "5", targetLoadKg: 80 },
        { routineId: "r1", name: "Stretch" },
      ],
    },
  ],
};
const routines = { r1: { id: "r1", name: "Stretch", movements: [{ movementId: "Cobra", sets: 1, reps: "30s" }] } };
const bank = { Bench: { muscleGroups: ["Chest", "Triceps"] } };

test("days come out in plan order with nested routines expanded", () => {
  const { plan } = planToObject(program, routines, bank);
  assert.deepEqual(plan.days.map((d) => d.name), ["Push, heavy", "Pull"]);
  assert.deepEqual(plan.days[0].movements.map((m) => m.name), ["Bench", "Cobra"]);
  assert.equal(plan.days[0].movements[1].fromRoutine, "Stretch");
});

test("csv has one row per movement and quotes commas", () => {
  const lines = planToCsv(program, routines, bank).split("\n");
  assert.equal(lines.length, 4);
  assert.ok(lines[1].includes('"Push, heavy"'));
});

test("filename is slugged", () => {
  assert.equal(planFilename({ name: "Block 1!" }, "json"), "iron-log-plan-block-1.json");
});
