import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSubscription, StripeError } from "./stripeClient";

// cancelSubscription is what account deletion relies on to stop billing a
// user whose pro_subscriptions row is about to cascade away. These tests
// pin the wire format (DELETE on /v1/subscriptions/{id}) and the error
// shape the delete route branches on (StripeError with the HTTP status).

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("cancelSubscription", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_unit");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("sends DELETE to /v1/subscriptions/{id} with bearer auth and no body", async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return jsonResponse(200, { id: "sub_123", customer: "cus_1", status: "canceled" });
    }) as typeof fetch;

    const sub = await cancelSubscription("sub_123");

    expect(sub.status).toBe("canceled");
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.stripe.com/v1/subscriptions/sub_123");
    expect(calls[0].init?.method).toBe("DELETE");
    expect(calls[0].init?.body).toBeUndefined();
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test_unit");
  });

  it("throws a StripeError carrying the HTTP status when Stripe rejects", async () => {
    globalThis.fetch = (async () =>
      jsonResponse(404, {
        error: { code: "resource_missing", message: "No such subscription: 'sub_gone'" },
      })) as typeof fetch;

    await expect(cancelSubscription("sub_gone")).rejects.toMatchObject({
      name: "StripeError",
      status: 404,
      message: "No such subscription: 'sub_gone'",
    });
  });

  it("fails fast without a network call when STRIPE_SECRET_KEY is unset", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return jsonResponse(200, {});
    }) as typeof fetch;

    await expect(cancelSubscription("sub_123")).rejects.toBeInstanceOf(StripeError);
    expect(called).toBe(false);
  });
});
