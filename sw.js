/* Shadow Boxing service worker: offline-first with background refresh.
   When any file of the app changes, bump CACHE so every device downloads the new set. */
const CACHE = 'shadow-boxing-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './content.js',
  './app.js',
  './manifest.webmanifest',
  './fonts/big-shoulders-display-latin.woff2',
  './fonts/noto-sans-georgian-latin.woff2',
  './fonts/noto-sans-georgian-georgian.woff2',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      // refresh the cache in the background when online
      const refresh = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => null);

      if (cached) return cached;
      return refresh.then((res) => {
        if (res) return res;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
