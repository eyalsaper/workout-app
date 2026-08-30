/*
 * The session engine's local mirror.
 *
 * One session is in flight at a time. Firebase is the store, but it debounces
 * writes by 400ms and the app has to survive a basement with no signal, a
 * phone call, a crash and a reload — so the in-flight session is ALSO written
 * to local storage on every single set. On launch the mirror is what decides
 * whether to go straight back to 8F.
 *
 * Rest is a timestamp, never a countdown: remaining time is always
 * `restEndsAt − now`, which makes backgrounding, locking and reloading free.
 */

const KEY = "ironlog.activeSession";

// Older than this and it is not "in flight", it is abandoned (§10.1).
const STALE_HOURS = 12;

export function saveActiveSession(record) {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Out of quota. Firebase still has the sets; only crash recovery is lost.
  }
}

export function loadActiveSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const record = JSON.parse(raw);
    if (!record?.id || !record?.startedAt) return null;
    return record;
  } catch {
    return null;
  }
}

export function clearActiveSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** Is this mirror fresh enough to drop the user straight back into 8F? */
export function isFresh(record, now = Date.now()) {
  if (!record) return false;
  return now - record.startedAt < STALE_HOURS * 3600 * 1000;
}

/** Seconds left on the rest timer. Derived, never decremented. */
export function restRemaining(restEndsAt, now = Date.now()) {
  if (!restEndsAt) return 0;
  return Math.max(0, Math.round((restEndsAt - now) / 1000));
}

// ------------------------------------------------------------- set helpers

/**
 * The values a new set opens with: the previous set of the same movement in
 * this session, falling back to the routine's target. A straight-sets day is
 * then one tap per set.
 */
export function prefillFor(sets, setIdx, fallback) {
  for (let i = setIdx - 1; i >= 0; i--) {
    const prior = sets[i];
    if (prior?.done) return { weight: prior.weight, reps: prior.reps };
  }
  return { weight: fallback?.weight ?? "", reps: fallback?.reps ?? "" };
}

/**
 * A session's movements IN THE ORDER THEY SHOULD BE DONE.
 *
 * Never Object.keys(entries): Firebase hands object keys back sorted
 * lexicographically, not in insertion order, so a session of
 * Squat → Bicep Curls → Tricep Extension came back starting at Bicep Curls.
 * Every entry therefore carries its own `order`, and anything written before
 * that existed falls back to the routine's order, then to the name.
 */
export function orderedMovements(entries, routine) {
  const fallback = new Map(
    (routine?.movements || []).map((movement, index) => [movement.movementId, index])
  );
  return Object.entries(entries || {})
    .map(([name, entry]) => ({
      name,
      entry,
      order:
        typeof entry.order === "number"
          ? entry.order
          : fallback.has(name)
          ? fallback.get(name)
          : Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(({ name, entry }) => [name, entry]);
}

/** Flat [movementIndex, setIndex] walk order over a session's entries. */
export function setOrder(entries, routine) {
  const order = [];
  orderedMovements(entries, routine).forEach(([name, entry], movementIndex) => {
    (entry.sets || []).forEach((_, setIndex) => {
      order.push({ name, movementIndex, setIndex });
    });
  });
  return order;
}

/** The first not-yet-logged set, which is where the session resumes. */
export function firstPendingSet(entries, routine) {
  return setOrder(entries, routine).find(
    ({ name, setIndex }) => !entries[name]?.sets?.[setIndex]?.done
  );
}

export function countSets(entries) {
  let done = 0;
  let total = 0;
  Object.values(entries || {}).forEach((entry) => {
    (entry.sets || []).forEach((set) => {
      total += 1;
      if (set?.done) done += 1;
    });
  });
  return { done, total };
}
