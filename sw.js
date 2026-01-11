const CACHE_VERSION = 3;
const CACHE_NAME = `image-resizer-v${CACHE_VERSION}`;
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
  // Сразу активируем новый SW
  self.skipWaiting();
});

// Активация - удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.startsWith('image-resizer-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  // Берём контроль над всеми клиентами
  self.clients.claim();
});

// Запросы - network-first для HTML/CSS/JS, cache-first для статики
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Пропускаем внешние запросы
  if (url.origin !== self.location.origin) {
    return;
  }

  // Для HTML, CSS, JS - сначала сеть
  if (event.request.destination === 'document' ||
      event.request.destination === 'script' ||
      event.request.destination === 'style' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css')) {

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
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Для остального - сначала кэш (иконки и т.д.)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});

// Слушаем сообщения от клиента
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
