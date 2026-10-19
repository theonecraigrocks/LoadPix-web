const CACHE = "loadpix-web-shell-v1";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./core.mjs", "./db.mjs", "./manifest.webmanifest", "./icon.svg", "./apple-touch-icon.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(name => name.startsWith("loadpix-web-shell-") && name !== CACHE).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
