// Minimal PWA Service Worker for Admin installability.
// Bypasses audio/Range streams and non-GET API calls so media playback
// on iOS Safari / Android never suffers SW interception issues.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.headers.has("range")) {
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(fetch(request));
  }
});
