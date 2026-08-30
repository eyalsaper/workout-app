/*
 * The filter helpers behind the Routines shelf.
 *
 * These returned a Set for a while, and every caller treated the result as an
 * array — tapping a filter chip threw "workoutMuscles(...).some is not a
 * function" and blanked the screen. Pinned here so the shape cannot drift back.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { workoutEquipment, workoutMuscles } from "./workoutLibrary.js";

test("both helpers return arrays, not Sets", () => {
  assert.ok(Array.isArray(workoutMuscles(["Bench Press"])));
  assert.ok(Array.isArray(workoutEquipment(["Bench Press"])));
  // The methods every caller actually uses.
  assert.equal(typeof workoutMuscles(["Bench Press"]).some, "function");
  assert.equal(typeof workoutMuscles(["Bench Press"]).join, "function");
  assert.equal(typeof workoutEquipment(["Bench Press"]).some, "function");
});

test("stock movements collapse to the coarse filter groups", () => {
  // Back Squat is Quads + Glutes in the library; both map to Legs.
  assert.deepEqual(workoutMuscles(["Back Squat"]), ["Legs"]);
  const push = workoutMuscles(["Bench Press"]);
  assert.ok(push.includes("Chest"));
  assert.ok(push.includes("Arms"), "triceps map to Arms");
});

test("the account's own movements are read before the stock library", () => {
  const bank = { "SledgeHammer Swing": { muscleGroups: ["Core", "Shoulders", "Back"] } };
  // Unknown to the stock library, so without the bank it maps to nothing.
  assert.deepEqual(workoutMuscles(["SledgeHammer Swing"]), []);
  const withBank = workoutMuscles(["SledgeHammer Swing"], bank);
  assert.deepEqual(withBank.sort(), ["Back", "Core", "Shoulders"]);
});

test("a bank entry with no groups falls back to the library", () => {
  const bank = { "Back Squat": { muscleGroups: [] } };
  assert.deepEqual(workoutMuscles(["Back Squat"], bank), ["Legs"]);
});

test("groups are deduped across a list", () => {
  assert.deepEqual(workoutMuscles(["Back Squat", "Leg Press"]), ["Legs"]);
});

test("an empty or unknown list is an empty array, never a throw", () => {
  assert.deepEqual(workoutMuscles([]), []);
  assert.deepEqual(workoutMuscles(null), []);
  assert.deepEqual(workoutMuscles(["Not A Real Movement"]), []);
  assert.deepEqual(workoutEquipment(null), []);
});

test("equipment is resolved per movement", () => {
  const kit = workoutEquipment(["Bench Press", "Pull-Up"]);
  assert.ok(kit.length > 0);
  assert.ok(kit.every((e) => typeof e === "string"));
});
