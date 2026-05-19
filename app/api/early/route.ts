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

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "Wynla <hello@wynla.app>";

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
// exact founder price; we just promise "a special founder rate, locked
// forever" so the number stays out of public archives.
async function sendFounderWelcomeEmail(toEmail: string): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  const subject = "Welcome to the Wynla Founder list";
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.6; color:#2A2A2A; max-width:560px; margin:0 auto; padding:24px;">
  <h1 style="color:#1E2952; font-size:22px; margin:0 0 16px 0;">Welcome to the Wynla Founder list.</h1>
  <p style="margin:0 0 14px 0;">Wynla is the ski and snowboard trip planner built for the 2026&ndash;27 season &mdash; one beautiful map of every US resort, with weather, drive time, and a first-of-its-kind <strong>snow surface forecast</strong> that tells you what the snow will actually feel like under your edges.</p>
  <p style="margin:0 0 14px 0;"><strong>The inaugural season (November 2026 &ndash; April 2027) is free for everyone</strong> &mdash; no credit card, no trial countdown. The Founder Season is about putting the product into the hands of real riders and listening hard before we move to paid plans for Season 2.</p>
  <p style="margin:0 0 14px 0;">As a Founder Member, you keep a <strong>special founder rate, locked forever</strong> when Wynla moves to paid plans. That rate is disclosed only to Founder Members and stays out of public view.</p>
  <p style="margin:0 0 14px 0;">Thank you for backing Wynla early. If a feature would make your season better, or a resort on the map needs better data, just reply to this message &mdash; the team reads every note.</p>
  <p style="margin:24px 0 0 0;">&mdash; The Wynla team</p>
  <hr style="border:none; border-top:1px solid #eee; margin:32px 0 16px 0;"/>
  <p style="font-size:11px; color:#888; margin:0;">You&rsquo;re receiving this because you signed up at wynla.app/early. We&rsquo;ll only email you when Wynla opens for the season &mdash; nothing else.</p>
</body></html>`;
  const text = [
    "Welcome to the Wynla Founder list.",
    "",
    "Wynla is the ski and snowboard trip planner built for the 2026-27 season - one beautiful map of every US resort, with weather, drive time, and a first-of-its-kind snow surface forecast that tells you what the snow will actually feel like under your edges.",
    "",
    "The inaugural season (November 2026 - April 2027) is free for everyone. No credit card, no trial countdown.",
    "",
    "As a Founder Member, you keep a special founder rate, locked forever when Wynla moves to paid plans for Season 2. That rate is disclosed only to Founder Members.",
    "",
    "Thank you for backing Wynla early. If a feature would make your season better, just reply to this message - the team reads every note.",
    "",
    "- The Wynla team",
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: toEmail,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "<no body>");
    throw new Error(`Resend POST /emails failed: ${res.status} ${detail}`);
  }
}
