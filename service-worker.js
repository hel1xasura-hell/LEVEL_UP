/**
 * LEVEL UP — Service Worker
 *
 * Strategy: cache-first for the app shell (HTML/CSS/JS/icons), so the
 * app opens instantly and works with no network at all after first
 * visit. Bump CACHE_VERSION whenever shell files change so old
 * caches get cleaned up.
 */

const CACHE_VERSION = "levelup-shell-v4";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/theme.css",
  "./css/base.css",
  "./css/navigation.css",
  "./css/dashboard.css",
  "./css/components.css",
  "./js/app.js",
  "./js/store.js",
  "./js/achievements.js",
  "./js/components/forgeRing.js",
  "./js/components/charts.js",
  "./js/modules/dashboard.js",
  "./js/modules/training.js",
  "./js/modules/brain.js",
  "./js/modules/progress.js",
  "./js/modules/settings.js",
  "./js/data/quotes.js",
  "./js/db/db.js",
  "./js/db/seed.js",
  "./js/utils/dateUtils.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
