"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * PwaRegistrar — registers the global service worker (/sw.js) on every
 * page load so PWA install prompts (Android / desktop Chromium) and iOS
 * 16.4+ web push are eligible without the user first visiting a resort
 * page and tapping "Enable snow alerts".
 *
 * Also:
 *   - hands the VAPID public key to the worker so it can re-subscribe on
 *     `pushsubscriptionchange` even when the old subscription is gone;
 *   - re-POSTs the current push subscription once per browser session,
 *     signed-in users only, so `last_seen_at` stays fresh and a row the
 *     worker re-created while signed out gets bound to its owner. Signed
 *     out it is skipped on purpose: the upsert would write user_id null
 *     over the owner's id if the row were ever updatable anonymously;
 *   - reloads the page exactly once when a NEW worker takes control, so
 *     the page never runs old JS against a new precache. The reload is
 *     gated on "a controller already existed", which skips the very
 *     first install, and on a per-load flag, which prevents loops.
 *
 * In development the worker is unregistered instead: its cache-first
 * handler for /_next/static would serve stale chunks on every reload,
 * because dev bundles are not content-hashed. Test the worker with
 * `next build && next start`.
 */

const SYNC_SESSION_KEY = "wynla_push_synced";
const SYNC_FAILED_AT_KEY = "wynla_push_sync_failed_at";
// After a failed re-sync (typically the UPDATE policy in
// handoff-docs/sql/2026-09-23-install.sql not being applied yet) wait a
// day before trying again, so a misconfigured backend costs one request
// per day rather than one per session.
const SYNC_RETRY_MS = 24 * 60 * 60 * 1000;

function syncDue(): boolean {
  try {
    if (sessionStorage.getItem(SYNC_SESSION_KEY) === "1") return false;
    const failedAt = Number(localStorage.getItem(SYNC_FAILED_AT_KEY) ?? "0");
    return Date.now() - failedAt > SYNC_RETRY_MS;
  } catch {
    return false;
  }
}

function markSynced(ok: boolean) {
  try {
    sessionStorage.setItem(SYNC_SESSION_KEY, "1");
    if (ok) localStorage.removeItem(SYNC_FAILED_AT_KEY);
    else localStorage.setItem(SYNC_FAILED_AT_KEY, String(Date.now()));
  } catch {
    // Storage blocked — the in-memory flow already ran once this load.
  }
}

async function syncPushSubscription(reg: ServiceWorkerRegistration) {
  if (!syncDue()) return;
  try {
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    // getSession() reads the local auth cookie without a network call;
    // the API route verifies the user for real.
    const {
      data: { session },
    } = await createSupabaseBrowserClient().auth.getSession();
    if (!session) return;
    const resp = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
    });
    markSynced(resp.ok);
  } catch {
    // Offline or storage blocked — the next session tries again.
    markSynced(false);
  }
}

export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      return;
    }

    let reloading = false;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const onControllerChange = () => {
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

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
        .catch(() => {
          // Non-fatal: registration can fail in preview / blocked
          // contexts. Never break the app over it.
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
