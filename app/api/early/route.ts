// Inaugural Season 2026 — Founder Waitlist signup endpoint.
//
// POST /api/early { email: string }
//   1. Validate the email (basic shape check; full RFC is overkill here).
//   2. Insert into public.pro_waitlist via the service role
//      (source = 'founder'). UNIQUE(email) handles duplicates — we treat
//      "already on the list" as a success so refresh-and-resubmit
//      doesn't feel like an error.
//   3. Best-effort send a "you're in" confirmation email via Resend if
//      RESEND_API_KEY is configured. If Resend isn't set up yet (e.g.
//      domain not verified, key missing), the signup still succeeds —
//      the email is a bonus, not a blocker.
//
// Returns: { ok, count, alreadyOnList }
//
// Why service role? RLS on pro_waitlist already allows public INSERT
// (`waitlist_insert_open`) but SELECT is closed, and we want the count
// without poking holes in RLS. The service role is server-only and
// never reaches the browser.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getResend,
  getResendFrom,
  isResendConfigured,
} from "@/lib/email/resendClient";
import { founderWelcomeEmail } from "@/lib/email/templates/founderWelcome";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PostBody = { email?: string };

export async function POST(req: NextRequest) {
  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = (body.email ?? "").trim().toLowerCase();
  if (!raw || raw.length > 254 || !EMAIL_RE.test(raw)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured — Supabase service role missing." },
      { status: 500 },
    );
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Insert; treat "duplicate email" as success.
  const { error: insertError } = await sb
    .from("pro_waitlist")
    .insert({ email: raw, source: "founder" });

  // Detect Postgres unique-violation (23505) — Supabase returns the SQL
  // state code as `code`. Anything else is a real failure.
  let alreadyOnList = false;
  if (insertError) {
    const code = (insertError as { code?: string }).code;
    if (code === "23505") {
      alreadyOnList = true;
    } else {
      return NextResponse.json(
        { error: insertError.message || "Could not save your signup." },
        { status: 500 },
      );
    }
  }

  // Count current founder signups for the page counter.
  const { count } = await sb
    .from("pro_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("source", "founder");

  // Best-effort welcome email. Wrapped so any Resend issue doesn't
  // break the signup response.
  if (!alreadyOnList) {
    sendFounderWelcomeEmail(raw).catch((err) => {
      console.error("[/api/early] founder welcome send failed", err);
    });
  }

  return NextResponse.json({
    ok: true,
    alreadyOnList,
    count: count ?? null,
  });
}

// Welcome email — only sends if RESEND_API_KEY is configured and we
// have a verified sending domain. Copy intentionally avoids quoting the
// exact founder price; we just promise "a Founder Member rate that no one
// will ever see again" so the number stays out of public archives.
//
// Uses the Resend SDK via the lazy client in lib/email/resendClient.ts.
// Any failure (missing key, bad domain, API error) is swallowed here so
// the /api/early caller surfaces it via console.error and the signup
// response stays unaffected.
async function sendFounderWelcomeEmail(toEmail: string): Promise<void> {
  if (!isResendConfigured()) return;

  const { subject, html, text } = founderWelcomeEmail();

  const resend = getResend();
  const { error } = await resend.emails.send({
    from: getResendFrom(),
    to: toEmail,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.name ?? "?"} ${error.message ?? ""}`);
  }
}
