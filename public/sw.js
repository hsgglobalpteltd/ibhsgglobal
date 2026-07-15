const CACHE_NAME = "ib-cache-v1";
const ASSETS_TO_CACHE = [
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png"
];

// Install Event - Pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first, pass-through for dynamic endpoints, static cache for assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass Cache: Dynamic requests, API calls, Firebase Auth / external origins
  if (
    event.request.method !== "GET" ||
    url.pathname.includes("/api/") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("firestore")
  ) {
    return;
  }

  // Handle caching for local static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache static files (e.g. images, assets) from the local origin dynamically
        if (
          response &&
          response.status === 200 &&
          response.type === "basic" &&
          (url.pathname.endsWith(".png") || url.pathname.endsWith(".ico") || url.pathname.endsWith(".svg"))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Silent fallback for network errors
      });
    })
  );
});
