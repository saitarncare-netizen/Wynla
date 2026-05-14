// Minimal Stripe REST client. We deliberately don't depend on the
// `stripe` npm package — the surface area we need is small (checkout
// sessions, billing portal, subscription read, webhook verification),
// and avoiding the dep keeps cold starts fast and the bundle slim.
//
// All calls hit https://api.stripe.com/v1/* with HTTP Basic auth on
// the secret key (Stripe accepts either Basic or Bearer; Basic is the
// documented default). Bodies are application/x-www-form-urlencoded
// with the nested-bracket convention Stripe uses, e.g.
//   line_items[0][price]=price_123&line_items[0][quantity]=1
//
// On a non-2xx we throw a `StripeError` that includes status + the
// JSON body Stripe returned, so route handlers can choose to surface
// the message or just 500.

import crypto from "node:crypto";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export class StripeError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = "StripeError";
    this.status = status;
    this.body = body;
  }
}

// Flatten a nested params object into Stripe's bracket-style
// form-encoded keys. Arrays use numeric indices; objects use the key.
// Booleans become "true"/"false"; null/undefined are skipped.
function encodeForm(
  params: Record<string, unknown>,
  prefix = "",
  out: URLSearchParams = new URLSearchParams(),
): URLSearchParams {
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const fullKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((v, i) => {
        const arrKey = `${fullKey}[${i}]`;
        if (v !== null && typeof v === "object") {
          encodeForm(v as Record<string, unknown>, arrKey, out);
        } else if (v !== null && v !== undefined) {
          out.append(arrKey, String(v));
        }
      });
    } else if (typeof value === "object") {
      encodeForm(value as Record<string, unknown>, fullKey, out);
    } else if (typeof value === "boolean") {
      out.append(fullKey, value ? "true" : "false");
    } else {
      out.append(fullKey, String(value));
    }
  }
  return out;
}

async function stripeFetch<T>(
  path: string,
  init: { method?: string; params?: Record<string, unknown> } = {},
): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError(500, null, "STRIPE_SECRET_KEY not set");
  const method = init.method ?? "POST";
  const body =
    init.params && method !== "GET"
      ? encodeForm(init.params).toString()
      : undefined;
  const url =
    init.params && method === "GET"
      ? `${STRIPE_API_BASE}${path}?${encodeForm(init.params).toString()}`
      : `${STRIPE_API_BASE}${path}`;
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const text = await r.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body — keep raw text for diagnostics.
    json = { raw: text };
  }
  if (!r.ok) {
    const message =
      (json as { error?: { message?: string } } | null)?.error?.message ??
      `Stripe ${r.status}`;
    throw new StripeError(r.status, json, message);
  }
  return json as T;
}

// ---- Typed shapes for the bits of Stripe responses we actually read.

export type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
  customer_email: string | null;
  subscription: string | null;
  metadata: Record<string, string> | null;
};

export type StripePortalSession = {
  id: string;
  url: string;
};

export type StripeSubscription = {
  id: string;
  customer: string;
  status: string;
  cancel_at: number | null;
  current_period_end: number | null;
  items: {
    data: Array<{ price: { id: string } }>;
  };
};

// ---- API surface used by route handlers.

export function createCheckoutSession(params: {
  priceId: string;
  customerEmail: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
  trialDays?: number;
}): Promise<StripeCheckoutSession> {
  const body: Record<string, unknown> = {
    mode: "subscription",
    customer_email: params.customerEmail,
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: params.userId,
    metadata: { user_id: params.userId },
    allow_promotion_codes: true,
  };
  if (params.trialDays && params.trialDays > 0) {
    body.subscription_data = {
      trial_period_days: params.trialDays,
      metadata: { user_id: params.userId },
    };
  } else {
    body.subscription_data = { metadata: { user_id: params.userId } };
  }
  return stripeFetch<StripeCheckoutSession>("/checkout/sessions", {
    params: body,
  });
}

export function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<StripePortalSession> {
  return stripeFetch<StripePortalSession>("/billing_portal/sessions", {
    params: {
      customer: params.customerId,
      return_url: params.returnUrl,
    },
  });
}

export function retrieveSubscription(
  subscriptionId: string,
): Promise<StripeSubscription> {
  return stripeFetch<StripeSubscription>(`/subscriptions/${subscriptionId}`, {
    method: "GET",
  });
}

// ---- Webhook signature verification (HMAC SHA-256).
//
// Stripe sends a header of the form:
//   Stripe-Signature: t=1700000000,v1=abc123...,v1=fallback...
// The signed payload is `${t}.${rawBody}`. We compute HMAC SHA-256
// with the webhook secret and compare in constant time against each
// v1 signature in the header. We also enforce a 5-minute tolerance on
// `t` to block replay attacks (Stripe's documented default).
//
// Docs: https://stripe.com/docs/webhooks/signatures

const DEFAULT_TOLERANCE_SECONDS = 5 * 60;

export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): { ok: true } | { ok: false; reason: string } {
  if (!signatureHeader) return { ok: false, reason: "no signature header" };
  if (!secret) return { ok: false, reason: "no webhook secret" };

  // Parse "t=...,v1=...,v1=..." into a tiny dict-of-arrays.
  const parts: Record<string, string[]> = {};
  for (const seg of signatureHeader.split(",")) {
    const eq = seg.indexOf("=");
    if (eq === -1) continue;
    const k = seg.slice(0, eq).trim();
    const v = seg.slice(eq + 1).trim();
    (parts[k] ??= []).push(v);
  }
  const ts = parts.t?.[0];
  const sigs = parts.v1 ?? [];
  if (!ts || sigs.length === 0) {
    return { ok: false, reason: "malformed signature header" };
  }

  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) {
    return { ok: false, reason: "bad timestamp" };
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - tsNum) > toleranceSeconds) {
    return { ok: false, reason: "timestamp outside tolerance" };
  }

  const signedPayload = `${ts}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");

  for (const sig of sigs) {
    let sigBuf: Buffer;
    try {
      sigBuf = Buffer.from(sig, "hex");
    } catch {
      continue;
    }
    if (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "no matching signature" };
}
