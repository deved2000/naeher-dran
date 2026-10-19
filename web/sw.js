// Service Worker: macht die Web-App offline nutzbar.
// Bei Änderungen an Dateien die Versionsnummer erhöhen, damit Geräte die neue Version laden.
var CACHE = "naeher-dran-v1";
var FILES = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "decks/klassisch.js",
  "decks/date.js",
  "fonts/Caladea-Regular.ttf",
  "fonts/Caladea-Italic.ttf",
  "fonts/Caladea-Bold.ttf",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Erst aus dem Netz (damit Updates sofort ankommen), offline aus dem Cache.
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(function (response) {
      if (response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request, { ignoreSearch: true });
    })
  );
});
