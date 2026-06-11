'use strict';
/* sw.js — funzionamento offline.
   Per pubblicare un aggiornamento dell'app: cambia il numero di VERSION. */
const VERSION = 'giorgio-stats-v1.0.0';
const FONT_CACHE = VERSION + '-fonts';

const CORE = [
  './',
  './index.html',
  './styles.css',
  './core.js',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Google Fonts: cache-first runtime (disponibili offline dopo il primo avvio) */
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(req).then(hit =>
          hit || fetch(req).then(res => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(() => hit)
        )
      )
    );
    return;
  }

  /* App shell (stessa origine): cache-first, con fallback rete e fallback navigazione */
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then(cache => cache.put(req, copy));
          }
          return res;
        }).catch(() => {
          if (req.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        })
      )
    );
  }
});
