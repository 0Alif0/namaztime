const CACHE = 'namaz-polished-v2-20260908';
const ASSETS = [
  './','./index.html','./styles.css','./manifest.webmanifest','./sw.js',
  './src/app.js','./src/prayerEngine.js','./src/qibla.js','./src/storage.js','./src/location.js','./src/islamicCalendar.js','./src/notifications.js',
  './vendor/praytime.js','./icons/icon-192.png','./icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(response => {
    if (response && response.ok && new URL(event.request.url).origin === location.origin) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
    }
    return response;
  }).catch(() => caches.match('./index.html'))));
});
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'Namaz', body: event.data?.text?.() || 'Prayer reminder' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Namaz', {
    body: data.body || 'Prayer time',
    tag: data.tag || 'namaz-prayer',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    data: { url: data.url || './' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for (const client of list) if ('focus' in client) return client.focus();
    return clients.openWindow('./');
  }));
});
