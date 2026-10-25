// Service worker minimo di AG Workspace.
// NON mette in cache pagine o dati (contengono dati personali e richiedono login):
// conserva solo la pagina statica /offline.html, mostrata quando manca la rete.
const OFFLINE_CACHE = "ag-offline-v3"; // v3: pagina offline con tema chiaro/scuro
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(OFFLINE_CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" }))),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Rimuove eventuali cache di versioni precedenti.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Solo le navigazioni (apertura di una pagina): tutto il resto passa invariato.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(OFFLINE_URL).then((res) => res ?? Response.error()),
    ),
  );
});
