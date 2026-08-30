/*
 * The user's own images (§8.6).
 *
 * Blobs live in IndexedDB and never leave the device — no upload, no sync in
 * v2. Each file is downscaled to 820px on the long edge and re-encoded, which
 * also strips EXIF (canvas does not carry it through), so nothing with GPS in
 * it is kept.
 *
 * An entry is shaped exactly like a shipped one, so the picker cannot tell
 * them apart.
 */

const DB_NAME = "iron-log-art";
const STORE = "images";
const META = "meta";
const DB_VERSION = 1;

export const MAX_IMAGES = 60;
export const MAX_BYTES = 40 * 1024 * 1024;
export const MIN_EDGE = 600;
const LONG_EDGE = 820;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Runs one transaction and resolves with the request's result.
 *
 * `IDBRequest.result` is `undefined` for a key that is not there and for
 * every write, so this checks for an actual IDBRequest rather than testing
 * truthiness — otherwise an empty store resolves to the request object and
 * the caller tries to .map() it.
 */
function tx(db, store, mode, run) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const request = run(t.objectStore(store));
    t.oncomplete = () =>
      resolve(request instanceof IDBRequest ? request.result : request);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

/** Downscale to 820px on the long edge and re-encode. Rejects tiny images. */
async function normalise(file) {
  const bitmap = await createImageBitmap(file);
  const long = Math.max(bitmap.width, bitmap.height);
  if (long < MIN_EDGE) {
    bitmap.close?.();
    // Upscaling this into a hero would look terrible, so refuse it here
    // rather than shipping a blurry draw.
    throw new Error("too-small");
  }

  const scale = Math.min(1, LONG_EDGE / long);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) =>
    // PNG keeps transparency, which cut-out art usually has.
    canvas.toBlob(resolve, "image/png")
  );
  return { blob, width, height };
}

export async function listUserArt() {
  const db = await openDB();
  const entries = (await tx(db, META, "readonly", (store) => store.get("entries"))) || [];
  // Object URLs are minted per load and revoked when the list is replaced.
  const withUrls = await Promise.all(
    entries.map(async (entry) => {
      const blob = await tx(db, STORE, "readonly", (store) => store.get(entry.blobKey));
      return blob ? { ...entry, src: "user", blobUrl: URL.createObjectURL(blob) } : null;
    })
  );
  return withUrls.filter(Boolean);
}

export async function totalBytes() {
  const db = await openDB();
  const entries = (await tx(db, META, "readonly", (store) => store.get("entries"))) || [];
  return entries.reduce((sum, entry) => sum + (entry.bytes || 0), 0);
}

/**
 * Adds files to the pool. Returns what happened per file rather than throwing,
 * so a batch with one bad image still adds the rest.
 */
export async function addUserArt(files) {
  const db = await openDB();
  const entries = (await tx(db, META, "readonly", (store) => store.get("entries"))) || [];
  let bytes = entries.reduce((sum, entry) => sum + (entry.bytes || 0), 0);

  const added = [];
  const rejected = [];

  for (const file of files) {
    if (entries.length + added.length >= MAX_IMAGES) {
      rejected.push({ name: file.name, reason: "full" });
      continue;
    }
    try {
      const { blob } = await normalise(file);
      if (bytes + blob.size > MAX_BYTES) {
        rejected.push({ name: file.name, reason: "full" });
        continue;
      }
      const id = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      const blobKey = id;
      await tx(db, STORE, "readwrite", (store) => store.put(blob, blobKey));
      bytes += blob.size;
      added.push({
        id,
        blobKey,
        bytes: blob.size,
        // Every new image starts in `charge`, the pool asked for most often.
        moods: ["charge"],
        position: "center 25%",
      });
    } catch (error) {
      rejected.push({ name: file.name, reason: error.message === "too-small" ? "small" : "bad" });
    }
  }

  if (added.length) {
    await tx(db, META, "readwrite", (store) => store.put([...entries, ...added], "entries"));
  }
  return { added: added.length, rejected };
}

export async function updateUserArt(id, patch) {
  const db = await openDB();
  const entries = (await tx(db, META, "readonly", (store) => store.get("entries"))) || [];
  const next = entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry));
  await tx(db, META, "readwrite", (store) => store.put(next, "entries"));
}

export async function removeUserArt(id) {
  const db = await openDB();
  const entries = (await tx(db, META, "readonly", (store) => store.get("entries"))) || [];
  const target = entries.find((entry) => entry.id === id);
  if (target) await tx(db, STORE, "readwrite", (store) => store.delete(target.blobKey));
  await tx(db, META, "readwrite", (store) =>
    store.put(entries.filter((entry) => entry.id !== id), "entries")
  );
}
