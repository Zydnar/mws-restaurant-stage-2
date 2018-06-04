let cache_name = "v1";

let delete_caches = function (event) {
  return event.waitUntil(
    caches.keys()
      .then(function (cacheNames) {
        return cacheNames
          .filter(function (cacheName) {
            return cacheName !== cache_name;
          })
          .map(function (cacheName) {
            return caches.delete(cacheName);
          });
      })
  );
};
addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(cache_name)
      .then(function (cache) {
        return cache.addAll(
          [
            '/',
            '/img/placeholder.jpg',
            '/img/placeholder-100-1x.jpg',
            '/img/placeholder-100-2x.jpg',
            '/img/placeholder-100-3x.jpg',
            '/sw.js',
            '/js/main.js',
            '/css/styles.css',
            '//cdnjs.cloudflare.com/ajax/libs/normalize/8.0.0/normalize.min.css',
          ]
        );
      })
  );
});

addEventListener('activate', function (event) {
  return delete_caches(event);
});

addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request)
      .then(function (response) {
        // comments from Mozilla MDN
        // caches.match() always resolves
        // but in case of success response will have value
        if (response !== void 0) {
          return response;
        } else {
          return fetch(event.request)
            .then((response) => {
              let responseClone;
              // response may be used only once
              // we need to save clone to put one copy in cache
              // and serve second one
              if (response && response.url) {
                responseClone = response.clone();
                const splited = responseClone.url.split('/');
                const file = splited[splited.length - 1];
                if (file === 'undefined.jpg') {
                  //return default image if not present
                  return caches.match('/img/placeholder.jpg').then(function (r) {
                    if (r) return r;
                  });
                } else if (splited[splited.length - 2] === 'restaurants') {
                  //do not cache API
                  return responseClone;
                } else {
                  caches
                    .open(cache_name)
                    .then((cache) => {
                        cache.put(event.request, responseClone);
                      }
                    );
                  caches.match(event.request).then(function (r) {
                    if (r) return r;
                  });
                }
              }
              return response;
            }).catch(function (err) {
              console.error(err);
              return new Response('404 failed', {
                status: 404,
                statusText: 'Not found'
              });
            });
        }
      }));
});

addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    return this.skipWaiting();
  }
});
