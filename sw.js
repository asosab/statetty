var CACHE_NAME = 'statetty-images-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_NAME; })
          .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  if (request.method !== 'GET') return;
  if (request.destination !== 'image') return;

  var url = new URL(request.url);
  if (url.hostname === 'tile.openstreetmap.org') return;

  event.respondWith(staleWhileRevalidate(request));
});

function staleWhileRevalidate(request) {
  var cachePromise = caches.open(CACHE_NAME);

  return cachePromise.then(function (cache) {
    return cache.match(request).then(function (cachedResponse) {
      var fetchPromise = fetch(request).then(function (networkResponse) {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      });

      if (cachedResponse) {
        fetchPromise.catch(function () {});
        return cachedResponse;
      }

      return fetchPromise;
    });
  });
}
