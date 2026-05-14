// POST /api/checkout/create-session
// Body: { interval: 'month' | 'year' }
// Returns: { url: string } — the hosted Stripe Checkout URL the
// client should `window.location.assign(...)` to. We always create a
// fresh session per click (Stripe sessions are short-lived).
//
// 401 if no user. 503 if Stripe env vars aren't set yet (this lets us
// ship the scaffolding before the user has finished Stripe dashboard
// setup, without the page crashing).

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCheckoutSession, StripeError } from "@/lib/stripeClient";
import { isStripeConfigured } from "@/lib/pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { interval?: "month" | "year" };

function siteOrigin(req: Request): string {
  // Prefer the configured public URL, fall back to the request's own
  // origin so previews/localhost work without env config.
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Pro tier not configured yet" },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json(
      { error: "Account missing email — sign out and back in" },
      { status: 400 },
    );
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    // Empty body is fine — default to monthly.
  }
  const interval: "month" | "year" =
    body.interval === "year" ? "year" : "month";

  const priceId =
    interval === "year"
      ? process.env.STRIPE_PRICE_ID_PRO_YEARLY
      : process.env.STRIPE_PRICE_ID_PRO_MONTHLY;
  if (!priceId) {
    return NextResponse.json(
      { error: "Pro tier not configured yet" },
      { status: 503 },
    );
  }

  const origin = siteOrigin(req);
  try {
    const session = await createCheckoutSession({
      priceId,
      customerEmail: user.email,
      userId: user.id,
      successUrl: `${origin}/account/pro?status=success`,
      cancelUrl: `${origin}/pro?canceled=1`,
      trialDays: 7,
    });
    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const status = e instanceof StripeError ? 502 : 500;
    const message =
      e instanceof Error ? e.message : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status });
  }
}
