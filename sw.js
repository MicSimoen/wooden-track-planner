// Offline cache for Wooden Track Planner.
// Bump VERSION whenever you change index.html so iPads pick up the new version.
const VERSION = "v16";
const CACHE = "track-planner-" + VERSION;
const APP = ["./", "index.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const LIBS = [
  "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js",
  "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
  "https://cdn.jsdelivr.net/npm/polygon-clipping@0.15.7/dist/polygon-clipping.umd.min.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(APP);
    // the 3D library is cached too, so the 3D view works offline; ignore if unreachable
    await Promise.all(LIBS.map(u => c.add(new Request(u, {mode: "cors"})).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k.startsWith("track-planner-") && k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

// Network first for the page itself (so updates show up when online), cache first for everything else.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const isPage = req.mode === "navigate";
  e.respondWith(isPage
    ? fetch(req).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); return r; })
        .catch(() => caches.match("index.html"))
    : caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r.ok && (req.url.startsWith(self.location.origin) || LIBS.includes(req.url))) {
          const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy));
        }
        return r;
      }))
  );
});
