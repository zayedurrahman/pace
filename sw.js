/* Bump this name for each app-shell release. All paths are relative to the
   registered scope, which keeps both /pace/ and root deployments working. */
const CACHE_NAME = 'pace-shell-v4';
const BASE = new URL('./', self.registration.scope);
const SHELL = ['.', 'index.html', 'manifest.json', 'pace.css', 'pace-enhancements.js', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL.map(path => new URL(path, BASE)))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('pace-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).then(response => { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(new URL('index.html',BASE),copy)); return response; }).catch(() => caches.match(new URL('index.html',BASE))));
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(response => {
    if (response.ok) { const copy=response.clone(); caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)); }
    return response;
  })));
});
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });
