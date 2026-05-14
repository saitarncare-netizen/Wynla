// Stage 32 — opt-in / opt-out endpoint for digest_subscriptions.
//
// POST: upsert a digest_subscriptions row for the currently authenticated user.
//       Body: { frequency?: 'daily' | 'weekly', threshold_in?: number }
//       Frequency defaults to 'daily'. We pull the email from auth.users
//       (server-side) rather than trusting the client to send it.
//
// DELETE: soft-disable the user's row (enabled=false). We keep the row so
//         a future analytics pass can see how often users opt back in.
//
// Subscription UI is intentionally not bundled here — another agent owns
// app/account/pro/page.tsx, and the digest preferences widget belongs in
// app/account/digest/page.tsx (see TODO at the bottom of this file).

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
  // Soft-disable so we retain analytics on opt-out churn.
  const { error } = await supabase
    .from("digest_subscriptions")
    .update({ enabled: false })
    .eq("user_id", u.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// TODO(ui): build the user-facing digest preferences page at
// `app/account/digest/page.tsx`. It should:
//   - fetch the user's current digest_subscriptions row on mount
//   - render a frequency picker (daily / weekly) and an "Unsubscribe" button
//   - POST here on save, DELETE here on unsubscribe
// Skipping in this stage because another agent owns app/account/pro/page.tsx.
