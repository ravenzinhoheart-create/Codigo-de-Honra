
/* Código de Honra MC Brasil — PWA service worker.
 * Cacheia somente arquivos estáticos do próprio app.
 * Atualize CACHE_VERSION ao publicar mudanças.
 */
const CACHE_VERSION = 'cdhmc-static-v11';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './css/core/reset.css',
  './css/core/variables.css',
  './css/core/typography.css',
  './css/core/layout.css',
  './css/core/animations.css',
  './assets/icons/app/icon-192.png',
  './assets/icons/app/icon-512.png',
  './assets/icons/app/icon-maskable-512.png',
  './assets/icons/app/apple-icon-touch.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith('cdhmc-static-') &&
            key !== CACHE_VERSION
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  // Navegação: tenta a rede primeiro.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            caches.open(CACHE_VERSION)
              .then(cache =>
                cache.put('./index.html', response.clone())
              );
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match('./index.html')) ||
          Response.error()
        )
    );
    return;
  }

  // Recursos estáticos: usa o cache quando disponível.
  if (/\.(?:css|js|png|jpe?g|webp|svg|woff2?|ttf|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response && response.ok && response.type === 'basic') {
            caches.open(CACHE_VERSION)
              .then(cache => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
  }
});
