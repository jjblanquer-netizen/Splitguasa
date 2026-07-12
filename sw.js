// SplitGuasa Service Worker
const CACHE = 'splitguasa-v17';
const ASSETS = [
  '/Splitguasa/index-firebase.html',
  '/Splitguasa/manifest-v2.json',
  '/Splitguasa/icon-192.png',
  '/Splitguasa/icon-512.png'
];

// Instalar: cachear los archivos base
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // addAll falla entero si un archivo falta: los añadimos uno a uno
      return Promise.all(ASSETS.map(function(url) {
        return c.add(url).catch(function() { /* ignorar el que falle */ });
      }));
    })
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

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Datos de Firebase: SIEMPRE red, nunca cache (deben estar al dia)
  if (url.indexOf('firebasedatabase.app') !== -1) {
    return;
  }

  // IMAGENES DE FONDO: cache primero.
  // Son archivos grandes que no cambian. Si estan en cache, se sirven al
  // instante sin depender de la red. Esto evita que "a veces no carguen".
  if (url.indexOf('/backgrounds/') !== -1) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        if (cached) return cached;
        return fetch(e.request).then(function(res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  // RESTO: red primero, con respaldo en cache (para funcionar offline)
  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        if (res && res.status === 200 && e.request.method === 'GET') {
          var copy = res.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return res;
      })
      .catch(function() {
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/Splitguasa/index-firebase.html');
        });
      })
  );
});
