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
// Stamped by tools/build-static.mjs at build time so every deploy retires the
// previous caches outright. It stays literal when the site is served straight
// from the repository, which is fine: code is fetched network-first below, so
// a stale version string can no longer serve stale code.
const VERSION = 'kinetiq-__BUILD__';
const SHELL = `${VERSION}-shell`;
const CONTENT = `${VERSION}-content`;

// Resolve relative to the worker's own scope, so this works both at the site
// root and under a project path such as /phylab/.
const scoped = path => new URL(path, self.registration.scope).toString();

const SHELL_FILES = ['', 'index.html', 'styles.css', 'app.js', 'public-env.js',
  'manifest.json', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'].map(scoped);

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

  // The app's own code goes to the network first.
  //
  // This used to be cache-first with a background refresh, which is the right
  // shape for content and the wrong shape for code. KINETIQ is split across
  // thirty-odd ES modules loaded on demand, and each one was cached and
  // refreshed independently. After a deploy a returning visitor therefore ran
  // whichever mixture their browser happened to hold: new styles.css against
  // an older module, or the reverse. That is not a slow app, it is a
  // different app from the one that was tested, and it is why a shipped fix
  // could still look unshipped on the very next visit.
  //
  // The cache is still there and still answers the moment the network does
  // not, so the offline case is unchanged. What changes is which one is asked
  // first.
  const isAppCode = /\.(?:js|mjs|css|html)$/.test(url.pathname) || url.pathname.endsWith('/');
  if (isAppCode) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(SHELL).then(cache => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Content and assets: serve from cache immediately, refresh in the
  // background. A lesson that is one visit out of date costs nothing, and
  // answering instantly on a train is worth a great deal.
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
