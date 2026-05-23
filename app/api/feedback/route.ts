// Feedback intake endpoint — Inaugural Season 2026.
//
// POST a feedback body (5-5000 chars) + optional email. We capture:
//   - body, email  (from JSON body)
//   - page_url     (also from body — submitter knows their URL best)
//   - user_agent   (from request headers)
//   - user_id      (from the SSR Supabase session — null when anon)
//   - status='new' (default; admin marks 'reviewed' from /account/feedback)
//
// RLS on the feedback table already allows anon+authenticated to INSERT
// and restricts SELECT/UPDATE to saitarncare@gmail.com, so this route
// can use the regular SSR client (no service-role key needed for the
// happy path).

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PostBody = {
  body?: unknown;
  email?: unknown;
  page_url?: unknown;
};

export async function POST(req: NextRequest) {
  let payload: PostBody = {};
  try {
    payload = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // body — required, trimmed, 5-5000 chars.
  if (typeof payload.body !== "string") {
    return NextResponse.json({ error: "Feedback body is required" }, { status: 400 });
  }
  const body = payload.body.trim();
  if (body.length < 5) {
    return NextResponse.json(
      { error: "Feedback must be at least 5 characters." },
      { status: 400 },
    );
  }
  if (body.length > 5000) {
    return NextResponse.json(
      { error: "Feedback is too long (max 5000 chars)." },
      { status: 400 },
    );
  }

  // email — optional. Loose RFC-ish check; the column allows NULL.
  let email: string | null = null;
  if (payload.email != null && payload.email !== "") {
    if (typeof payload.email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    const e = payload.email.trim();
    if (e.length > 0) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 320) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      email = e;
    }
  }

  // page_url — optional, sanity-bounded.
  let pageUrl: string | null = null;
  if (typeof payload.page_url === "string" && payload.page_url.trim() !== "") {
    pageUrl = payload.page_url.trim().slice(0, 2000);
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  const userId = u.user?.id ?? null;

  const { error } = await supabase.from("feedback").insert({
    body,
    email,
    user_id: userId,
    page_url: pageUrl,
    user_agent: userAgent,
    status: "new",
  });

  if (error) {
    return NextResponse.json(
      { error: "Couldn't save feedback. Try again?" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
