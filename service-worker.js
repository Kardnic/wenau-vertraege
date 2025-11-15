//------------------------------------------------------------
// Service Worker – PWA offline
//------------------------------------------------------------

const CACHE = "wenau-cache-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./app.js",
        "./db.js",
        "./export.js",
        "./import.js",
        "./pdf.js",
        "./manifest.json",
        "./assets/logo.png"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
