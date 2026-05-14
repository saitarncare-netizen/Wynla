// POST /api/checkout/portal — opens the Stripe Customer Portal so the
// user can update payment method, change plan, or cancel. Stripe
// hosts the entire flow; we just hand them the URL.
//
// Requires the user to already have a stripe_customer_id (set by the
// first successful checkout via the webhook). If they don't, this
// route returns 409 — the manage page should not show the button
// until the webhook has populated it.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createBillingPortalSession, StripeError } from "@/lib/stripeClient";
import { isStripeConfigured } from "@/lib/pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteOrigin(req: Request): string {
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

  const { data: sub } = await supabase
    .from("pro_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle<{ stripe_customer_id: string | null }>();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on file" },
      { status: 409 },
    );
  }

  const origin = siteOrigin(req);
  try {
    const session = await createBillingPortalSession({
      customerId: sub.stripe_customer_id,
      returnUrl: `${origin}/account/pro`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    const status = e instanceof StripeError ? 502 : 500;
    const message =
      e instanceof Error ? e.message : "Failed to open billing portal";
    return NextResponse.json({ error: message }, { status });
  }
}
