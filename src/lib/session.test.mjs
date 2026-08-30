/*
 * The session engine's survival rules.
 *
 * Rest is a DEADLINE, never a countdown, and the in-flight mirror is what
 * brings the user back to the same set after a crash. Both are the kind of
 * thing that looks fine until the phone locks, so they are pinned here.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  countSets,
  firstPendingSet,
  isFresh,
  orderedMovements,
  prefillFor,
  restRemaining,
  setOrder,
} from "./session.js";

const done = (weight, reps) => ({ weight, reps, done: true });
const pending = (weight, reps) => ({ weight, reps: "", targetReps: reps, done: false });

// Firebase hands object keys back sorted lexicographically, so every fixture
// here is written in that order deliberately — that is the shape the app sees.
const entries = {
  "Bicep Curls": { order: 1, sets: [pending("12", "8")] },
  Squat: { order: 0, sets: [done("40", "8"), pending("40", "8")] },
  "Tricep Extension": { order: 2, sets: [pending("15", "10")] },
};

test("movement order follows the stored order, not the key order", () => {
  assert.deepEqual(Object.keys(entries), ["Bicep Curls", "Squat", "Tricep Extension"]);
  assert.deepEqual(
    orderedMovements(entries).map(([name]) => name),
    ["Squat", "Bicep Curls", "Tricep Extension"]
  );
});

test("a session written before `order` existed falls back to the routine", () => {
  const legacy = {
    "Bicep Curls": { sets: [pending("12", "8")] },
    Squat: { sets: [pending("40", "8")] },
    "Tricep Extension": { sets: [pending("15", "10")] },
  };
  const routine = {
    movements: [
      { movementId: "Squat" },
      { movementId: "Bicep Curls" },
      { movementId: "Tricep Extension" },
    ],
  };
  assert.deepEqual(
    orderedMovements(legacy, routine).map(([name]) => name),
    ["Squat", "Bicep Curls", "Tricep Extension"]
  );
  assert.equal(firstPendingSet(legacy, routine).name, "Squat");
});

test("with neither order nor routine it is alphabetical, and still stable", () => {
  const bare = { B: { sets: [pending("1", "1")] }, A: { sets: [pending("1", "1")] } };
  assert.deepEqual(
    orderedMovements(bare).map(([name]) => name),
    ["A", "B"]
  );
});

test("a movement the routine does not mention sorts last, not first", () => {
  const withExtra = {
    ...entries,
    "Face Pull": { sets: [pending("20", "15")] },
  };
  const names = orderedMovements(withExtra, { movements: [{ movementId: "Squat" }] }).map(
    ([n]) => n
  );
  assert.equal(names[names.length - 1], "Face Pull");
});

test("the session resumes at the first unlogged set, in plan order", () => {
  const resume = firstPendingSet(entries);
  assert.equal(resume.name, "Squat");
  assert.equal(resume.setIndex, 1, "set 1 of Squat is already logged");
});

test("the walk covers every set exactly once", () => {
  const order = setOrder(entries);
  assert.equal(order.length, 4);
  assert.deepEqual(countSets(entries), { done: 1, total: 4 });
});

// ---------------------------------------------------------------- rest

test("rest is derived from a deadline, so backgrounding costs nothing", () => {
  const now = 1_000_000;
  const endsAt = now + 90_000;
  assert.equal(restRemaining(endsAt, now), 90);
  // The phone was locked for a minute. No interval ran. The clock still moved.
  assert.equal(restRemaining(endsAt, now + 60_000), 30);
  // Past the deadline it floors at zero rather than going negative.
  assert.equal(restRemaining(endsAt, now + 200_000), 0);
  assert.equal(restRemaining(null, now), 0);
});

// ------------------------------------------------------------- recovery

test("a mirror younger than 12 hours resumes; older is abandoned", () => {
  const now = Date.now();
  assert.equal(isFresh({ id: "s1", startedAt: now - 60_000 }, now), true);
  assert.equal(isFresh({ id: "s1", startedAt: now - 11 * 3600_000 }, now), true);
  assert.equal(isFresh({ id: "s1", startedAt: now - 13 * 3600_000 }, now), false);
  assert.equal(isFresh(null, now), false);
});

// -------------------------------------------------------------- prefill

test("a set opens with the previous LOGGED set of the same movement", () => {
  const sets = [done("100", "5"), done("102.5", "5"), pending("", "")];
  assert.deepEqual(prefillFor(sets, 2, {}), { weight: "102.5", reps: "5" });
});

test("the first set falls back to the routine's target", () => {
  const sets = [pending("", "")];
  assert.deepEqual(prefillFor(sets, 0, { weight: "110", reps: "5" }), {
    weight: "110",
    reps: "5",
  });
});

test("a rep RANGE or instruction is not prefilled — it is not a count", () => {
  const sets = [pending("", "")];
  // "8-12" and "FF" are targets, not numbers you can log.
  assert.deepEqual(prefillFor(sets, 0, { weight: "0", reps: "8-12" }), {
    weight: "0",
    reps: "",
  });
  assert.deepEqual(prefillFor(sets, 0, { weight: "", reps: "FF" }), {
    weight: "",
    reps: "",
  });
  // A plain number still fills in.
  assert.equal(prefillFor(sets, 0, { weight: "", reps: "5" }).reps, "5");
  assert.equal(prefillFor(sets, 0, { weight: "", reps: "12.5" }).reps, "12.5");
});

test("prefill skips over a set that was never logged", () => {
  const sets = [done("100", "5"), pending("", ""), pending("", "")];
  assert.deepEqual(prefillFor(sets, 2, { weight: "0", reps: "0" }), {
    weight: "100",
    reps: "5",
  });
});
