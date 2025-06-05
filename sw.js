self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open('point-collector-hid-v1').then(c=>c.addAll([
      './index.html',
      './app.js',
      './manifest.json'
    ]))
  );
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=>r || fetch(e.request)));
});
