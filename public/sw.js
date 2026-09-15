/* eslint-disable no-restricted-globals */
/**
 * 동서트레일 조사 도우미 서비스 워커 (경량).
 *
 * 전략:
 *  - 정적 자원(_next/static, /images/*): cache-first → 오프라인 셸로 사용
 *  - HTML 페이지: network-first, 실패 시 캐시 fallback
 *  - API(/api/*): 항상 네트워크 (offline 시 fetch 실패 → 앱이 자체 처리)
 *
 * 배포마다 SW_VERSION 을 올리면 이전 캐시는 activate 시점에 정리됨.
 */
const SW_VERSION = "dongseo-2026-09-15-01";
const STATIC_CACHE = `hh-static-${SW_VERSION}`;
const HTML_CACHE = `hh-html-${SW_VERSION}`;

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(["/images/another_logo.png"]).catch(() => undefined)
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== HTML_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API 는 SW 관여 없음
  if (url.pathname.startsWith("/api/")) return;

  // 정적 자원 — cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // HTML/네비게이션 — network-first
  if (
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html")
  ) {
    event.respondWith(networkFirst(req, HTML_CACHE));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return hit || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req);
    if (hit) return hit;
    // 마지막으로 방문했던 조사 도우미 페이지라도 반환
    const fallback = await cache.match("/tools/dongseo-survey");
    if (fallback) return fallback;
    return Response.error();
  }
}
