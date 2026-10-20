const CACHE = "loadpix-web-shell-v3-gallery";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./core.mjs", "./paperwork.mjs", "./db.mjs", "./manifest.webmanifest", "./icon.svg", "./apple-touch-icon.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(name => name.startsWith("loadpix-web-shell-") && name !== CACHE).map(name => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const url = new URL(req.url);
  // Network first for app code so installed iPhones receive interface updates.
  // Cache fallback retains offline behavior and never clears IndexedDB photos.
  const isCode = req.mode === "navigate" || /\.(?:html|js|mjs|css)$/.test(url.pathname);
  if (isCode) {
    event.respondWith(
      fetch(req).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(req, copy)));
        }
        return response;
      }).catch(async () =>
        (await caches.match(req)) || (await caches.match("./index.html")) ||
        new Response("LoadPix offline. Reopen after reconnecting.",{status:503}))
    );
    return;
  }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req)));
});
