"use client";

import { useEffect } from "react";

/**
 * PwaRegistrar — registers the global service worker (/sw.js) on every
 * page load so PWA install prompts (Android / desktop Chromium) and iOS
 * 16.4+ web push are eligible without the user first visiting a resort
 * page and tapping "Enable snow alerts".
 *
 * Also:
 *   - hands the VAPID public key to the worker so it can re-subscribe on
 *     `pushsubscriptionchange` even when the old subscription is gone;
 *   - re-POSTs the current push subscription once per browser session so
 *     `last_seen_at` stays fresh and the row is bound to the signed-in
 *     user (a subscription made while anonymous is claimed after login);
 *   - reloads the page exactly once when a NEW worker takes control, so
 *     the page never runs old JS against a new precache. The reload is
 *     gated on "a controller already existed", which skips the very
 *     first install, and on a per-load flag, which prevents loops.
 */
export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let reloading = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const syncPushSubscription = async (reg: ServiceWorkerRegistration) => {
      try {
        if (sessionStorage.getItem("wynla_push_synced") === "1") return;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        const resp = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
        });
        if (resp.ok) sessionStorage.setItem("wynla_push_synced", "1");
      } catch {
        // Offline or storage blocked — the next session tries again.
      }
    };

    // Wait for window load so SW registration doesn't fight with LCP.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (vapidPublicKey) {
            // `active` is null on the very first install; the worker
            // also picks the key up from the old subscription in that
            // case, so a missed message is harmless.
            reg.active?.postMessage({ type: "WYNLA_CONFIG", vapidPublicKey });
          }
          void syncPushSubscription(reg);
        })
        .catch((err) => {
          // Non-fatal: registration can fail in dev / preview / blocked
          // contexts. Never break the app over it.
          if (process.env.NODE_ENV !== "production") {
            console.warn("[PwaRegistrar] SW registration failed:", err);
          }
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
    return () => {
      window.removeEventListener("load", register);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}
