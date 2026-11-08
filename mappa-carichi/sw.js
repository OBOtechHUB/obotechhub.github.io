/* Service worker minimo: rende il sito installabile come app. Non salva nulla in cache,
   così gli aggiornamenti del sito e i dati arrivano sempre dal server. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(e.request).catch(function () {
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font:16px system-ui;padding:32px"><h1>Sei offline</h1><p>Controlla la connessione e riapri l\'app.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }));
});
