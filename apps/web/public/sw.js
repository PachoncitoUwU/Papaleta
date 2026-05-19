const CACHE = "papaleta-v1";
const ASSETS = ["/", "/index.html", "/papaletaarriba.png", "/papaletaLogok.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => r)
      .catch(() => caches.match(e.request).then((m) => m || caches.match("/")))
  );
});
