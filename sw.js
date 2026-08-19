// Service worker: l'app funziona anche offline.
const CACHE = 'gymdiet-v1';
const RISORSE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/ui.js',
  './js/store.js',
  './js/genera.js',
  './js/anim.js',
  './js/poses.js',
  './js/exercises.js',
  './js/alimenti.js',
  './js/nutrizione.js',
  './js/dieta.js',
  './js/allenamento.js',
  './js/views/oggi.js',
  './js/views/scheda.js',
  './js/views/dietaview.js',
  './js/views/progressi.js',
  './js/views/profilo.js',
  './js/views/wizard.js',
  './js/views/esercizio.js',
  './js/views/sessione.js',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(RISORSE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(chiavi.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  ev.respondWith(
    caches.match(req).then(risposta => {
      const rete = fetch(req)
        .then(r => {
          if (r && r.status === 200) {
            const copia = r.clone();
            caches.open(CACHE).then(c => c.put(req, copia));
          }
          return r;
        })
        .catch(() => risposta || caches.match('./index.html'));
      return risposta || rete;
    })
  );
});
