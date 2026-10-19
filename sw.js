
const CACHE_VERSION = 'cdhmc-static-v11';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './assets/icons/app/icon-192.png',
  './assets/icons/app/icon-512.png',
  './assets/icons/app/icon-512-maskable.png',
  './assets/icons/app/apple-icon-touch.png',
  './assets/images/branding/auth-background.png',
  './css/app.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) =>
            key.startsWith('cdhmc-static-') &&
            key !== CACHE_VERSION
          )
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION)
            .then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        if (event.request.mode === 'navigate') {
          return (await caches.match('./index.html')) ||
            Response.error();
        }

        return Response.error();
      })
  );
});
