// PATCH /api/feedback/[id] — admin-only. Sets status to "reviewed"
// (only allowed transition for now). RLS on feedback already restricts
// UPDATE to saitarncare@gmail.com so the route just forwards the
// update; if the caller isn't authorized, Supabase silently no-ops the
// row count and we surface a 403.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ADMIN_EMAIL = "saitarncare@gmail.com";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user || u.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let payload: { status?: string } = {};
  try {
    payload = (await req.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const status = payload.status;
  if (status !== "reviewed" && status !== "new") {
    return NextResponse.json(
      { error: "status must be 'new' or 'reviewed'" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("feedback")
    .update({ status })
    .eq("id", numericId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, status });
}
