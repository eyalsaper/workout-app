/*
 * The art library — no screen ever names an image file.
 *
 * A slot declares a MOOD (charge / triumph / calm / welcome) and this module
 * answers with a random image tagged that way. Adding art is a change to
 * public/art/library.json and nothing else; no component moves.
 *
 * Randomness needs stability rules, or the app flickers and reads as broken.
 * A draw is pinned to an EVENT, not to a render: the seed key is looked up
 * first, so a reload shows the same image and only the next session draws
 * fresh. See IRON-LOG-BUILD-SPEC §8.
 */

// Don't repeat an image within this many draws.
const RECENT = 6;
// artDraws is append-only otherwise, so trim it on launch.
const MAX_DRAWS = 200;
const MAX_RECENT = 24;

const DRAWS_KEY = "ironlog.artDraws";
const RECENT_KEY = "ironlog.artRecent";

export const MOODS = ["charge", "triumph", "calm", "welcome"];

export const MOOD_PURPOSE = {
  charge: "before and during the work",
  triumph: "after — finished, closed",
  calm: "doing nothing on purpose",
  welcome: "first open, empty states",
};

// ---------------------------------------------------------------- storage
// localStorage, not Firebase: a draw is a per-device presentation detail and
// syncing it would make two phones fight over which image today's hero shows.

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or blocked localStorage costs stability, never correctness —
    // every draw just re-rolls. Not worth surfacing to the user.
  }
}

// ------------------------------------------------------------ the library

let shipped = [];
let defaultPosition = "center 18%";
let isLoaded = false;

/**
 * Preferences the picker needs but cannot reach on its own — they live in
 * Firebase behind React context. Pushed in from a hook so pickArt() can stay
 * synchronous and callable straight from render.
 */
let prefs = {
  characterArt: true,
  artOnlyMine: false,
  hiddenIds: [],
  userImages: [],
};

/*
 * Anything that can change what a slot draws bumps this and tells its
 * listeners.
 *
 * A slot picks during render and memoises on its seed key, so without a
 * signal the first pick — taken before library.json has arrived, which
 * returns null — would be the only one it ever made. Whether art appeared at
 * all then came down to whether the fetch beat the first paint.
 */
let version = 0;
const listeners = new Set();

function bump() {
  version += 1;
  listeners.forEach((fn) => fn(version));
}

/** Current library revision. Changes when the library or preferences change. */
export function artVersion() {
  return version;
}

/** Subscribe to library and preference changes. Returns an unsubscribe. */
export function onArtChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setArtPreferences(next) {
  prefs = { ...prefs, ...next };
  bump();
}

/** Resolves a library entry's `file` against Vite's base (./ on Pages). */
export function artUrl(image) {
  if (!image) return null;
  if (image.src === "user") return image.blobUrl || null;
  return `${import.meta.env.BASE_URL}${image.file}`;
}

/**
 * Reads public/art/library.json once at boot. Fetched rather than imported
 * so that swapping the shipped set — which §8.7 flags as a release blocker,
 * since none of the 32 placeholders are licensed — needs no rebuild.
 */
export async function loadArtLibrary() {
  if (isLoaded) return shipped;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}art/library.json`);
    const data = await res.json();
    shipped = (data.images || []).map((image) => ({ ...image, src: "shipped" }));
    if (data.defaultPosition) defaultPosition = data.defaultPosition;
  } catch {
    // No library is a degraded surface, not a broken app: every slot falls
    // back to the plain --color-hero-a and the layout is unchanged.
    shipped = [];
  }
  isLoaded = true;
  pruneDraws();
  bump();
  return shipped;
}

/** Everything the picker may draw from right now, shipped plus the user's. */
function pool() {
  const mine = prefs.userImages || [];
  if (prefs.artOnlyMine) return mine;
  return [...shipped, ...mine];
}

function isEnabled(image) {
  if (image.src === "shipped" && prefs.hiddenIds?.includes(image.id)) return false;
  return true;
}

/** The enabled count per mood — what 8Q's MOODS IN USE card reports. */
export function moodCounts() {
  const counts = Object.fromEntries(MOODS.map((m) => [m, 0]));
  pool()
    .filter(isEnabled)
    .forEach((image) => {
      (image.moods || []).forEach((mood) => {
        if (mood in counts) counts[mood] += 1;
      });
    });
  return counts;
}

export function allImages() {
  return [...shipped, ...(prefs.userImages || [])];
}

export function libraryCount() {
  return pool().filter(isEnabled).length;
}

// ------------------------------------------------------------- the picker

const byId = (id) => allImages().find((image) => image.id === id) || null;

/**
 * A random enabled image for `mood`, pinned to `seedKey`.
 *
 * Looking the seed key up FIRST is the whole trick: the draw happens once,
 * and every render after it — including after a reload — returns the same
 * image. The seed key is what decides when art is allowed to change, so it
 * names the event it belongs to (see artSeed below).
 *
 * `exclude` carries the ids already drawn on this screen this render, so the
 * same image never appears twice on one screen.
 *
 * Returns null when art is off, the pool is empty, or the library failed to
 * load. Every caller treats null as "render the plain surface".
 */
export function pickArt(mood, seedKey, { exclude = [] } = {}) {
  if (!prefs.characterArt) return null;
  if (!seedKey) return null;

  const draws = load(DRAWS_KEY, {});
  const drawn = draws[seedKey] && byId(draws[seedKey]);
  // A pinned draw still has to be legal: the user may have hidden it, or
  // flipped "Only my images" since it was drawn.
  if (drawn && isEnabled(drawn) && !exclude.includes(drawn.id)) return drawn;

  const candidates = pool().filter(
    (image) => image.moods?.includes(mood) && isEnabled(image) && !exclude.includes(image.id)
  );
  if (!candidates.length) return null;

  const recent = load(RECENT_KEY, []);
  const fresh = candidates.filter((image) => !recent.slice(0, RECENT).includes(image.id));
  // Below two fresh options the anti-repeat rule would pin one image forever,
  // which is worse than an occasional repeat.
  const from = fresh.length >= 2 ? fresh : candidates;

  const pick = from[Math.floor(Math.random() * from.length)];
  save(DRAWS_KEY, { ...draws, [seedKey]: pick.id });
  save(RECENT_KEY, [pick.id, ...recent.filter((id) => id !== pick.id)].slice(0, MAX_RECENT));
  return pick;
}

/** That image's own background-position — per image, never per slot (§8.2). */
export function artPosition(image) {
  return image?.position || defaultPosition;
}

/** Drops the oldest seed keys so artDraws cannot grow without bound. */
function pruneDraws() {
  const draws = load(DRAWS_KEY, {});
  const keys = Object.keys(draws);
  if (keys.length <= MAX_DRAWS) return;
  const kept = Object.fromEntries(keys.slice(-MAX_DRAWS).map((k) => [k, draws[k]]));
  save(DRAWS_KEY, kept);
}

/** Forgets one pinned draw, so the slot re-rolls next render. */
export function clearDraw(seedKey) {
  const draws = load(DRAWS_KEY, {});
  delete draws[seedKey];
  save(DRAWS_KEY, draws);
}

// --------------------------------------------------------------- seed keys
/*
 * One place that names every seed key in the app, so the "when does this
 * change" rule from §8.3 is readable in a single screen of code rather than
 * scattered across seventeen pages.
 */

// Stable for as long as the tab is open — bands re-draw once per app launch.
const launchId = Math.random().toString(36).slice(2, 10);

export const artSeed = {
  today: (date, planDayId) => `today:${date}:${planDayId ?? "none"}`,
  rest: (date) => `rest:${date}`,
  session: (sessionId) => `session:${sessionId}`,
  finish: (sessionId) => `finish:${sessionId}`,
  record: (latestPrId) => `pr:${latestPrId ?? "none"}`,
  chapter: (chapterId) => `chapter:${chapterId}`,
  band: (screen) => `band:${screen}:${launchId}`,
  firstRun: () => "firstrun",
};
