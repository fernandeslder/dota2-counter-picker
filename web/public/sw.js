// Tiny service worker. Pages and data: network-first (always fresh when online, cached copy offline).
// Hashed build assets (/assets/*): cache-first, since their filenames change on every build.
const CACHE = "d2cp-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
const store = (req, r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)); return r; };
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const hashed = new URL(req.url).pathname.startsWith("/assets/");
  e.respondWith(
    hashed
      ? caches.match(req).then((hit) => hit || fetch(req).then((r) => store(req, r)))
      : fetch(req, { cache: "no-cache" }).then((r) => store(req, r)).catch(() => caches.match(req))
  );
});
