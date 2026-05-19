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

  const subject = "You're on the Wynla Founder list ⛷️";
  const html = `<!doctype html>
<html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.5; color:#2A2A2A; max-width:560px; margin:0 auto; padding:24px;">
  <h1 style="color:#1E2952; font-size:22px; margin:0 0 16px 0;">You're in. Welcome to the Founder list.</h1>
  <p style="margin:0 0 14px 0;">Wynla is the ski + snowboard trip planner I'm building for the 2026–27 season. It's a single, beautiful map of every US resort, with weather, drive time, and our first-of-its-kind <strong>snow surface forecast</strong> that tells you what the snow will actually feel like under your edges.</p>
  <p style="margin:0 0 14px 0;"><strong>The inaugural season (Nov 2026 – Apr 2027) is free for everyone</strong> — no card, no trial countdown. I want feedback more than revenue right now.</p>
  <p style="margin:0 0 14px 0;">As a Founder member you're in a smaller group: when Wynla goes paid for Season 2, you'll keep a <strong>special founder rate, locked forever</strong>. Details in the welcome email when we open in November.</p>
  <p style="margin:0 0 14px 0;">Thanks for being early. Reply to this email any time if there's a feature you want to see, or a resort that needs better data.</p>
  <p style="margin:24px 0 0 0;">— Saitarn<br/><span style="color:#888;">Founder, Wynla</span></p>
  <hr style="border:none; border-top:1px solid #eee; margin:32px 0 16px 0;"/>
  <p style="font-size:11px; color:#888; margin:0;">You're receiving this because you signed up at wynla.app/early. We'll only email you when Wynla opens for the season — no other spam.</p>
</body></html>`;
  const text = [
    "You're in. Welcome to the Founder list.",
    "",
    "Wynla is the ski + snowboard trip planner I'm building for the 2026-27 season. It's a single, beautiful map of every US resort, with weather, drive time, and our first-of-its-kind snow surface forecast.",
    "",
    "The inaugural season (Nov 2026 - Apr 2027) is FREE for everyone - no card, no trial countdown.",
    "",
    "As a Founder member you keep a special founder rate locked forever when Wynla goes paid for Season 2. Details in the welcome email when we open in November.",
    "",
    "Thanks for being early.",
    "- Saitarn, Founder, Wynla",
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
