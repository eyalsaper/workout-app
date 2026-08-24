// Pure helpers. No React, no Firebase — safe to import anywhere.

export const REST = "Rest";

export function isRestEntry(exName) {
  return !exName || exName.trim().toLowerCase() === "rest";
}

export function cleanName(exName) {
  return (exName || "").trim();
}

/** How many sets an exercise is planned for. Always at least 1. */
export function setCountFor(bankData) {
  if (!bankData || bankData.isHidden) return 1;
  return Math.max(1, parseInt(bankData.sets, 10) || 1);
}

/**
 * The reps/weight for one specific set. Handles "alternative sets", where
 * each set carries its own numbers (pyramids, drop sets).
 */
export function setDataFor(bankData, setIdx = 0) {
  const fallback = {
    reps: "",
    repsUnit: "Reps",
    weight: "",
    weightUnit: "KG",
  };
  if (!bankData || bankData.isHidden) return fallback;
  if (bankData.isAlternative) {
    return { ...fallback, ...(bankData.altSets?.[setIdx] || {}) };
  }
  return {
    reps: bankData.reps,
    repsUnit: bankData.repsUnit,
    weight: bankData.weight,
    weightUnit: bankData.weightUnit,
  };
}

export const formatReps = (reps, unit) =>
  reps ? `${reps}${unit === "Reps" ? "" : unit}` : "";

export const formatWeight = (weight, unit) =>
  unit === "Body Wt." ? "[BW]" : weight ? `[${weight}${unit}]` : "";

/** "4 × 6 · 80 kg" style prescription for a Today exercise row's right side. */
export function formatPrescription(bankData) {
  if (!bankData || bankData.isHidden) return "";
  const count = setCountFor(bankData);
  const first = setDataFor(bankData, 0);
  const reps = first.reps ? `${first.reps}${first.repsUnit === "Reps" ? "" : first.repsUnit}` : "";
  const weight =
    first.weightUnit === "Body Wt."
      ? "BW"
      : first.weight
      ? `${first.weight} ${first.weightUnit.toLowerCase()}`
      : "";
  const countReps = reps ? `${count} × ${reps}` : `${count} set${count === 1 ? "" : "s"}`;
  return weight ? `${countReps} · ${weight}` : countReps;
}

/** Seconds on the clock for a timed set. Returns 0 for rep-based sets. */
export function getTimerSeconds(bankData, setIdx = 0) {
  if (!bankData) return 0;
  const { reps, repsUnit } = setDataFor(bankData, setIdx);
  const value = parseInt(reps, 10);
  if (Number.isNaN(value)) return 0;
  if (repsUnit === "Secs") return value;
  if (repsUnit === "Mins") return value * 60;
  return 0;
}

export function formatClock(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
