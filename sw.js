const CACHE_NAME = 'luna-snake-quest-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/levels.js',
  './js/snake-renderer.js',
  './js/audio.js',
  './js/input.js',
  './js/game.js',
  './js/ui.js',
  './js/main.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/backgrounds/level1.png',
  './assets/backgrounds/level2.png',
  './assets/backgrounds/level3.png',
  './assets/backgrounds/level4.png',
  './assets/backgrounds/level5.png',
  './assets/backgrounds/level6.png',
  './assets/backgrounds/level7.png',
  './assets/backgrounds/level8.png',
  './assets/backgrounds/level9.png',
  './assets/backgrounds/level10.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      // Cache new assets dynamically (like backgrounds)
      if (resp.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return resp;
    }))
  );
});
