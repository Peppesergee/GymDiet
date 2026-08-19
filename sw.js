// Service worker: l'app funziona offline, ma gli aggiornamenti arrivano subito.
// Strategia: prima la rete (con timeout), la cache come riserva. Con la
// strategia opposta un file corretto restava invisibile per due avvii.
const CACHE = 'gymdiet-v3';   // allineare a js/versione.js
const TIMEOUT_RETE = 3500;

const RISORSE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/ui.js',
  './js/store.js',
  './js/genera.js',
  './js/versione.js',
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

// la pagina puo' chiedere di saltare l'attesa (pulsante "aggiorna ora")
self.addEventListener('message', ev => {
  if (ev.data === 'aggiorna') self.skipWaiting();
});

function conTimeout(promessa, ms) {
  return new Promise((risolvi, rifiuta) => {
    const t = setTimeout(() => rifiuta(new Error('timeout')), ms);
    promessa.then(v => { clearTimeout(t); risolvi(v); }, e => { clearTimeout(t); rifiuta(e); });
  });
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  ev.respondWith((async () => {
    try {
      const risposta = await conTimeout(fetch(req), TIMEOUT_RETE);
      if (risposta && risposta.status === 200) {
        const copia = risposta.clone();
        caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {});
      }
      return risposta;
    } catch (e) {
      const salvata = await caches.match(req);
      if (salvata) return salvata;
      if (req.mode === 'navigate') {
        const indice = await caches.match('./index.html');
        if (indice) return indice;
      }
      throw e;
    }
  })());
});
