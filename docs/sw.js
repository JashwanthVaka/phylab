/**
 * KINETIQ's service worker.
 *
 * The app already detected going offline and queued changes, but nothing was
 * cached, so losing connection lost the site. This precaches the shell and
 * serves content from cache when the network is unavailable — useful on a
 * train, and it makes repeat visits instant.
 *
 * The tutor is deliberately never cached: /api/chat must reach the server or
 * fail honestly, and a stale answer would be worse than none.
 */
const VERSION = 'kinetiq-v1';
const SHELL = `${VERSION}-shell`;
const CONTENT = `${VERSION}-content`;

// Resolve relative to the worker's own scope, so this works both at the site
// root and under a project path such as /phylab/.
const scoped = path => new URL(path, self.registration.scope).toString();

const SHELL_FILES = ['', 'index.html', 'styles.css', 'app.js', 'public-env.js'].map(scoped);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL)
      // Individual failures must not abort the whole install.
      .then(cache => Promise.allSettled(SHELL_FILES.map(file => cache.add(file))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the tutor or the provider probe: an answer must be live or absent.
  if (url.pathname.includes('/api/chat') || url.pathname.includes('/api/ai/')) return;

  // Navigations: try the network first so a deploy is picked up, fall back to
  // the cached shell so deep links still open offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(SHELL).then(cache => cache.put(scoped('index.html'), copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(scoped('index.html')).then(cached => cached || caches.match(scoped(''))))
    );
    return;
  }

  // Everything else: serve from cache immediately, and refresh it in the background.
  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const bucket = url.pathname.includes('/api/content/') ? CONTENT : SHELL;
            const copy = response.clone();
            caches.open(bucket).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
