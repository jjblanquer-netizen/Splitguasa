// SplitGuasa Service Worker
const CACHE = 'splitguasa-v14';
const ASSETS = [
  '/Splitguasa/index-firebase.html',
  '/Splitguasa/manifest-firebase.json',
  '/Splitguasa/icon-192.png',
  '/Splitguasa/icon-512.png'
];

// Instalar: cachear los archivos base
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

// Activar: limpiar cachés antiguas
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
        .map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Fetch: las peticiones a Firebase SIEMPRE van a la red (datos en vivo).
// El resto: network-first con fallback a caché (para funcionar offline).
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Datos de Firebase: siempre red, nunca caché
  if (url.indexOf('firebasedatabase.app') !== -1) {
    return; // dejar pasar a la red normal
  }

  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        // Guardar copia en caché para offline
        if (res && res.status === 200 && e.request.method === 'GET') {
          var copy = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return res;
      })
      .catch(function() {
        // Sin red: servir desde caché
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/Splitguasa/index-firebase.html');
        });
      })
  );
});
