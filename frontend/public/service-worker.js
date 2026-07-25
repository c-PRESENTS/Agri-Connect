const CACHE_NAME = "agriconnect-static-v2";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-192x192.png",
  "/icons/maskable-icon-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith("agriconnect-") && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          if (response.ok) return response;
          if (response.status < 500) return response;
          return (await caches.match(request))
            || (await caches.match("/"))
            || new Response("AgriConnect is temporarily unavailable.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        })
        .catch(async () =>
          (await caches.match(request))
          || (await caches.match("/"))
          || new Response("AgriConnect is offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok) {
            const cacheableResponse = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheableResponse));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request))
          || new Response("Resource unavailable while offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          }),
        );
    }),
  );
});
