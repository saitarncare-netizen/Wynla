// GET /api/me/pro-status — used by the client-side `useProStatus`
// hook to decide whether to show Pro-gated UI. Returns `{ isPro: false }`
// for unauthenticated requests (never a 401) so callers don't need to
// branch on auth state.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isProUser } from "@/lib/pro";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) {
    return NextResponse.json({ isPro: false });
  }
  const isPro = await isProUser(userId);
  return NextResponse.json({ isPro });
}
