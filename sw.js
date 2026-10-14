// A-96 app service worker: makes the app installable and opens it instantly from the device.
// Files are served from the device first and refreshed in the background (used from the next open).
// It never touches requests to Google, so dashboard data always comes from your sheets.
const CACHE = 'a96-shell-v2';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/logo-mark.svg',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(cache =>
    cache.match(e.request, { ignoreSearch: true }).then(hit => {
      const update = fetch(e.request).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; });
      if (hit) { e.waitUntil(update.catch(() => {})); return hit; }
      return update;
    })));
});
