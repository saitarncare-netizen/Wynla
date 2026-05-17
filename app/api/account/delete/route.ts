// Account-deletion endpoint. GDPR + App Store requirement for any app
// that supports sign-in (Apple App Store rule 5.1.1(v) — accounts must
// be deletable from inside the app, not just via support email).
//
// Flow:
//   1. Verify the caller is signed in (SSR cookie auth).
//   2. Verify they posted the magic { confirm: "DELETE" } payload — protects
//      against accidental form-submit and against CSRF (cookies alone aren't
//      enough for a destructive call).
//   3. Use the service-role admin client to call auth.admin.deleteUser(id).
//      All FKs to auth.users(id) are ON DELETE CASCADE (favorites, trips,
//      profiles, digest_subscriptions, snow_alerts, resort_reviews,
//      recent_visits, push_subscriptions, stripe_customers), so the user's
//      data is cleaned up automatically by Postgres.
//   4. Sign the user out of the current session before returning so the
//      browser doesn't keep a half-stale token.
//
// Env vars required: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type DeleteBody = { confirm?: string };

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

  // Admin client bypasses RLS so we can call auth.admin.deleteUser().
  // Never expose this client to the browser — it's a service-role secret.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(u.user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Sign out the current session so the browser cookie doesn't keep a
  // ghost reference to a now-deleted user.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
