const CACHE = 'tend-v7';
const PRECACHE = [
  '/',
  '/Tend_production.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // External requests (CDN, Supabase, fonts): network-first, cache as fallback
  if (url.origin !== self.location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          if (r && r.status === 200 && r.type !== 'opaque') {
            caches.open(CACHE).then(c => c.put(e.request, r.clone()));
          }
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Local assets: cache-first, update cache in background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networked = fetch(e.request).then(r => {
        if (r && r.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, r.clone()));
        }
        return r;
      }).catch(() => null);
      return cached || networked;
    })
  );
});
