// Profile endpoint — POST to update display_name + preferred_origin.
//
// Body: { display_name?: string | null, preferred_origin?: string | null }
//   - display_name: trimmed; empty string → null; max 60 chars.
//   - preferred_origin: must be one of the known origin codes
//     (nyc | boston | philadelphia | hartford) or null. Anything else
//     is rejected so we don't pollute the column with arbitrary strings.
//
// Auth via the SSR-aware Supabase server client (reads cookie set by
// /auth/callback). RLS on `profiles` already restricts updates to the
// row where id = auth.uid(), but we also redundantly scope the WHERE
// clause to user.id as a belt-and-braces measure.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ORIGINS } from "@/lib/origins";

export const runtime = "nodejs";

type PostBody = {
  display_name?: string | null;
  preferred_origin?: string | null;
};

const ORIGIN_CODES = new Set(ORIGINS.map((o) => o.code));

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: { display_name?: string | null; preferred_origin?: string | null } = {};

  if (body.display_name !== undefined) {
    if (body.display_name === null) {
      update.display_name = null;
    } else if (typeof body.display_name === "string") {
      const trimmed = body.display_name.trim();
      update.display_name = trimmed === "" ? null : trimmed.slice(0, 60);
    } else {
      return NextResponse.json({ error: "Invalid display_name" }, { status: 400 });
    }
  }

  if (body.preferred_origin !== undefined) {
    if (body.preferred_origin === null) {
      update.preferred_origin = null;
    } else if (
      typeof body.preferred_origin === "string" &&
      ORIGIN_CODES.has(body.preferred_origin)
    ) {
      update.preferred_origin = body.preferred_origin;
    } else {
      return NextResponse.json(
        { error: "Invalid preferred_origin" },
        { status: 400 },
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", u.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...update });
}
