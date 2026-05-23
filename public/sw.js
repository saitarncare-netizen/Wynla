// Wynla service worker — Stage 29.
//
// Owns:
//   1. PWA install eligibility (presence of an active SW is required by
//      the Add-to-Home-Screen prompt on most browsers).
//   2. Web Push receive + click → open the relevant URL.
//
// Intentionally minimal: no offline page caching (we keep server-rendered
// freshness over an offline shell for v1). Caching can be a Stage 31.

self.addEventListener("install", (event) => {
  // Activate the new SW immediately on first install instead of waiting
  // for all tabs to close — friendlier for users iterating during dev.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push payloads we send from /api/cron/check-snow-alerts look like:
//   { title: "8\" of fresh snow at Vail!", body: "...", url: "/resort/vail" }
//
// lib/webPush.ts now sends an aes128gcm-encrypted JSON payload via the
// `web-push` SDK when VAPID env vars are configured, so event.data is
// populated and the notification carries the real resort name + snow
// amount. The data-less branch below is kept as a defensive fallback
// for the pre-launch state where VAPID keys haven't been generated yet
// (sendWebPush falls back to a TTL-only no-payload push).
self.addEventListener("push", (event) => {
  let payload = null;
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = { title: "Wynla", body: event.data.text() };
    }
  }
  const title = (payload && payload.title) || "Wynla";
  const body = (payload && payload.body) ||
    "Fresh snow at a resort you're watching — open Wynla to see.";
  // Use PNG icons for the notification — Android Chrome doesn't render SVG
  // badges reliably (silently falls back to a generic bell). icon-192 is the
  // hero glyph, icon-192 also serves as the small tray badge.
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
