// Account-deletion endpoint. GDPR + App Store requirement for any app
// that supports sign-in (Apple App Store rule 5.1.1(v) — accounts must
// be deletable from inside the app, not just via support email).
//
// Flow:
//   1. Verify the caller is signed in (SSR cookie auth).
//   2. Verify they posted the magic { confirm: "DELETE" } payload — protects
//      against accidental form-submit and against CSRF (cookies alone aren't
//      enough for a destructive call).
//   3. Cancel any live Stripe subscription FIRST. pro_subscriptions cascades
//      away with the user, and it is the only mapping from the Stripe
//      customer back to a Wynla account — if we deleted first, later
//      webhooks would update zero rows and the person would keep paying
//      for an account that no longer exists (audit finding security-2).
//   4. Use the service-role admin client to call auth.admin.deleteUser(id).
//      All FKs to auth.users(id) are ON DELETE CASCADE (favorites, trips,
//      profiles, digest_subscriptions, snow_alerts, resort_reviews,
//      recent_visits, push_subscriptions, pro_subscriptions), so the
//      user's data is cleaned up automatically by Postgres.
//   5. Sign the user out of the current session before returning so the
//      browser doesn't keep a half-stale token.
//
// Env vars required: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// STRIPE_SECRET_KEY is needed only when the user has a live subscription.

import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cancelSubscription, StripeError } from "@/lib/stripeClient";

export const runtime = "nodejs";

type DeleteBody = { confirm?: string };

type SubscriptionRow = {
  stripe_subscription_id: string | null;
  status: string | null;
};

// Stripe subscription statuses that mean "no further invoices will be
// generated" — nothing to cancel. Everything else (active, trialing,
// past_due, unpaid, paused) can still bill and must be ended first.
const TERMINAL_STATUSES = new Set(["canceled", "incomplete_expired"]);

// PostgREST error codes for "table/column does not exist". The live
// schema (handoff-docs/DB_SCHEMA_LIVE_2026-09-23.md) has this table, but
// the route feature-detects so a schema drift degrades to a logged
// warning instead of blocking every deletion.
const MISSING_RELATION_CODES = new Set(["42P01", "42703", "PGRST205", "PGRST204"]);

type CancelOutcome =
  | { ok: true; cancelled: boolean }
  | { ok: false; message: string };

async function cancelLiveSubscription(
  admin: SupabaseClient,
  userId: string,
): Promise<CancelOutcome> {
  const { data, error } = await admin
    .from("pro_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (MISSING_RELATION_CODES.has(error.code)) {
      console.warn(
        "[account/delete] pro_subscriptions unavailable, skipping Stripe cancel:",
        error.code,
      );
      return { ok: true, cancelled: false };
    }
    // Any other DB error: we cannot prove there is no live subscription,
    // so refuse rather than risk a deleted-and-billed account.
    console.error("[account/delete] pro_subscriptions lookup failed:", error.message);
    return { ok: false, message: "Could not check your subscription. Please try again." };
  }

  const sub = data as SubscriptionRow | null;
  const subId = sub?.stripe_subscription_id;
  if (!subId || TERMINAL_STATUSES.has(sub?.status ?? "")) {
    return { ok: true, cancelled: false };
  }

  try {
    await cancelSubscription(subId);
    return { ok: true, cancelled: true };
  } catch (err) {
    // Already gone on Stripe's side — the webhook may simply not have
    // reached us yet. Safe to proceed.
    if (err instanceof StripeError && err.status === 404) {
      return { ok: true, cancelled: false };
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("[account/delete] Stripe cancel failed for", subId, message);
    return {
      ok: false,
      message:
        "We could not cancel your Pro subscription, so the account was not deleted. Please try again in a few minutes or email hello@wynla.app.",
    };
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: DeleteBody = {};
  try {
    body = (await req.json()) as DeleteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  // Admin client bypasses RLS so we can read pro_subscriptions for this
  // user and call auth.admin.deleteUser(). Never expose this client to
  // the browser — it's a service-role secret.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const cancel = await cancelLiveSubscription(admin, u.user.id);
  if (!cancel.ok) {
    return NextResponse.json({ error: cancel.message }, { status: 502 });
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(u.user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Sign out the current session so the browser cookie doesn't keep a
  // ghost reference to a now-deleted user.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true, subscriptionCancelled: cancel.cancelled });
}
