// Робота без інтернету: файли застосунку кешуються на пристрої.
// Коли мережа є — завжди береться найновіша версія з сайту.
const CACHE = 'doshka-v1';
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request).then(res => {
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    });
    net.catch(() => {});
    try {
      return await Promise.race([
        net,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))
      ]);
    } catch (err) {
      const hit = await cache.match(e.request, { ignoreSearch: true })
        || (e.request.mode === 'navigate' ? await cache.match('./index.html') : null);
      if (hit) return hit;
      try { return await net; } catch (_) { return Response.error(); }
    }
  })());
});
