/* Bump CACHE on every deploy — a stale shell is the classic PWA support call. */
const CACHE = 'thirty-day-training-v4-input-styling';

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'brand.js',
  'cloud.js',
  'data/curriculum.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache the ledger. An offline read must come from the app's own cache
  // layer, not from a stale HTTP response that looks authoritative.
  if (url.pathname.startsWith('/api/') || url.hostname.endsWith('workers.dev')) return;

  // Shell: cache-first, refreshed in the background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.ok) {
              caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});
