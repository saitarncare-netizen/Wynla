// Browser-side Web Push helpers (client-only; never import from server
// code). Wraps the service-worker registration, the pushManager calls and
// the /api/push/subscribe round trips so SnowAlertButton and the sign-out
// path share one implementation.
//
// Platform notes:
//   * iOS Safari exposes PushManager only when the site runs installed
//     from the Home Screen (standalone). In a normal Safari tab
//     `isPushSupported()` is false and `needsIosInstall()` is true — the
//     UI should coach the user to install rather than say "unsupported".
//   * Rotated / expired endpoints: the browser fires
//     `pushsubscriptionchange` in the service worker (public/sw.js, owned
//     by the PWA package). Until that handler exists, `syncThisDevice()`
//     re-POSTs the current subscription on app visits so `last_seen_at`
//     and the owning user stay current.

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** iPhone / iPad Safari running as a plain tab: push becomes available
 *  only after Add to Home Screen. */
export function needsIosInstall(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  if (!isIos) return false;
  const standalone =
    (window.navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  return !standalone;
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Allocate via a true ArrayBuffer so the resulting view's .buffer is
  // ArrayBuffer (not SharedArrayBuffer) — pushManager.subscribe's
  // applicationServerKey type requires the stricter form.
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

function arrayBufferToUrlBase64(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Normalise a base64url key so padding / alphabet differences between
 *  what the env var holds and what the browser reports back never count
 *  as a mismatch. */
function normaliseKey(key: string): string {
  return key.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** True when the browser's subscription was created with the VAPID public
 *  key this build ships. After a key rotation (or a preview build pointing
 *  at production keys) the old subscription looks healthy on this device
 *  but every send is refused with 401/403, which the cron cannot prune. A
 *  browser that does not expose applicationServerKey is treated as
 *  matching: we cannot tell, and resubscribing blindly would churn
 *  endpoints on every enable. */
export function subscriptionMatchesCurrentKey(sub: PushSubscription): boolean {
  const key = sub.options?.applicationServerKey;
  if (!key) return true;
  return normaliseKey(arrayBufferToUrlBase64(key)) === normaliseKey(VAPID_PUBLIC_KEY);
}

/** The push subscription this browser currently holds, if any. Does not
 *  register a service worker or prompt for permission. */
export async function getThisDeviceSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return null;
  return reg.pushManager.getSubscription();
}

/** Tell the server about a subscription (upsert by endpoint, bound to the
 *  signed-in user). Throws with the server's message on failure. */
export async function registerSubscription(sub: PushSubscription): Promise<void> {
  const resp = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
  });
  if (!resp.ok) {
    const j = (await resp.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `Could not save this device (HTTP ${resp.status})`);
  }
}

/** Full enable flow for this device: permission prompt, service-worker
 *  registration, push subscription, server registration. Returns the
 *  permission outcome so the caller can show the right message. */
export async function subscribeThisDevice(): Promise<
  { ok: true; subscription: PushSubscription } | { ok: false; reason: "denied" | "no_key" }
> {
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "no_key" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (sub && !subscriptionMatchesCurrentKey(sub)) {
    // Stale key: drop the old subscription so the server row for its
    // endpoint stops being retried, then subscribe fresh below.
    await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
      method: "DELETE",
    }).catch(() => undefined);
    await sub.unsubscribe().catch(() => false);
    sub = null;
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  await registerSubscription(sub);
  return { ok: true, subscription: sub };
}

const SYNC_SESSION_KEY = "wynla:push-synced";

/** Re-POST this device's existing subscription so the server row stays
 *  bound to the current user and `last_seen_at` moves. Silent on failure:
 *  it is housekeeping, not a user action.
 *
 *  Throttled to once per browser session (sessionStorage) because it is a
 *  write on a read path: without the throttle every resort page view by a
 *  subscribed user costs a service-role read + upsert. The session key is
 *  cleared by `unsubscribeThisDevicePush()` so a sign-out followed by a
 *  sign-in on the same tab still rebinds the row to the new user. A
 *  subscription made with a stale VAPID key is not synced: registering it
 *  would only keep a dead row alive; the next enable replaces it. */
export async function syncThisDevice(): Promise<boolean> {
  try {
    if (readSessionFlag(SYNC_SESSION_KEY)) return false;
    const sub = await getThisDeviceSubscription();
    if (!sub || !subscriptionMatchesCurrentKey(sub)) return false;
    await registerSubscription(sub);
    writeSessionFlag(SYNC_SESSION_KEY, true);
    return true;
  } catch {
    return false;
  }
}

// sessionStorage can throw (private mode, blocked storage); treat it as
// absent rather than letting housekeeping break the page.
function readSessionFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeSessionFlag(key: string, on: boolean): void {
  try {
    if (on) window.sessionStorage.setItem(key, "1");
    else window.sessionStorage.removeItem(key);
  } catch {
    // Storage unavailable: the only cost is one extra sync next visit.
  }
}

/**
 * Sign-out hook: drop this device's push subscription on the server and
 * in the browser, so the next person on a shared device does not keep
 * receiving the previous user's snow alerts. Call it BEFORE
 * `supabase.auth.signOut()` — the DELETE is scoped to the signed-in user
 * by RLS and would be refused once the session is gone. Never throws.
 *
 * Wiring note for the auth package: components/auth/AuthButton.tsx must
 * call this before `supabase.auth.signOut()`; until it does, a shared
 * device keeps delivering the previous user's alerts.
 */
export async function unsubscribeThisDevicePush(): Promise<void> {
  try {
    writeSessionFlag(SYNC_SESSION_KEY, false);
    const sub = await getThisDeviceSubscription();
    if (!sub) return;
    await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(sub.endpoint)}`, {
      method: "DELETE",
    }).catch(() => undefined);
    await sub.unsubscribe().catch(() => false);
  } catch {
    // Push support missing or the service worker is gone: nothing to clean.
  }
}
