/* Service worker: deixa o app abrir sem internet no tablet. */
const CACHE = 'herois-rotina-v1';
const ARQUIVOS = [
  './', './index.html', './icone.svg', './manifest.webmanifest',
  './css/app.css', './js/store.js', './js/ui.js', './js/kid.js', './js/admin.js', './js/app.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// rede primeiro (pega atualizações), cache como rede de segurança
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
