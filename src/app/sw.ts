/// <reference lib="webworker" />
/// <reference lib="dom" />

const CACHE_NAME = 'tailspin-dictionary-v1';
const DICTIONARY_API_PATTERN = /\/api\/dictionary\/.*/;

addEventListener('install', ((event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/api/dictionary/metadata',
        // Add other static dictionary resources
      ]);
    })
  );
}) as EventListener);

addEventListener('activate', ((event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('tailspin-dictionary-'))
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
}) as EventListener);

addEventListener('fetch', ((event: FetchEvent) => {
  if (event.request.url.match(DICTIONARY_API_PATTERN)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          // Return cached response
          return response;
        }

        return fetch(event.request).then((response) => {
          // Don't cache if not successful
          if (!response || response.status !== 200) {
            return response;
          }

          // Clone the response as it can only be consumed once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
    );
  }
}) as EventListener); 