// Service Worker di City News
// Due scopi:
// 1) Rendere l'app installabile e utilizzabile come "app" (guscio in cache di base)
// 2) Permettere le notifiche reali: su Android Chrome il costruttore diretto
//    `new Notification()` è spesso bloccato — bisogna passare da
//    self.registration.showNotification(), disponibile solo dentro un Service Worker.

const CACHE_NAME = 'citynews-shell-v1';
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_FILES).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache solo per il "guscio" statico dell'app: le chiamate a Google News / ANSA / Open-Meteo
// restano SEMPRE dirette in rete, altrimenti vedresti notizie e meteo non aggiornati.
self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;
  let url;
  try { url = new URL(event.request.url); } catch(e) { return; }
  if(url.origin !== self.location.origin) return; // non intercettare le API esterne

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => cached))
  );
});

// Click su una notifica: apre/porta in primo piano l'app sulla notizia relativa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data && event.notification.data.link;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if (link && 'postMessage' in client) {
            client.postMessage({ type: 'open-link', link });
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link || './index.html');
      }
    })
  );
});
