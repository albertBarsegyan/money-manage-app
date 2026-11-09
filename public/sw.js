const VERSION = "finora-v2";
const PAGE_CACHE = `${VERSION}-pages`;
const ASSET_CACHE = `${VERSION}-assets`;
const APP_SHELL = [
  "/",
  "/offline.html",
  "/favicon-for-public/web-app-manifest-192x192.png",
  "/favicon-for-public/web-app-manifest-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(async () => {
        const pageCache = await caches.open(PAGE_CACHE);
        const root = await pageCache.match("/");
        if (!root) return;
        const html = await root.text();
        const assets = new Set();
        for (const match of html.matchAll(/(?:src|href)=["']([^"']+\/_next\/static\/[^"']+)["']/g)) {
          assets.add(new URL(match[1], self.location.origin).href);
        }
        const assetCache = await caches.open(ASSET_CACHE);
        await Promise.all(
          [...assets].map(async (asset) => {
            try {
              const response = await fetch(asset);
              if (response.ok) await assetCache.put(asset, response);
            } catch {
              // The shell remains installable if an optional asset is unavailable.
            }
          }),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("finora-") && key !== PAGE_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            return caches
              .open(PAGE_CACHE)
              .then((cache) => cache.put(request, response.clone()))
              .then(() => response);
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match("/")) ||
          (await caches.match("/offline.html")),
        ),
    );
    return;
  }

  const isVersionedAsset = url.pathname.startsWith("/_next/static/");
  const isPublicPwaAsset =
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/favicon-for-public/web-app-manifest-192x192.png" ||
    url.pathname === "/favicon-for-public/web-app-manifest-512x512.png";
  if (!isVersionedAsset && !isPublicPwaAsset) return;

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) {
        await caches.open(ASSET_CACHE).then((cache) => cache.put(request, response.clone()));
      }
      return response;
    }),
  );
});
