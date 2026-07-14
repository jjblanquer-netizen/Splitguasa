// SplitGuasa Service Worker
const CACHE = 'splitguasa-v86';
const ASSETS = [
  '/Splitguasa/',
  '/Splitguasa/index.html',
  '/Splitguasa/manifest-v2.json',
  '/Splitguasa/icon-192.png',
  '/Splitguasa/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return Promise.all(ASSETS.map(function(url) {
        return c.add(url).catch(function() {});
      }));
    })
  );
  self.skipWaiting();
});

// Al activar: BORRAR todas las caches anteriores.
// Es lo que elimina la copia vieja de index-firebase.html que las PWA ya
// instaladas seguian sirviendo (por eso veian la app antigua).
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
        .map(function(k) { return caches.delete(k); }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Datos de Firebase: SIEMPRE red
  if (url.indexOf('firebasedatabase.app') !== -1) return;

  // index-firebase.html es ahora una REDIRECCION.
  // NUNCA servirla de cache: si no, las PWA instaladas seguirian abriendo
  // la copia antigua de la app que quedo guardada en esa ruta.
  if (url.indexOf('index-firebase.html') !== -1) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // Imagenes de fondo: cache primero (son grandes y no cambian)
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

  // Navegaciones (cargar la pagina): SIEMPRE red fresca, saltandose incluso la
  // cache HTTP del navegador. Si no, GitHub Pages puede devolver un index.html
  // viejo durante minutos y la app parece no actualizarse.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'reload' })
        .then(function(res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
          }
          return res;
        })
        .catch(function() {
          // Sin conexion: servir lo ultimo que tengamos guardado
          return caches.match(e.request).then(function(cached) {
            return cached || caches.match('/Splitguasa/');
          });
        })
    );
    return;
  }

  // Resto: red primero, cache como respaldo (para funcionar sin conexion)
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
          return cached || caches.match('/Splitguasa/');
        });
      })
  );
});
