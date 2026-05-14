// Server-side Pro tier helpers. Single source of truth for "is this
// user a paying subscriber?" — read in Server Components, Route
// Handlers, and Server Actions. Reads through the user-scoped Supabase
// client so RLS does the user_id check for us.

import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProStatusRow = {
  status: string;
  current_period_end: string | null;
};

// Statuses that should grant Pro features. Anything else (canceled,
// past_due, incomplete, etc.) does not.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function isProUser(
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pro_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .maybeSingle<{ status: string }>();
  if (error || !data) return false;
  return ACTIVE_STATUSES.has(data.status);
}

export async function getProStatus(
  userId: string,
): Promise<{ status: string; current_period_end: Date | null } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("pro_subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle<ProStatusRow>();
  if (error || !data) return null;
  return {
    status: data.status,
    current_period_end: data.current_period_end
      ? new Date(data.current_period_end)
      : null,
  };
}

// Returns true iff all required Stripe env vars are present. Used by
// API routes to short-circuit with a 503 before doing real work, and
// by the /pro page to switch into a "coming soon" mode.
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_ID_PRO_MONTHLY &&
      process.env.STRIPE_PRICE_ID_PRO_YEARLY,
  );
}
