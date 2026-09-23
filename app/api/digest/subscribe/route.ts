// Opt-in / opt-out endpoint for digest_subscriptions (session-authed).
//
// POST: upsert the current user's row.
//       Body: { frequency?: 'daily' | 'weekly', threshold_in?: number }
//       Frequency defaults to 'daily'. The email comes from auth.users
//       (server-side) rather than from the client.
//
// DELETE: soft-disable the row (enabled=false). The row is kept so opting
//         back in preserves the user's cadence and threshold.
//
// The preferences UI is app/account/digest; the no-session one-click
// path used by email links is app/api/digest/unsubscribe.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PostBody = {
  frequency?: "daily" | "weekly";
  threshold_in?: number;
};

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!u.user.email) {
    // Without an email we can't deliver — and auth.users.email is the only
    // address we trust enough to write into digest_subscriptions.
    return NextResponse.json({ error: "User has no email on file" }, { status: 400 });
  }

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    // Empty body is fine — fall through with defaults.
  }

  const frequency: PostBody["frequency"] =
    body.frequency === "weekly" ? "weekly" : "daily";
  const threshold_in =
    typeof body.threshold_in === "number" && Number.isFinite(body.threshold_in)
      ? Math.max(0, Math.min(50, Math.round(body.threshold_in)))
      : 0;

  const row = {
    user_id: u.user.id,
    email: u.user.email,
    frequency,
    threshold_in,
    enabled: true,
  };

  const { error } = await supabase
    .from("digest_subscriptions")
    .upsert(row, { onConflict: "user_id" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, frequency, threshold_in });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  // Soft-disable: the row keeps the user's cadence and threshold for a
  // later opt-in, and the one-click email path does the same.
  const { error } = await supabase
    .from("digest_subscriptions")
    .update({ enabled: false })
    .eq("user_id", u.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
