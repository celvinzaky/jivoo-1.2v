// JIVOO Cashier Service Worker - offline first
const CACHE = 'jivoo-cashier-v1';
const SHELL = [
  '/cashier/', '/cashier/index.html', '/cashier/cashier.css', '/cashier/app.js',
  '/cashier/manifest.json', '/shared/core.js', '/shared/ui.js', '/shared/auth.js', '/assets/logo.png'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return; // API mutations lewat network langsung
  if (url.pathname.startsWith('/api/')) {
    // network-first, fallback ke cache shell saat offline (API gagal ditangani app layer)
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // stale-while-revalidate untuk static
  e.respondWith(caches.match(e.request).then(cached => {
    const net = fetch(e.request).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return res; })
      .catch(() => cached);
    return cached || net;
  }));
});