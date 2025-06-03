import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin, Queue } from 'workbox-background-sync';

declare let self: ServiceWorkerGlobalScope;

// Precache static resources
precacheAndRoute(self.__WB_MANIFEST);

// Cache dictionary API responses with network-first strategy for fresh data
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/dictionary'),
  new NetworkFirst({
    cacheName: 'dictionary-api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 hours
        purgeOnQuotaError: true,
      }),
      new BackgroundSyncPlugin('dictionary-sync-queue', {
        maxRetentionTime: 24 * 60, // Retry for 24 hours
        onSync: async ({ queue }: { queue: Queue }) => {
          try {
            await queue.replayRequests();
          } catch (error) {
            console.error('Dictionary sync failed:', error);
          }
        },
      }),
    ],
  })
);

// Cache dictionary prefix data with cache-first strategy for performance
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/dictionary/prefix'),
  new CacheFirst({
    cacheName: 'dictionary-prefix-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200, // Increased from 100 to store more prefixes
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache common word lists with stale-while-revalidate strategy
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/dictionary/common'),
  new StaleWhileRevalidate({
    cacheName: 'dictionary-common-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Listen for dictionary update messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_DICTIONARY_CACHE') {
    Promise.all([
      caches.delete('dictionary-api-cache'),
      caches.delete('dictionary-prefix-cache'),
      caches.delete('dictionary-common-cache'),
    ]).then(() => {
      // Notify clients that cache was cleared
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'DICTIONARY_CACHE_CLEARED',
          });
        });
      });
    });
  }
});

// Handle offline fallback
self.addEventListener('fetch', (event) => {
  if (!navigator.onLine) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // If no cache match, return a custom offline response for dictionary requests
        if (event.request.url.includes('/api/dictionary')) {
          return new Response(
            JSON.stringify({
              error: 'offline',
              message: 'You are currently offline. Please check your connection.',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
              status: 503,
            }
          );
        }
        
        // Return a default offline response
        return new Response(
          JSON.stringify({
            error: 'offline',
            message: 'You are currently offline.',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          }
        );
      })()
    );
  }
}); 