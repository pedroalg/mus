// Service worker: guarda el juego en el iPad para poder jugar sin conexión.
// La página se pide primero a la red (para recibir actualizaciones) y, si no hay red, sale de la caché.
// El resto (iconos, fuentes) sale de la caché y solo se pide a la red la primera vez.
const CACHE = 'mus-3835c7d84a';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

function store(req, res) {
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    caches.open(CACHE).then(c => c.put(req, copy));
  }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => store(req, res))
        .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))),
    );
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => store(req, res))));
});
