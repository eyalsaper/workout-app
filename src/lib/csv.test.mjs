/*
 * CSV export and import, round-tripped.
 *
 * The import is deliberately tolerant — unknown columns ignored, unparseable
 * rows skipped and counted rather than aborting the file — so the tests that
 * matter most are the malformed ones.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { monthCsv, parseImportCsv } from "./csv.js";

const session = (over = {}) => ({
  date: "2026-08-24",
  startedAt: new Date("2026-08-24T18:12:00Z").getTime(),
  finishedAt: new Date("2026-08-24T19:04:00Z").getTime(),
  label: "Lower A",
  planDayId: "d3",
  roundNumber: 8,
  entries: {
    "Back Squat": {
      sets: [
        { weight: "110", reps: "5", done: true },
        { weight: "110", reps: "5", done: true },
        { weight: "110", reps: "5", done: false },
      ],
    },
  },
  ...over,
});

test("export writes one row per COMPLETED set, with the header from §10.5", () => {
  const csv = monthCsv([["s_9f3", session()]], (id) => (id === "d3" ? "Day 3" : ""));
  const lines = csv.split("\n");

  assert.equal(
    lines[0],
    "date,session_id,routine,plan_day,round,movement,set_index,weight_kg,reps"
  );
  // Three sets, one of them not done.
  assert.equal(lines.length, 3);
  assert.match(lines[1], /,s_9f3,Lower A,Day 3,8,Back Squat,1,110,5$/);
  assert.match(lines[2], /,Back Squat,2,110,5$/);
});

test("export fills plan_day through the resolver, and leaves it blank without one", () => {
  const withDay = monthCsv([["s1", session()]], (id) => (id === "d3" ? "Day 3" : ""));
  assert.match(withDay.split("\n")[1], /,Day 3,8,/);

  const withoutDay = monthCsv([["s1", session()]]);
  assert.match(withoutDay.split("\n")[1], /,Lower A,,8,/);
});

test("a movement name containing a comma survives the round trip", () => {
  const csv = monthCsv([
    ["s1", session({ entries: { 'Row, "wide" grip': { sets: [{ weight: "60", reps: "8", done: true }] } } })],
  ]);
  const { sessions, imported, skipped } = parseImportCsv(csv);
  assert.equal(imported, 1);
  assert.equal(skipped, 0);
  assert.ok(Object.values(sessions)[0].entries['Row, "wide" grip']);
});

test("export then import returns the same sets", () => {
  const csv = monthCsv([["s1", session()]], () => "Day 3");
  const { sessions, imported, skipped, movements } = parseImportCsv(csv);

  assert.equal(imported, 2, "only the completed sets were written");
  assert.equal(skipped, 0);
  assert.deepEqual(movements, ["Back Squat"]);

  const [record] = Object.values(sessions);
  assert.equal(record.date, "2026-08-24");
  assert.equal(record.entries["Back Squat"].sets.length, 2);
  assert.equal(record.entries["Back Squat"].sets[0].weight, "110");
  assert.equal(record.entries["Back Squat"].sets[0].reps, "5");
  // §10.5: import never creates a programme.
  assert.equal(record.planDayId, null);
  assert.equal(record.roundNumber, null);
});

test("import tolerates another app's column names and extra columns", () => {
  const foreign = [
    "date,exercise,weight,reps,notes,rpe",
    "2026-08-01,Bench Press,80,5,felt easy,7",
    "2026-08-01,Bench Press,82.5,5,,8",
  ].join("\n");
  const { sessions, imported, skipped } = parseImportCsv(foreign);
  assert.equal(imported, 2);
  assert.equal(skipped, 0);
  assert.equal(Object.values(sessions)[0].entries["Bench Press"].sets.length, 2);
});

test("import skips bad rows and counts them rather than throwing", () => {
  const messy = [
    "date,movement,weight_kg,reps",
    "2026-08-01,Squat,100,5",
    "not-a-date,Squat,100,5",
    "2026-08-01,,100,5",
    "2026-08-01,Squat,100,",
    "",
  ].join("\n");
  const { imported, skipped } = parseImportCsv(messy);
  assert.equal(imported, 1);
  assert.equal(skipped, 3);
});

test("import refuses a file with no usable columns, without throwing", () => {
  const { imported, skipped } = parseImportCsv("foo,bar\n1,2\n3,4");
  assert.equal(imported, 0);
  assert.equal(skipped, 2);
});

test("import of an empty or header-only file is a no-op", () => {
  assert.deepEqual(parseImportCsv(""), { sessions: {}, imported: 0, skipped: 0, movements: [] });
  assert.equal(parseImportCsv("date,movement,weight_kg,reps").imported, 0);
});

test("rows on the same date collapse into one session", () => {
  const csv = [
    "date,movement,weight_kg,reps",
    "2026-08-01,Squat,100,5",
    "2026-08-01,Bench Press,80,5",
    "2026-08-03,Squat,102.5,5",
  ].join("\n");
  const { sessions, imported } = parseImportCsv(csv);
  assert.equal(imported, 3);
  assert.equal(Object.keys(sessions).length, 2);
  assert.equal(Object.keys(sessions["import_2026-08-01"].entries).length, 2);
});
