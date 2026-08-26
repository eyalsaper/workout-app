/*
 * Offline-first service worker.
 *
 * The app has to work in a basement with no signal — logging, history,
 * charts, records and art all come from local state, so the only thing
 * standing between the user and a working app is whether the shell and the
 * assets are on the device.
 *
 * Strategy (§10.6):
 *   - navigations: network first, cache fallback, so a deploy is picked up
 *     immediately when online and the app still opens when it is not;
 *   - same-origin assets (JS, CSS, art, icons): cache first, because they are
 *     content-hashed or static and re-fetching them offline is pointless;
 *   - Firebase and everything cross-origin: never touched. Its own SDK
 *     handles retries, and caching a sync endpoint would serve stale data.
 *
 * A failed fetch never blanks a screen: every path falls back to the cache,
 * and a miss returns a 504 the app can ignore rather than an exception.
 */

const VERSION = "iron-log-v2";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

// Everything needed to paint the first screen with no network at all.
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./art/library.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      // One bad URL must not fail the whole install, so each is added alone.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

/** Network first: fresh when online, cached when not. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // A navigation offline with nothing cached still gets the shell.
    const shell = await cache.match("./index.html");
    if (shell) return shell;
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

/** Cache first: the asset does not change under a given URL. */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Firebase, Google Fonts, anything not ours: let the network handle it.
  // The Firebase SDK has its own retry and offline behaviour, and caching a
  // sync endpoint would hand the app stale training data.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL));
    return;
  }

  event.respondWith(cacheFirst(request, ASSETS));
});
