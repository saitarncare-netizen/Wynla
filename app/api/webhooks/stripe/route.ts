// POST /api/webhooks/stripe — Stripe webhook endpoint.
//
// We always return 200 to Stripe except for signature failures (400)
// and missing config (503). Inside a 200 response we may have ignored
// the event type — that's expected; Stripe sends many events we don't
// care about, and 200 prevents Stripe from retrying them.
//
// Auth: HMAC SHA-256 over `${t}.${rawBody}` using STRIPE_WEBHOOK_SECRET.
// See lib/stripeClient.ts → verifyStripeWebhook.
//
// Writes go through the service-role Supabase client (bypasses RLS).
// Mirrors the pattern in app/api/cron/refresh-weather/route.ts.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  verifyStripeWebhook,
  retrieveSubscription,
} from "@/lib/stripeClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckoutSessionCompleted = {
  id: string;
  customer: string | null;
  subscription: string | null;
  client_reference_id: string | null;
  metadata?: Record<string, string> | null;
};

type SubscriptionEventObject = {
  id: string;
  customer: string;
  status: string;
  cancel_at: number | null;
  current_period_end: number | null;
  items?: { data?: Array<{ price?: { id?: string } }> };
  metadata?: Record<string, string> | null;
};

type StripeEvent = {
  id: string;
  type: string;
  data: { object: unknown };
};

function tsToIso(unix: number | null | undefined): string | null {
  if (typeof unix !== "number" || !Number.isFinite(unix)) return null;
  return new Date(unix * 1000).toISOString();
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  // Read the raw body first — signature verification requires the
  // exact bytes Stripe signed, before any JSON parsing.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const verification = verifyStripeWebhook(rawBody, signature, secret);
  if (!verification.ok) {
    return NextResponse.json(
      { error: `Signature verification failed: ${verification.reason}` },
      { status: 400 },
    );
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = serviceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service env missing" },
      { status: 503 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const obj = event.data.object as CheckoutSessionCompleted;
        // user_id is stuffed into both metadata and client_reference_id
        // by /api/checkout/create-session — read either.
        const userId =
          obj.metadata?.user_id ?? obj.client_reference_id ?? null;
        if (!userId) {
          // Nothing we can do without a user_id mapping. ACK so Stripe
          // doesn't retry forever; log for diagnosis.
          console.warn("[stripe webhook] checkout.session.completed without user_id", obj.id);
          break;
        }
        // Pull the full subscription so we capture status,
        // current_period_end, and the price_id in one upsert.
        let status = "active";
        let priceId: string | null = null;
        let cancelAt: string | null = null;
        let currentPeriodEnd: string | null = null;
        let subscriptionId: string | null = obj.subscription;
        if (obj.subscription) {
          try {
            const sub = await retrieveSubscription(obj.subscription);
            status = sub.status;
            priceId = sub.items?.data?.[0]?.price?.id ?? null;
            cancelAt = tsToIso(sub.cancel_at);
            currentPeriodEnd = tsToIso(sub.current_period_end);
            subscriptionId = sub.id;
          } catch (e) {
            console.warn("[stripe webhook] failed to retrieve subscription", e);
          }
        }
        await supabase
          .from("pro_subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: obj.customer,
              stripe_subscription_id: subscriptionId,
              status,
              price_id: priceId,
              cancel_at: cancelAt,
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const obj = event.data.object as SubscriptionEventObject;
        const userId = obj.metadata?.user_id ?? null;
        // Match either by user_id (preferred — set via subscription_data
        // metadata on checkout) or by stripe_customer_id (covers manual
        // Stripe-dashboard changes that don't preserve metadata).
        const update = {
          stripe_subscription_id: obj.id,
          status: obj.status,
          price_id: obj.items?.data?.[0]?.price?.id ?? null,
          cancel_at: tsToIso(obj.cancel_at),
          current_period_end: tsToIso(obj.current_period_end),
          updated_at: new Date().toISOString(),
        };
        if (userId) {
          await supabase
            .from("pro_subscriptions")
            .update({ ...update, stripe_customer_id: obj.customer })
            .eq("user_id", userId);
        } else {
          await supabase
            .from("pro_subscriptions")
            .update(update)
            .eq("stripe_customer_id", obj.customer);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const obj = event.data.object as SubscriptionEventObject;
        await supabase
          .from("pro_subscriptions")
          .update({
            status: "canceled",
            cancel_at: tsToIso(obj.cancel_at),
            current_period_end: tsToIso(obj.current_period_end),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", obj.customer);
        break;
      }

      default:
        // Ignore everything else (invoice.*, payment_intent.*, etc.).
        break;
    }
  } catch (e) {
    // We swallow handler errors and return 200 so Stripe doesn't
    // retry-storm on a transient DB issue. Real outages will show up
    // in Vercel logs.
    console.error("[stripe webhook] handler error", event.type, e);
  }

  return NextResponse.json({ received: true });
}
