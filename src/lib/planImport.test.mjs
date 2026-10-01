/*
 * Plan import, round-tripped against planExport.js. The tests that matter
 * most: a file the app exported goes back in unchanged, and malformed rows are
 * skipped and counted rather than aborting the import.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { planToCsv, planToJson, planToObject } from "./planExport.js";
import { parsePlanFile, planFromImport } from "./planImport.js";
import { monthCsv } from "./csv.js";
import { buildObsidianFiles, OBSIDIAN_HISTORY_FILE, OBSIDIAN_PLAN_FILE } from "./obsidianExport.js";

const program = {
  id: "p1",
  name: "Block 1",
  focus: "Strength",
  mode: "plan",
  cursor: { dayIndex: 1, round: 3 },
  days: [
    {
      id: "d2",
      order: 1,
      name: "Pull",
      movements: [
        { movementId: "Row", order: 0, sets: 3, reps: "10", targetLoadKg: 42.5 },
        { movementId: "Bar Hang", order: 1, sets: null, reps: "AMRAP", targetLoadKg: 0 },
      ],
    },
    {
      id: "d1",
      order: 0,
      name: 'Push, "heavy"',
      movements: [
        { movementId: "Bench Press", order: 0, sets: 4, reps: "5", targetLoadKg: 80 },
        { routineId: "r1", name: "Stretch" },
      ],
    },
    { id: "d3", order: 2, name: "Rest-ish", movements: [] },
  ],
};
const routines = { r1: { id: "r1", name: "Stretch", movements: [{ movementId: "Cobra", sets: 1, reps: "30s" }] } };
const bank = { "Bench Press": { muscleGroups: ["Chest", "Triceps"] }, Row: { muscleGroups: ["Back"] } };

let n = 0;
const newId = (prefix) => `${prefix}_${++n}`;

// What a plan "is": days in order, with their movements. The export date and
// the fromRoutine note are not part of it.
const shape = (obj) =>
  obj.plan.days.map((d) => ({
    name: d.name,
    movements: d.movements.map((m) => [m.name, m.sets, m.reps, m.targetLoadKg, m.muscleGroups.join(";")]),
  }));

function roundTrip(text) {
  const parsed = parsePlanFile(text);
  assert.ok(parsed.ok, parsed.error);
  const { program: back, additions } = planFromImport(parsed, { mode: "new", bank, newId });
  const nextBank = { ...bank, ...additions };
  return planToObject(back, {}, nextBank);
}

test("JSON export imports back as the same plan", () => {
  const original = planToObject(program, routines, bank);
  assert.deepEqual(shape(roundTrip(planToJson(program, routines, bank))), shape(original));
});

test("CSV export imports back as the same plan (minus days with no movements)", () => {
  const original = shape(planToObject(program, routines, bank)).filter((d) => d.movements.length);
  assert.deepEqual(shape(roundTrip(planToCsv(program, routines, bank))), original);
});

test("plan name survives and quoted day names stay intact", () => {
  const parsed = parsePlanFile(planToCsv(program, routines, bank));
  assert.equal(parsed.name, "Block 1");
  assert.equal(parsed.days[0].name, 'Push, "heavy"');
  assert.equal(parsed.skipped, 0);
});

test("unknown columns are ignored, column order does not matter, BOM and CRLF are fine", () => {
  const text = "﻿notes,movement,day,reps,sets\r\nhi,Squat,1,5,3\r\nyo,Press,1,8,3\r\n";
  const parsed = parsePlanFile(text);
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.days[0].movements.map((m) => m.name), ["Squat", "Press"]);
  assert.equal(parsed.days[0].movements[0].sets, 3);
  assert.equal(parsed.days[0].name, "Workout 1");
});

test("bad rows are skipped and counted", () => {
  const text = [
    "plan,day,day_name,order,movement,sets,reps,target_load_kg,muscle_groups",
    "P,1,A,1,Squat,3,5,100,Quads; Glutes",
    "P,1,A,2,,3,5,100,",
    "P,,,3,Press,3,5,50,",
    "P,x,,4,Deadlift,1,5,140,",
    "P,2,B,1,Row,abc,8,-5,",
  ].join("\n");
  const parsed = parsePlanFile(text);
  assert.equal(parsed.skipped, 3);
  assert.equal(parsed.days.length, 2);
  assert.deepEqual(parsed.days[0].movements[0].muscleGroups, ["Quads", "Glutes"]);
  assert.equal(parsed.days[1].movements[0].sets, null);
  assert.equal(parsed.days[1].movements[0].targetLoadKg, 0);
});

test("files that are not plans fail with a message, not a crash", () => {
  assert.equal(parsePlanFile("").ok, false);
  assert.equal(parsePlanFile("date,exercise\n2026-01-01,Squat").ok, false);
  assert.equal(parsePlanFile("{nope").ok, false);
  assert.equal(parsePlanFile('{"format":"other","plan":{"days":[]}}').ok, false);
  assert.equal(parsePlanFile("movement,day\n,").ok, false);
});

test("an unknown exercise becomes a user exercise with the file's muscle groups", () => {
  const parsed = parsePlanFile(
    "plan,day,day_name,order,movement,sets,reps,target_load_kg,muscle_groups\nP,1,A,1,Zercher Squat,3,5,60,Quads;Core"
  );
  const { additions } = planFromImport(parsed, { mode: "new", bank: {}, newId });
  assert.deepEqual(additions["Zercher Squat"].muscleGroups, ["Quads", "Core"]);
  assert.equal(additions["Zercher Squat"].source, "import");
});

test("a known exercise is matched case-insensitively, not duplicated", () => {
  const parsed = parsePlanFile("movement,day\nbench press,1\nback squat,1");
  const { program: built, additions } = planFromImport(parsed, { mode: "new", bank, newId });
  assert.equal(built.days[0].movements[0].movementId, "Bench Press");
  assert.equal(built.days[0].movements[1].movementId, "Back Squat");
  // Back Squat is in the stock library, so it gets the library entry.
  assert.deepEqual(Object.keys(additions), ["Back Squat"]);
});

test("update keeps day ids, cursor and round, and carries extra movement fields", () => {
  const withExtra = structuredClone(program);
  withExtra.days[0].movements[0].restSeconds = 120;
  const json = planToJson(withExtra, routines, bank).replace('"targetLoadKg": 42.5', '"targetLoadKg": 45');
  const parsed = parsePlanFile(json);
  const { program: updated, summary } = planFromImport(parsed, {
    mode: "update",
    program: withExtra,
    bank,
    newId,
  });

  assert.deepEqual(updated.days.map((d) => d.id), ["d1", "d2", "d3"]);
  assert.equal(updated.id, "p1");
  assert.equal(updated.days[1].movements[0].targetLoadKg, 45);
  assert.equal(updated.days[1].movements[0].restSeconds, 120);
  // The cursor sat on Pull (d2); Pull is still the day that is up next.
  assert.equal(updated.days[updated.cursor.dayIndex].id, "d2");
  assert.equal(updated.cursor.round, 3);
  assert.deepEqual([summary.kept, summary.added, summary.removed], [3, 0, 0]);
});

test("update matches by name, falls back to position, and drops days the file no longer has", () => {
  const parsed = parsePlanFile("movement,day,day_name\nBench Press,1,Pull\nRow,2,Brand new");
  const { program: updated, summary } = planFromImport(parsed, { mode: "update", program, bank, newId });
  assert.equal(updated.days[0].id, "d2"); // "Pull" kept its id
  assert.ok(!["d1", "d2", "d3"].includes(updated.days[1].id)); // its position holds a day already matched: new id
  assert.equal(summary.removed, 2);
  assert.equal(updated.days.length, 2);
});

test("history export: session_note column appears only when a note exists", () => {
  const s = (note) => [
    "s1",
    {
      date: "2026-08-24",
      finishedAt: 1,
      note,
      entries: { Squat: { sets: [{ done: true, weight: "100", reps: "5" }] } },
    },
  ];
  const plain = monthCsv([s("")], () => "", { sessionNotes: true }).split("\n");
  assert.ok(!plain[0].includes("session_note"));
  const noted = monthCsv([s('felt "heavy", slept badly')], () => "", { sessionNotes: true }).split("\n");
  assert.ok(noted[0].endsWith(",session_note"));
  assert.ok(noted[1].endsWith('"felt ""heavy"", slept badly"'));
  // The default export keeps its columns.
  assert.ok(!monthCsv([s("x")]).includes("session_note"));
});

test("obsidian export builds two fixed-name files", () => {
  const files = buildObsidianFiles({
    sessions: {
      s1: {
        date: "2026-08-24",
        finishedAt: 1,
        note: "good",
        planDayId: "d1",
        entries: { Squat: { sets: [{ done: true, weight: "100", reps: "5" }] } },
      },
    },
    program,
    routines,
    exerciseBank: bank,
    planDays: program.days,
  });
  assert.deepEqual(files.map((f) => f.name), [OBSIDIAN_HISTORY_FILE, OBSIDIAN_PLAN_FILE]);
  assert.ok(files[0].text.includes("session_note"));
  assert.equal(JSON.parse(files[1].text).format, "iron-log-plan");
});
