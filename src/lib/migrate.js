import { get, ref, set } from "firebase/database";
import { database, userBasePath } from "../firebase";

// Before accounts existed, everything sat at the root of the database.
// These are the nodes that need to move under users/{uid}/.
export const LEGACY_PATHS = [
  "exerciseBank",
  "plans",
  "dailyProgress",
  "globalTracker",
  "globalTrackerChecked",
  "exerciseDetails",
];

const LABELS = {
  exerciseBank: "Exercise bank",
  plans: "Plans",
  dailyProgress: "Checked-off sets",
  globalTracker: "Global tracker",
  globalTrackerChecked: "Tracker checkmarks",
  exerciseDetails: "Notes, links and routines",
};

const describe = (path, value) => {
  if (path === "plans" && value) return `${Object.keys(value).length} plan(s)`;
  if (path === "exerciseBank" && value)
    return `${Object.keys(value).filter((k) => k !== "_empty").length} exercise(s)`;
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (value && typeof value === "object") return `${Object.keys(value).length} entry(ies)`;
  return "present";
};

/** Look at the root of the database and report what's still sitting there. */
export async function findLegacyData() {
  const found = [];
  for (const path of LEGACY_PATHS) {
    // Sequential on purpose: six small reads, and it keeps the failure
    // message tied to a specific node.
    // eslint-disable-next-line no-await-in-loop
    const snapshot = await get(ref(database, path));
    if (snapshot.exists()) {
      const value = snapshot.val();
      found.push({ path, label: LABELS[path], summary: describe(path, value), value });
    }
  }
  return found;
}

/**
 * Copy the old root data into the account. This overwrites whatever is in the
 * account for those nodes — which is what you want on first migration, since
 * signing in creates a fresh set of starter exercises.
 *
 * The original root data is left untouched, so this is safe to retry.
 */
export async function copyLegacyDataToAccount(uid, found) {
  const base = userBasePath(uid);
  for (const item of found) {
    // eslint-disable-next-line no-await-in-loop
    await set(ref(database, `${base}/${item.path}`), item.value);
  }
}
