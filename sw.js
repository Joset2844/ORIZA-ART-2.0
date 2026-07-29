/*=============================================
  SERVICE WORKER — ORIZA ART 2.0
  Estrategia mixta: Stale-While-Revalidate & Cache-First
=============================================*/

const CACHE_NAME = 'oriza-art-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/catalogo.html',
  '/css/style.css',
  '/js/config.js',
  '/js/global.js',
  '/js/api.js',
  '/js/main.js',
  '/js/catalogo.js',
  '/js/carrito.js'
];

// 1. Instalación y Precaché de recursos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('⚡ [SW] Precargando assets estáticos...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activación y Limpieza de cachés obsoletas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Intercepción Inteligente de Red
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar peticiones no GET o de extensiones
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // ESTRATEGIA A: Imágenes del Bucket / WebP (Cache-First)
  if (req.destination === 'image' || url.pathname.endsWith('.webp') || url.hostname.includes('supabase.co/storage')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(req);
        if (cachedResponse) return cachedResponse;

        try {
          const networkResponse = await fetch(req);
          if (networkResponse.ok) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Si falla y no está en caché, retorna fallback si aplica
          return cachedResponse;
        }
      })
    );
    return;
  }

  // ESTRATEGIA B: Peticiones a la API de Supabase REST (Network-First)
  if (url.hostname.includes('supabase.co') && url.pathname.includes('/rest/v1/')) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ESTRATEGIA C: Assets estáticos (Stale-While-Revalidate)
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, networkResponse));
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});