// "Email me this every Thursday" — session-authed opt-in for the Saturday
// picks email.
//
// The Thursday list is its own consent: profiles.pass_product set means
// "send me the picks" (NULL = not on the list). It never touches the
// weekly favorites digest's enabled flag, so opting in here does not
// start the Monday recap and stopping here does not end it. The
// digest_subscriptions row is still needed, because it holds the address
// and the id the signed unsubscribe link is minted from; when the user
// has none, one is created with enabled = false.
//
// POST body: { city: string, pass: string | null, product: string | null }
//   1. Saves the city to profiles.preferred_origin (live column) and the
//      pass choice to profiles.pass_product (added by
//      handoff-docs/sql/2026-09-23-go.sql). When that column is missing
//      the city still saves and the response says { ok: false, reason:
//      "coming_soon" } so the UI can tell the user honestly.
//   2. Ensures a digest_subscriptions row exists (never changes enabled).
//
// DELETE: clears pass_product, which stops the Thursday email.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/cronRun";
import { launchCityByCode } from "@/lib/origins";
import { formatPassProduct } from "@/lib/saturday/passProduct";
import { parsePassFamily, parseProduct } from "@/lib/saturday/url";

export const runtime = "nodejs";

type PostBody = { city?: string | null; pass?: string | null; product?: string | null };

let warnedMissingColumn = false;

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!u.user.email) {
    return NextResponse.json({ error: "User has no email on file" }, { status: 400 });
  }

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const city = launchCityByCode(body.city ?? null);
  if (!city) {
    // A geo origin cannot be stored: the email needs a named city.
    return NextResponse.json({ error: "Pick a city to get the email" }, { status: 400 });
  }
  const family = parsePassFamily(body.pass ?? null);
  const product = parseProduct(family, body.product ?? null);
  const passProduct = formatPassProduct({ family, product });

  // City first (live column), then the pass column on its own so a
  // missing column cannot roll back the city.
  const cityWrite = await supabase
    .from("profiles")
    .update({ preferred_origin: city.code })
    .eq("id", u.user.id);
  if (cityWrite.error) {
    return NextResponse.json({ error: cityWrite.error.message }, { status: 500 });
  }
  const passWrite = await supabase.from("profiles").update({ pass_product: passProduct }).eq("id", u.user.id);
  if (passWrite.error) {
    if (isMissingSchemaError(passWrite.error)) {
      if (!warnedMissingColumn) {
        warnedMissingColumn = true;
        console.warn("[go/subscribe] profiles.pass_product is missing; run handoff-docs/sql/2026-09-23-go.sql");
      }
      return NextResponse.json({ ok: false, reason: "coming_soon", city: city.code });
    }
    return NextResponse.json({ error: passWrite.error.message }, { status: 500 });
  }

  // The address + unsubscribe id live on digest_subscriptions. Create the
  // row if the user has none, with the weekly digest OFF: that list is a
  // separate opt-in on /account/digest. An existing row is left alone.
  const { data: existing, error: readErr } = await supabase
    .from("digest_subscriptions")
    .select("id")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }
  if (!existing) {
    const { error: insErr } = await supabase.from("digest_subscriptions").insert({
      user_id: u.user.id,
      email: u.user.email,
      frequency: "weekly",
      threshold_in: 0,
      enabled: false,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, city: city.code, pass_product: passProduct });
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { error } = await supabase.from("profiles").update({ pass_product: null }).eq("id", u.user.id);
  if (error && !isMissingSchemaError(error)) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
