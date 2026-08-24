// Deliberately minimal: this exists so the app satisfies "Add to Home
// Screen" / install-prompt criteria on Android, not to cache anything.
// Every request just goes straight to the network — no offline cache, so a
// deploy is never masked by a stale cached copy of the app.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // No-op: letting the browser handle every request normally.
});
