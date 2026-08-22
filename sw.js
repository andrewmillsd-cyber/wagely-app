/* ============================================================
   SERVICE WORKER — app-shell caching for offline/installed use
   Strategy: network-first for the page itself (so anyone online
   always gets the latest version, never a stale cached copy of a
   payroll app), falling back to the last successfully cached copy
   when offline. Deliberately does NOT intercept anything else --
   API calls to the backend always go straight to the network
   untouched, since payroll data must never be served from a cache.
   ============================================================ */
const CACHE_NAME = 'wage-app-swd-shell-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(self.registration.scope))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle the actual page navigation (loading the app itself).
  // Everything else -- API calls, anything else -- passes straight
  // through untouched.
  if (req.mode !== 'navigate') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match(self.registration.scope))
      )
  );
});
