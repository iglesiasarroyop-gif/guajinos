const CACHE_NAME = 'guajinos-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './game-engine.js',
  './game-ui.js',
  './game-data.js',
  './league-engine.js',
  './equipos-inline.js',
  './menu_background_v2.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});
