// Minimal service worker. It exists so the app meets the browser's
// installability requirements; requests continue to use the network normally.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: the browser handles the request over the network.
});
