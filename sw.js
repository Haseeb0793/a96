// A-96 app service worker: makes the app installable and lets it open without a connection.
// The page itself (index.html) is always fetched fresh when online, so changes on GitHub show up on the next open;
// the saved copy is only used when there is no connection. Icons are served from the device.
// It never touches requests to Google, so dashboard data always comes from your sheets.
// It also receives phone alerts through OneSignal (see the importScripts line below).
// Phone and desktop alerts (OneSignal). If it can't load, the app still works offline as before.
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch (e) {}

const CACHE = 'a96-shell-v5';
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
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isPage = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname) || /\.(html|webmanifest)$/.test(url.pathname);
  if (isPage) {
    // Network first (no browser cache), saved copy only when offline.
    e.respondWith(fetch(req, { cache: 'no-store' })
      .then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.open(CACHE).then(cache =>
    cache.match(req, { ignoreSearch: true }).then(hit => {
      const update = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
      if (hit) { e.waitUntil(update.catch(() => {})); return hit; }
      return update;
    })));
});
