// Monthly progress photos, stored entirely on-device via IndexedDB — no
// Firebase Storage involved, since that needs a paid plan. The tradeoff is
// real and deliberate: these photos live on this browser/device only, they
// don't sync like the rest of the app's data does. Keyed by uid so signing
// into a different account on the same browser can't see another
// account's photos.

const DB_NAME = "iron-log-photos";
const STORE_NAME = "photos";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const keyFor = (uid, monthKey) => `${uid}:${monthKey}`;

export async function savePhoto(uid, monthKey, file) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, keyFor(uid, monthKey));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/** Resolves to the stored Blob, or null if this month has no photo. */
export async function getPhoto(uid, monthKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(keyFor(uid, monthKey));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(uid, monthKey) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(keyFor(uid, monthKey));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
