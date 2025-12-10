const CACHE_NAME = 'mbfd-checkout-v2';
const urlsToCache = [
  '/mbfd-checkout-system/',
  '/mbfd-checkout-system/index.html',
  '/mbfd-checkout-system/data/rescue_checklist.json'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing new service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell and checklist');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Network-first for HTML navigation requests (fixes blank page bug)
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the new version
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => {
          // Offline: serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Network-first for checklist JSON (always get latest when online)
  if (url.pathname.includes('rescue_checklist.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with latest version
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => {
          // Offline: serve cached version
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Cache-first for other resources (JS, CSS, images)
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating new service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated and taking control');
      return self.clients.claim(); // Take control immediately
    })
  );
});