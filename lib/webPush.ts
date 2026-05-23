// Web Push send helper (server-only). Stage 32 originally shipped a
// hand-rolled VAPID JWT + no-payload push (encryption was deferred).
// This file now uses the `web-push` npm package to send a real
// aes128gcm-encrypted JSON payload so notifications can include the
// specific resort name + snow amount.
//
// Behavior:
//   * VAPID keys configured (NEXT_PUBLIC_VAPID_PUBLIC_KEY +
//     VAPID_PRIVATE_KEY + VAPID_SUBJECT) → encrypted payload push via
//     web-push.sendNotification. Browser SW receives event.data and
//     shows the real title/body/url.
//   * VAPID keys NOT configured → graceful fallback: send a no-payload
//     push (TTL-only). Browser SW falls back to the generic "fresh
//     snow at a resort you're watching" notification. Same behavior
//     as before — pre-launch deploys don't break.
//
// VAPID key format (what `npx web-push generate-vapid-keys` emits):
//   publicKey  — URL-safe base64 of the uncompressed P-256 point (65 bytes,
//                starts with 0x04).
//   privateKey — URL-safe base64 of the 32-byte raw private scalar.

import webpush from "web-push";
import { createPrivateKey, createSign } from "node:crypto";

export type WebPushSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
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
};

// ---------------------------------------------------------------------------
// Public entry point.

export async function sendWebPush(
  subscription: WebPushSubscription,
  payload: WebPushPayload,
  vapidKeys: VapidKeys,
): Promise<WebPushResult> {
  if (!subscription?.endpoint) {
    return { ok: false, error: "subscription missing endpoint" };
  }

  const hasVapid =
    Boolean(vapidKeys.publicKey) &&
    Boolean(vapidKeys.privateKey) &&
    Boolean(vapidKeys.subject);

  // Encrypted-payload path (preferred): web-push handles the ECDH +
  // aes128gcm + VAPID JWT for us. Errors come back with a statusCode
  // we can surface for the 404/410 endpoint-pruning logic upstream.
  if (hasVapid) {
    try {
      webpush.setVapidDetails(
        vapidKeys.subject,
        vapidKeys.publicKey,
        vapidKeys.privateKey,
      );
      const res = await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        { TTL: 86400 },
      );
      return { ok: true, status: res.statusCode };
    } catch (e) {
      const err = e as { statusCode?: number; body?: string; message?: string };
      return {
        ok: false,
        status: err.statusCode,
        error: (err.body ?? err.message ?? String(e)).slice(0, 300),
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Fallback path: no VAPID keys configured. We still want to attempt a push
  // (no-payload) so the SW can show the generic notification. Hand-rolled
  // JWT keeps this file self-contained when web-push can't be used.
  void payload;
  return sendNoPayloadPush(subscription);
}

// ---------------------------------------------------------------------------
// Fallback no-payload push (used when VAPID keys aren't configured yet).
// Preserves the original Stage-32 behavior so a deploy without keys still
// triggers the SW's generic-message branch.

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function rawP256PrivateKeyToPkcs8(rawPriv: Buffer): Buffer {
  if (rawPriv.length !== 32) {
    throw new Error(`VAPID private key must be 32 bytes, got ${rawPriv.length}`);
  }
  const prefix = Buffer.from(
    "308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420",
    "hex",
  );
  return Buffer.concat([prefix, rawPriv]);
}

async function sendNoPayloadPush(
  subscription: WebPushSubscription,
): Promise<WebPushResult> {
  // Without a VAPID key pair we literally cannot sign the JWT, so the
  // push service will reject the request. Surface a clear reason
  // rather than firing a doomed POST.
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const sub = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !sub) {
    return {
      ok: false,
      error:
        "VAPID keys not configured — generate with `npx web-push generate-vapid-keys` and set NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT",
    };
  }

  let audience: string;
  try {
    const u = new URL(subscription.endpoint);
    audience = `${u.protocol}//${u.host}`;
  } catch {
    return { ok: false, error: "invalid endpoint URL" };
  }

  let jwt: string;
  try {
    const header = { typ: "JWT", alg: "ES256" };
    const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
    const payload = { aud: audience, exp, sub };
    const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
    const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
    const rawPriv = base64UrlDecode(priv);
    const keyObj = createPrivateKey({
      key: rawP256PrivateKeyToPkcs8(rawPriv),
      format: "der",
      type: "pkcs8",
    });
    const signer = createSign("SHA256");
    signer.update(`${headerB64}.${payloadB64}`);
    signer.end();
    const sig = signer.sign({ key: keyObj, dsaEncoding: "ieee-p1363" });
    jwt = `${headerB64}.${payloadB64}.${base64UrlEncode(sig)}`;
  } catch (e) {
    return {
      ok: false,
      error: `vapid sign failed: ${String((e as Error)?.message ?? e)}`,
    };
  }

  try {
    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        TTL: "86400",
        Authorization: `vapid t=${jwt}, k=${pub}`,
        "Content-Length": "0",
      },
    });
    return {
      ok: res.ok,
      status: res.status,
      error: res.ok ? undefined : `${res.status} ${res.statusText}`,
    };
  } catch (e) {
    return {
      ok: false,
      error: String((e as Error)?.message ?? e).slice(0, 200),
    };
  }
}
