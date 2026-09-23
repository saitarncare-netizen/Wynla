// Wynla service worker.
//
// Owns:
//   1. PWA install eligibility. Chrome's `beforeinstallprompt` algorithm
//      still requires a real fetch handler (menu-install stopped needing
//      one in Chrome 108/112, the prompt did not), so the fetch handler
//      below is what makes the one-tap Install button possible at all.
//   2. Offline fallback: navigations are network-first and fall back to
//      the precached /offline page. HTML is never cached — most routes
//      are personalised (favorites, trips, account) and a cached copy
//      would leak one user's page to the next person on a shared device.
//   3. Static asset caching: /_next/static/* is content-hashed and
//      immutable, so it is cache-first; icons, manifest and fonts too.
//   4. Web Push receive + click, plus re-subscribing when the push
//      service rotates the subscription (pushsubscriptionchange).
//
// Bump VERSION whenever the caching strategy or precache list changes;
// activate() deletes every cache that does not carry the current name,
// and PwaRegistrar reloads the page once the new worker takes control.

const VERSION = "2026-09-23.1";
const PRECACHE = `wynla-precache-${VERSION}`;
const RUNTIME = `wynla-runtime-${VERSION}`;
// Small key/value store for config the page hands us (VAPID public key).
// Lives in the Cache API because service workers are killed when idle
// and plain variables do not survive that; the name has no version so
// it persists across SW updates.
const CONFIG = "wynla-config";
const OFFLINE_URL = "/offline";

const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PRECACHE)
      .then((cache) =>
        // `reload` bypasses the HTTP cache so a stale /offline from a
        // previous deploy is never precached into the new version.
        cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: "reload" }))),
      )
      // Activate immediately; PwaRegistrar handles the single reload.
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
            .filter((k) => k !== PRECACHE && k !== RUNTIME && k !== CONFIG)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// --- fetch ----------------------------------------------------------

function isStaticAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/screenshots/")) return true;
  if (url.pathname.startsWith("/splash/")) return true;
  return /^\/(icon-[\w-]+\.png|apple-touch-icon\.png|manifest\.json|splash\.png|og-home\.png)$/.test(
    url.pathname,
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  try {
    // Navigations go straight to the network. On success we hand the
    // response through untouched (no caching, see header comment).
    return await fetch(request);
  } catch {
    const cache = await caches.open(PRECACHE);
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Mapbox, Supabase, Vercel analytics: never touched.

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
  // Everything else (API routes, RSC payloads, images) is left to the
  // browser's own HTTP cache so auth-gated data is never served stale.
});

// --- messages from the page ----------------------------------------

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "WYNLA_CONFIG" && typeof data.vapidPublicKey === "string") {
    event.waitUntil(
      caches
        .open(CONFIG)
        .then((cache) => cache.put("/__wynla/vapid", new Response(data.vapidPublicKey))),
    );
  }
});

// --- push -----------------------------------------------------------

// Push payloads we send from /api/cron/check-snow-alerts look like:
//   { title: "8\" of fresh snow at Vail!", body: "...", url: "/resort/vail" }
//
// lib/webPush.ts sends an aes128gcm-encrypted JSON payload via the
// `web-push` SDK when VAPID env vars are configured. The data-less branch
// is kept as a defensive fallback for a TTL-only no-payload push.
self.addEventListener("push", (event) => {
  let payload = null;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { title: "Wynla", body: event.data.text() };
    }
  }
  const title = (payload && payload.title) || "Wynla";
  const body =
    (payload && payload.body) || "Fresh snow at a resort you're watching — open Wynla to see.";
  // PNG icons — Android Chrome doesn't render SVG badges reliably
  // (silently falls back to a generic bell).
  const options = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: (payload && payload.url) || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus an existing tab if one is on the same origin; otherwise open.
      for (const c of clients) {
        if (c.url.includes(self.location.origin) && "focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

// The push service can expire or rotate a subscription at any time.
// Without this handler the old endpoint silently dies and the user's
// snow alerts stop until they re-enable them by hand.
function base64UrlToUint8Array(base64Url) {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function resolveApplicationServerKey(event) {
  // Prefer the key the expiring subscription was made with.
  const old = event.oldSubscription;
  if (old && old.options && old.options.applicationServerKey) {
    return old.options.applicationServerKey;
  }
  const cache = await caches.open(CONFIG);
  const stored = await cache.match("/__wynla/vapid");
  if (stored) return base64UrlToUint8Array(await stored.text());
  return null;
}

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      let sub = event.newSubscription || null;
      if (!sub) {
        const key = await resolveApplicationServerKey(event);
        if (!key) return; // nothing to subscribe with; the page re-syncs on next open
        sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        });
      }
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subscription: sub.toJSON(), userAgent: "sw:pushsubscriptionchange" }),
      });
    })(),
  );
});
