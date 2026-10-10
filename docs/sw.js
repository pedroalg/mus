// Service worker: guarda el juego en el dispositivo para poder jugar totalmente sin conexión.
// El juego se abre siempre desde lo guardado, al instante y con o sin red. Si hay red, se baja
// la versión nueva en segundo plano y se usa la próxima vez que se abra.
const CACHE = 'mus-be8bec18dd';
const PAGE = './index.html';
const CORE = ['./', PAGE, './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

/** Pide a la red y, si responde bien, guarda la copia. Sin red, no hace nada. */
function refresh(req, key) {
  return fetch(req)
    .then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(key, res.clone()));
      return res;
    })
    .catch(() => undefined);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  // Abrir el juego (con o sin «?algo» detrás): siempre la página guardada, sea cual sea la dirección
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(PAGE).then(hit => {
        const update = refresh(req, PAGE);
        if (hit) {
          e.waitUntil(update);
          return hit;
        }
        return update.then(res => res || Response.error());
      }),
    );
    return;
  }

  // Iconos y demás: lo guardado; si no está, la red
  e.respondWith(caches.match(req).then(hit => hit || refresh(req, req).then(res => res || Response.error())));
});
