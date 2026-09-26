/* Service worker v7 (registered as sw.js?v=<app version> so every release installs a fresh worker)
   - HTML pages: NETWORK-FIRST (so updates appear immediately when online), cache fallback when offline
   - Icons/manifests: cache-first, refreshed in background
   - Notifies open pages when a new version is activated */
const VERSION = 'v400';
const CACHE = 'fluke-dash-' + VERSION;
const FILES = ['./', './index.html', './assembly.html', './vivarana-telugu.html', './manifest.json', './manifest-assembly.json', './google-sheet-telugu.html', './icon-192.png', './icon-512.png', './icon-assembly-192.png', './icon-assembly-512.png'];

self.addEventListener('message', e => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(cs => cs.forEach(c => c.postMessage({ type: 'UPDATED', version: VERSION })))
  );
});

function withTimeout(p, ms) {
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  const isDoc = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isDoc) {
    e.respondWith(
      withTimeout(fetch(e.request), 4000)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then(hit => {
        const net = fetch(e.request).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
