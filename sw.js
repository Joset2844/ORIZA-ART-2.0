/*=============================================
  SERVICE WORKER — ORIZA ART 2.1
  - HTML / JS / CSS: Network-First (los cambios se ven al instante; caché solo si no hay red)
  - Imágenes: Cache-First
  - Supabase REST: Network-First
  Para forzar una actualización general: sube el número de CACHE_NAME.
=============================================*/

const CACHE_NAME = 'oriza-art-v4';
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

// 1. Instalación: precarga tolerante (un archivo que no exista ya no rompe la instalación)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] No se pudo precargar:', url, err))
        )
      )
    ).then(() => self.skipWaiting())
  );
});

// 2. Activación: borra cachés de versiones anteriores
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 3. Intercepción de red
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET' || !url.protocol.startsWith('http')) return;

  const esSupabase = url.hostname.endsWith('supabase.co');

  // A) Imágenes (Cache-First). Las fotos del admin llevan ?v=timestamp, así que al cambiar se descargan de nuevo.
  if (req.destination === 'image' || url.pathname.endsWith('.webp') || (esSupabase && url.pathname.includes('/storage/'))) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const net = await fetch(req);
          if (net.ok) cache.put(req, net.clone());
          return net;
        } catch (err) {
          return Response.error();
        }
      })
    );
    return;
  }

  // B) API REST de Supabase (Network-First)
  if (esSupabase && url.pathname.includes('/rest/v1/')) {
    event.respondWith(
      fetch(req)
        .then((net) => {
          if (net.ok) {
            const copy = net.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return net;
        })
        .catch(async () => (await caches.match(req)) || Response.error())
    );
    return;
  }

  // C) Páginas, JS y CSS (Network-First: siempre lo más nuevo; caché solo sin conexión)
  event.respondWith(
    fetch(req)
      .then((net) => {
        if (net.ok && url.origin === self.location.origin) {
          const copy = net.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return net;
      })
      .catch(async () => (await caches.match(req)) || Response.error())
  );
});
