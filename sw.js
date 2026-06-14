// Service Worker: macht das Spiel offline spielbar (App-Shell-Caching).
// Versionsnummer bei jeder Asset-Änderung erhöhen, damit der Cache erneuert wird.
const CACHE = 'solitaer-v1';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/game.js',
  './js/render.js',
  './js/cards.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Cache-first für eigene Assets; Netz als Fallback.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // nur eigene Dateien

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          // Erfolgreiche GETs nachträglich cachen (z. B. Navigationsanfragen).
          if (resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return resp;
        })
        .catch(() => {
          // Offline und nicht im Cache: für Navigationsanfragen index.html liefern.
          if (request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
