// Store / refresh / remove a device's Web Push subscription so the
// snow-alert cron can fan out notifications to it.
//
// POST body: { subscription: PushSubscription, userAgent?: string }
//   Upserts by endpoint. Requires a signed-in user: snow_alerts rows are
//   per user, so an anonymous subscription could never be matched to an
//   alert anyway.
//
//   Why the service-role client: the live push_subscriptions table has
//   SELECT / INSERT / DELETE policies but no UPDATE policy, and a
//   supabase-js upsert is INSERT ... ON CONFLICT DO UPDATE, which Postgres
//   checks against UPDATE policies on the conflict path. The second enable
//   on the same device (e.g. alerts for a second resort, or after
//   sign-out/sign-in) therefore fails under RLS. handoff-docs/sql/
//   2026-09-23-alerts.sql adds the policy; until it runs, and as a belt
//   and braces after, the write happens with the service role, scoped to
//   the signed-in caller's user id (see the proof-of-possession note
//   below for why endpoint + keys is sufficient).
//
// DELETE ?endpoint=...  Removes the caller's row for that endpoint. Runs
//   through the cookie client so RLS scopes it to the signed-in user.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PushSubscriptionJSON = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

type StoredSub = {
  user_id: string | null;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  let body: { subscription?: PushSubscriptionJSON; userAgent?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(sub.endpoint);
  } catch {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }
  if (endpointUrl.protocol !== "https:" || sub.endpoint.length > 2048) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Sign in to enable alerts" }, { status: 401 });
  }

  const row = {
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: (body.userAgent ?? "").slice(0, 512) || null,
    last_seen_at: new Date().toISOString(),
  };

  const admin = serviceClient();
  if (!admin) {
    // No service key in this environment: fall back to the RLS path. The
    // first insert works; a re-enable on the same device needs the UPDATE
    // policy from the SQL file.
    const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Proof of possession before the privileged write: the endpoint URL and
  // its p256dh/auth keys are minted together by the browser and are never
  // readable by another account (SELECT is own-rows only), so presenting
  // all three IS the proof that this browser holds the subscription. A
  // row that already belongs to a different account therefore means the
  // same device signed in as someone else (shared phone) and is rebound
  // to the caller on purpose; there is no extra ownership guard beyond
  // that. The prior row is read only to report the rebind in the JSON.
  const { data: existing, error: readErr } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("endpoint", sub.endpoint)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  const prior = existing as StoredSub | null;

  const { error } = await admin
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rebound: Boolean(prior && prior.user_id !== userId) });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // Scoped to the caller both here and by RLS (push_subs_delete_own), so
  // nobody can unsubscribe a device that is not theirs by leaking its
  // endpoint URL.
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", u.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
