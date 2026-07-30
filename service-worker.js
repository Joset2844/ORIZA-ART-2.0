// Service Worker de ORIZA ART
// Cachea únicamente el "shell" estático del sitio (HTML/íconos/manifest propios).
// NUNCA intercepta llamadas a Supabase ni a otros orígenes: esas siempre van a la red.

const CACHE_NAME = "oriza-shell-v1";

const ASSETS_PRECACHE = [
  "/admin-movil.html",
  "/admin-manifest.webmanifest",
  "/site.webmanifest",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/apple-touch-icon.png",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_PRECACHE))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn("SW: no se pudo precachear todo:", err))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo GET, y solo del propio origen. Supabase, fuentes de Google, CDN de Supabase JS, etc. pasan de largo.
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached);

      // Estrategia: mostrar caché al instante si existe, y refrescarla en segundo plano.
      return cached || fetchPromise;
    })
  );
});
