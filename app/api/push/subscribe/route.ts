// Stage 29 — store a PushSubscription so the snow-alert cron can fire
// notifications at it later. RLS handles auth; we just upsert by endpoint.
//
// POST body: { subscription: PushSubscription, userAgent?: string }

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();

  const row = {
    user_id: u.user?.id ?? null,
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    user_agent: body.userAgent ?? null,
    last_seen_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const endpoint = url.searchParams.get("endpoint");
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  // Scope the delete to the caller so nobody can unsubscribe a device that
  // isn't theirs by guessing/leaking its endpoint: a logged-in user can only
  // delete their own rows; an anonymous caller only anonymous (null-owner) rows.
  let q = supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  q = u.user?.id ? q.eq("user_id", u.user.id) : q.is("user_id", null);
  const { error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

type PushSubscriptionJSON = {
  endpoint: string;
  keys?: { p256dh?: string; auth?: string };
};
