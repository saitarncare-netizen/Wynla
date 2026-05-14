// Stage 32 — Web Push send helper (server-only).
//
// Implements just enough of the Web Push protocol (RFC 8030) + VAPID
// (RFC 8292) to fire a no-payload push notification. Sending a non-
// empty payload requires aes128gcm encryption (RFC 8188) which is
// non-trivial — see TODO at the bottom of this file.
//
// What this DOES do today:
//   * Generates a valid ES256-signed VAPID JWT using Node's crypto module
//     so push services (Mozilla autopush, Apple, FCM) accept the request.
//   * POSTs to the subscription endpoint with TTL + VAPID auth headers.
//   * Sends NO payload body — the spec explicitly allows this. The browser
//     SW receives a push event with `event.data === null`, and our SW
//     (public/sw.js) is set up to fall back to a generic notification in
//     that case.
//
// What this DOES NOT do today:
//   * Encrypt a JSON payload into the request body. See the TODO at the
//     bottom; doing this correctly requires aes128gcm + ECDH key agreement
//     against the subscription's p256dh key, which is ~150 lines of
//     fiddly crypto. The user can install the `web-push` npm package or
//     port the encryption later.
//
// VAPID key format expected:
//   publicKey  — URL-safe base64 of the uncompressed P-256 point (65 bytes,
//                starts with 0x04). What `web-push generate-vapid-keys` emits.
//   privateKey — URL-safe base64 of the 32-byte raw private scalar.

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
  publicKey: string;   // base64url, 65-byte uncompressed P-256 point
  privateKey: string;  // base64url, 32-byte raw private scalar
  subject: string;     // "mailto:you@example.com" or "https://..."
};

export type WebPushResult = {
  ok: boolean;
  status?: number;
  error?: string;
};

// ---------------------------------------------------------------------------
// base64url helpers — Web Push protocol uses RFC 4648 §5 throughout.

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

// ---------------------------------------------------------------------------
// VAPID private-key import.
//
// Push services want an ES256 signature. Node's crypto.sign supports ES256
// natively if we wrap the raw 32-byte private scalar in a PKCS#8 envelope.
// We build that DER blob by hand (it's tiny) and hand it to createPrivateKey.

function rawP256PrivateKeyToPkcs8(rawPriv: Buffer): Buffer {
  if (rawPriv.length !== 32) {
    throw new Error(`VAPID private key must be 32 bytes, got ${rawPriv.length}`);
  }
  // PKCS#8 PrivateKeyInfo wrapping an EC PrivateKey (RFC 5208 + RFC 5915)
  // for the P-256 curve. This template is constant aside from the 32-byte
  // private scalar at offset 36.
  // SEQUENCE {
  //   INTEGER 0,
  //   SEQUENCE { OID 1.2.840.10045.2.1 (ecPublicKey), OID 1.2.840.10045.3.1.7 (P-256) },
  //   OCTET STRING { SEQUENCE { INTEGER 1, OCTET STRING <32-byte priv> } }
  // }
  const prefix = Buffer.from(
    "308141020100301306072a8648ce3d020106082a8648ce3d030107042730250201010420",
    "hex",
  );
  return Buffer.concat([prefix, rawPriv]);
}

// JOSE ECDSA signatures are r||s (64 bytes total), not the DER format that
// Node emits by default. Pass `dsaEncoding: "ieee-p1363"` to get the raw form.
function signJwt(headerB64: string, payloadB64: string, privateKeyPem: ReturnType<typeof createPrivateKey>): string {
  const signingInput = `${headerB64}.${payloadB64}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const sig = signer.sign({ key: privateKeyPem, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${base64UrlEncode(sig)}`;
}

function buildVapidJwt(
  audience: string,
  vapid: VapidKeys,
  ttlSeconds = 12 * 60 * 60,
): string {
  const header = { typ: "JWT", alg: "ES256" };
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = { aud: audience, exp, sub: vapid.subject };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  const rawPriv = base64UrlDecode(vapid.privateKey);
  const keyObj = createPrivateKey({
    key: rawP256PrivateKeyToPkcs8(rawPriv),
    format: "der",
    type: "pkcs8",
  });
  return signJwt(headerB64, payloadB64, keyObj);
}

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
  let audience: string;
  try {
    const u = new URL(subscription.endpoint);
    audience = `${u.protocol}//${u.host}`;
  } catch {
    return { ok: false, error: "invalid endpoint URL" };
  }

  let jwt: string;
  try {
    jwt = buildVapidJwt(audience, vapidKeys);
  } catch (e) {
    return { ok: false, error: `vapid sign failed: ${String((e as Error)?.message ?? e)}` };
  }

  // NOTE: payload is intentionally unused here. We send an empty body — the
  // browser SW receives a push event with `event.data === null` and falls
  // back to a generic notification. Wiring up encrypted payloads is the
  // TODO at the bottom.
  void payload;

  try {
    const res = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        // RFC 8030 §5.2 — TTL is the only required header for a no-payload push.
        TTL: "86400",
        // RFC 8292 §3 — VAPID auth scheme.
        Authorization: `vapid t=${jwt}, k=${vapidKeys.publicKey}`,
        // No Content-Type / Content-Encoding because we have no body.
        "Content-Length": "0",
      },
    });
    return {
      ok: res.ok,
      status: res.status,
      error: res.ok ? undefined : `${res.status} ${res.statusText}`,
    };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}

// TODO(payload-encryption): to deliver a per-notification title/body/URL we
// need aes128gcm encryption (RFC 8188) keyed by ECDH(serverEphemeral,
// subscription.keys.p256dh) and the subscription's `auth` salt. That's
// ~150 lines of HKDF + AES-GCM glue. Two viable paths:
//   1. Install the `web-push` npm package and replace this file's body
//      with `webPush.sendNotification(subscription, JSON.stringify(payload),
//      { vapidDetails })`. Adds one dep but is battle-tested.
//   2. Port the encryption inline using node:crypto (createECDH, createHmac,
//      createCipheriv aes-128-gcm). Workable but tedious and easy to mis-spec.
// Until then, the SW handles the empty-payload case with a generic message.
