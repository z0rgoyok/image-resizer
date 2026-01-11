const CACHE_NAME = 'image-resizer-v1';
const ASSETS = [
  '/image-resizer/',
  '/image-resizer/index.html',
  '/image-resizer/style.css',
  '/image-resizer/app.js',
  '/image-resizer/icon-192.png',
  '/image-resizer/icon-512.png'
];

// Установка - кэшируем файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация - удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Запросы - сначала сеть, потом кэш
self.addEventListener('fetch', (event) => {
  // Пропускаем внешние запросы (CDN библиотеки)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Кэшируем свежую копию
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // Офлайн - берём из кэша
        return caches.match(event.request);
      })
  );
});
