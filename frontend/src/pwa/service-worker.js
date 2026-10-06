/* Build template: generated public/sw.js receives the actual Next build id. */
const CACHE_PREFIX = "karmatch-pwa-";
const CACHE_NAME = CACHE_PREFIX + "__BUILD_ID__";
const OFFLINE_URL = "/offline.html";
const PUBLIC_ASSETS = [
  OFFLINE_URL,
  "/brand/karmatch-icon-192.png",
  "/brand/karmatch-icon-512.png",
  "/brand/karmatch-icon-180.png",
  "/brand/karmatch-full.png",
  "/brand/karmatch-wordmark.png",
  "/brand/karmatch-vertical.png",
];
const MAX_ENTRIES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_ASSETS)),
  );
  // A replacement worker waits until the user requests activation.
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "ACTIVATE_UPDATE")
    event.waitUntil(self.skipWaiting());
});

function cacheableRequest(request, url) {
  return (
    request.method === "GET" &&
    url.origin === self.location.origin &&
    !request.headers.has("Authorization") &&
    !request.headers.has("RSC") &&
    !url.search &&
    (PUBLIC_ASSETS.includes(url.pathname) ||
      (url.pathname.startsWith("/_next/static/") &&
        /\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname)))
  );
}

async function publicAsset(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (
    response.ok &&
    response.type === "basic" &&
    !/private|no-store/i.test(response.headers.get("Cache-Control") || "")
  ) {
    try {
      await cache.put(request, response.clone());
      const keys = await cache.keys();
      // Precached offline assets are never evicted by runtime chunks/fonts.
      const runtime = keys.filter(
        (key) => !PUBLIC_ASSETS.includes(new URL(key.url).pathname),
      );
      for (const key of runtime.slice(
        0,
        Math.max(0, keys.length - MAX_ENTRIES),
      ))
        await cache.delete(key);
    } catch {
      /* Storage pressure must not turn a successful fetch into an error. */
    }
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    request.headers.has("Authorization")
  )
    return;
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () =>
        (await caches.open(CACHE_NAME))
          .match(OFFLINE_URL)
          .then(
            (response) =>
              response ||
              new Response("اتصال اینترنت قطع است.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" },
              }),
          ),
      ),
    );
  } else if (cacheableRequest(request, url)) {
    event.respondWith(publicAsset(request));
  }
});
