const CACHE_NAME = "time-shell-v3";
const OFFLINE_URL = "/offline";
const SHELL = ["/", OFFLINE_URL, "/manifest.webmanifest", "/icons/time-192.png", "/icons/time-512.png", "/icons/time-maskable-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    // Sem rede: página própria de "você está offline". Antes caía em "/", a
    // landing de vendas, e o membro logado achava que o app tinha quebrado.
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? (await caches.match("/")) ?? Response.error()));
    return;
  }

  if (url.pathname.startsWith("/_next/") || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".svg")) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      const copy = response.clone();
      void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      return response;
    })));
  }
});
