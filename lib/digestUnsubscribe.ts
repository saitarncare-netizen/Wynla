// Signed one-click unsubscribe tokens for digest emails (server-only).
//
// The digest footer link and the List-Unsubscribe header must work from
// any mail client with no Wynla session, so the URL itself has to prove
// it was minted by us. Token = "<subscription id>.<HMAC-SHA256(secret,
// "digest-unsubscribe:" + id)>", hex-encoded. The id is public-ish (a
// small integer) but useless without the signature, and the signature is
// bound to the purpose string so a token can never be replayed against a
// different HMAC use of the same secret.
//
// Secret: DIGEST_SECRET when set, otherwise CRON_SECRET (already required
// by the crons). Rotating either invalidates links in old emails, which
// is the correct failure mode: the /account/digest page still works.

import { createHmac, timingSafeEqual } from "node:crypto";

const PURPOSE = "digest-unsubscribe:";

export function digestSigningSecret(): string | null {
  return process.env.DIGEST_SECRET || process.env.CRON_SECRET || null;
}

function sign(id: number, secret: string): string {
  return createHmac("sha256", secret).update(`${PURPOSE}${id}`).digest("hex");
}

/** Mint the token for one digest_subscriptions row. */
export function makeUnsubscribeToken(subscriptionId: number, secret: string): string {
  if (!Number.isInteger(subscriptionId) || subscriptionId <= 0) {
    throw new Error("subscriptionId must be a positive integer");
  }
  return `${subscriptionId}.${sign(subscriptionId, secret)}`;
}

/** Return the subscription id when the token is well-formed and its
 *  signature matches; null otherwise. Constant-time compare so the
 *  signature cannot be guessed byte by byte. */
export function verifyUnsubscribeToken(token: string | null | undefined, secret: string): number | null {
  if (!token) return null;
  const m = /^(\d{1,12})\.([0-9a-f]{64})$/.exec(token.trim());
  if (!m) return null;
  const id = Number(m[1]);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const expected = Buffer.from(sign(id, secret), "hex");
  const given = Buffer.from(m[2]!, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

/** Absolute URL the email links to. Lives here so the cron and the
 *  confirmation page cannot drift apart on the path or the param name. */
export function unsubscribeUrl(siteBase: string, token: string): string {
  return `${siteBase.replace(/\/+$/, "")}/api/digest/unsubscribe?token=${encodeURIComponent(token)}`;
}
