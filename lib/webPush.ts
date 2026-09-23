// Web Push send helper (server-only). Uses the `web-push` package to send
// an aes128gcm-encrypted JSON payload so the notification can carry the
// specific resort name, snow amount and deep link.
//
// The only caller is /api/cron/check-snow-alerts, which refuses to run
// without VAPID keys, so this module does not carry a keyless fallback:
// a missing key is a configuration error and is reported as one.
//
// VAPID key format (what `npx web-push generate-vapid-keys` emits):
//   publicKey  — URL-safe base64 of the uncompressed P-256 point (65 bytes,
//                starts with 0x04). Also shipped to the browser as
//                NEXT_PUBLIC_VAPID_PUBLIC_KEY so subscriptions match.
//   privateKey — URL-safe base64 of the 32-byte raw private scalar.
//
// public/sw.js (owned by the PWA package) reads title / body / url / tag
// from the payload. `label` is informational for the service worker's
// notification options (e.g. shown as the notification's category) and is
// harmless when ignored.

import webpush from "web-push";

export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type WebPushPayload = {
  title: string;
  body: string;
  /** Path or absolute URL to open on tap. Required so a tap never lands on
   *  a generic page. */
  url: string;
  /** What kind of notification this is, e.g. "Snow alert". */
  label: string;
  /** Notification tag: two pushes with the same tag collapse into one
   *  notification instead of stacking (one per resort per day). */
  tag?: string;
};

export type VapidKeys = {
  publicKey: string; // base64url, 65-byte uncompressed P-256 point
  privateKey: string; // base64url, 32-byte raw private scalar
  subject: string; // "mailto:you@example.com" or "https://..."
};

export type WebPushResult = {
  ok: boolean;
  status?: number;
  error?: string;
  /** True when the push service says the subscription no longer exists
   *  (HTTP 404 / 410). The caller should delete the stored row. */
  dead?: boolean;
  /** True when the push service rejected our VAPID signature (HTTP 401 /
   *  403): the browser subscribed with a different public key than the
   *  one we sign with. The row is still valid for the OLD key, so it
   *  must not be pruned; the device has to re-subscribe with the current
   *  key. */
  vapidMismatch?: boolean;
};

/** 404 and 410 from a push service both mean "this subscription is gone
 *  for good" (uninstalled app, revoked permission, rotated endpoint). */
export function isDeadSubscriptionStatus(status: number | undefined): boolean {
  return status === 404 || status === 410;
}

/** 401 / 403 from a push service means the VAPID JWT did not verify
 *  against the key the subscription was created with. */
export function isVapidMismatchStatus(status: number | undefined): boolean {
  return status === 401 || status === 403;
}

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: WebPushPayload,
  vapidKeys: VapidKeys,
): Promise<WebPushResult> {
  if (!subscription?.endpoint) {
    return { ok: false, error: "subscription missing endpoint" };
  }
  if (!vapidKeys.publicKey || !vapidKeys.privateKey || !vapidKeys.subject) {
    return {
      ok: false,
      error:
        "VAPID keys not configured — generate with `npx web-push generate-vapid-keys` and set NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT",
    };
  }

  try {
    // web-push handles ECDH + aes128gcm + the VAPID JWT. Errors carry a
    // statusCode we surface for the dead-endpoint pruning upstream.
    webpush.setVapidDetails(vapidKeys.subject, vapidKeys.publicKey, vapidKeys.privateKey);
    const res = await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 86400,
      // Non-urgent keeps Android from waking a dozing device for a
      // notification the user can read at breakfast.
      urgency: "normal",
    });
    return { ok: true, status: res.statusCode };
  } catch (e) {
    const err = e as { statusCode?: number; body?: string; message?: string };
    return {
      ok: false,
      status: err.statusCode,
      dead: isDeadSubscriptionStatus(err.statusCode),
      vapidMismatch: isVapidMismatchStatus(err.statusCode),
      error: (err.body ?? err.message ?? String(e)).slice(0, 300),
    };
  }
}
