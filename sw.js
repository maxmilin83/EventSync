const CACHE_NAME = 'eventsync-cache-v2';
const urlsToCache = [
  '/', 
  'index.html', 
  'pages/myevents.html', 
  'pages/login.html',
  'js/app.js', 
  'js/index.js', 
  'js/myevents.js', 
  'js/login.js',
  'js/firebase.js', 
  'css/styles.css', 
  'css/login.css',
  'icons/icon-192x192.png', 
  'icons/icon-512x512.png', 
  'manifest.json', 
  'sw.js', 
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch resources from cache first
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Activate 
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
});
