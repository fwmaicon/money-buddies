/* Money Buddies service worker: offline cache + background due-date reminders where supported. */
const CACHE = 'mb-v2';
const ASSETS = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so updates arrive quickly; fall back to cache when offline.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((res) => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./'))));
});

// Android Chrome (installed app): wake up roughly twice a day and check reminders.
function readState() {
  return new Promise((resolve) => {
    const req = indexedDB.open('mb', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const get = req.result.transaction('kv').objectStore('kv').get('state');
      get.onsuccess = () => resolve(get.result ? JSON.parse(get.result) : null);
      get.onerror = () => resolve(null);
    };
  });
}
async function backgroundCheck() {
  const S = await readState();
  if (!S || !S.settings || !S.settings.notify) return;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  const ym = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  const ymd = (d) => `${ym(d)}-${pad(d.getDate())}`;
  const shownKey = 'bg:' + ymd(t);
  const cache = await caches.open('mb-bg');
  if (await cache.match(shownKey)) return;
  const due = [];
  for (let i = 0; i <= 1; i++) {
    const y = t.getFullYear(), m = t.getMonth() + i;
    for (const b of S.bills || []) {
      let d;
      if (b.type === 'once') { if (!b.date) continue; const [yy, mm, dd] = b.date.split('-').map(Number); d = new Date(yy, mm - 1, dd); if (d.getMonth() !== new Date(y, m, 1).getMonth() || d.getFullYear() !== new Date(y, m, 1).getFullYear()) continue; }
      else d = new Date(y, m, Math.min(b.day || 1, new Date(y, m + 1, 0).getDate()));
      if (d < t || (b.paid && b.paid[ym(d)])) continue;
      const days = Math.round((d - t) / 86400000);
      if ((b.reminders || []).some((n) => days <= n)) due.push({ b, days });
    }
  }
  if (!due.length) return;
  const body = due.map(({ b, days }) => `${b.name} ${days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}`).join(', ');
  await self.registration.showNotification('Billy says heads up!', { body: `Coming up: ${body}.`, icon: 'icons/icon-192.png', tag: 'mb-daily' });
  await cache.put(shownKey, new Response('1'));
}
self.addEventListener('periodicsync', (e) => { if (e.tag === 'mb-reminders') e.waitUntil(backgroundCheck()); });
