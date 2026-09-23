// Inaugural Season 2026 — Founder Waitlist signup endpoint.
//
// POST /api/early { email: string, ref?: string }
//   1. Validate the email (basic shape check; full RFC is overkill here).
//   2. Insert into public.pro_waitlist via the service role
//      (source = 'founder' or 'founder:ref:<code>'). UNIQUE(email) handles
//      duplicates — "already on the list" is a success so refresh-and-
//      resubmit does not feel like an error.
//   3. Send the "you're in" welcome email via Resend and WAIT for it. On
//      serverless a promise left dangling after the response is not
//      guaranteed to run, so fire-and-forget meant some welcomes never
//      went out while the page said "check your inbox". The extra
//      ~300 ms is worth an honest answer: the JSON says whether the mail
//      was sent, and the form words its success message accordingly.
//
// Returns: { ok, alreadyOnList, count, referralCode, referralCount,
//            emailed, emailReason? }
//
// Why service role? RLS on pro_waitlist already allows public INSERT
// (`waitlist_insert_open`) but SELECT is closed, and we want the count
// without poking holes in RLS. The service role is server-only and
// never reaches the browser.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
  getResend,
  getResendFrom,
  isResendConfigured,
} from "@/lib/email/resendClient";
import { founderWelcomeEmail } from "@/lib/email/templates/founderWelcome";
import {
  referralCode,
  sanitizeRef,
  REFERRAL_SOURCE_PREFIX,
} from "@/lib/referral";
import { checkRateLimit, clientIp, sameOriginOk } from "@/lib/rateLimit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app").replace(/\/+$/, "");

type PostBody = { email?: string; ref?: string };

type EmailOutcome =
  | { emailed: true }
  | { emailed: false; emailReason: "not_configured" | "send_failed" | "already_on_list" };

export async function POST(req: NextRequest) {
  let body: PostBody = {};
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Abuse guards (infra-free — see lib/rateLimit.ts).
  if (!sameOriginOk(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rl = checkRateLimit(`early:${clientIp(req)}`, { windowMs: 60_000, max: 6 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many signups from this connection. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const raw = (body.email ?? "").trim().toLowerCase();
  if (!raw || raw.length > 254 || !EMAIL_RE.test(raw)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  // Second guard keyed by the address itself, so one connection cannot
  // probe many addresses for "already on the list" quickly, and a
  // rotating-IP script still hits a wall per target address. Hashed so
  // the in-memory limiter never holds a raw email.
  const emailKey = createHash("sha256").update(raw).digest("hex").slice(0, 16);
  const rlEmail = checkRateLimit(`early:email:${emailKey}`, { windowMs: 60 * 60_000, max: 3 });
  if (!rlEmail.ok) {
    return NextResponse.json(
      // No "check your inbox" here: earlier attempts may have returned
      // emailed:false (Resend unconfigured or a failed send), and telling
      // someone to look for a mail that never went out is the reason they
      // are retrying in the first place.
      { error: "That address was submitted a few times already. Your spot is saved. Try again in an hour." },
      { status: 429, headers: { "Retry-After": String(rlEmail.retryAfterSec) } },
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

  // Referral attribution (schema-free — see lib/referral.ts). A valid
  // ?ref code tags this signup as "founder:ref:<code>"; otherwise plain
  // "founder". Either way it counts as a founder for the total counter.
  const ref = sanitizeRef(body.ref);
  const source = ref ? `${REFERRAL_SOURCE_PREFIX}${ref}` : "founder";

  // Insert; treat "duplicate email" as success.
  const { error: insertError } = await sb
    .from("pro_waitlist")
    .insert({ email: raw, source });

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

  // Count all founder signups (direct + referred) for the page counter.
  const { count } = await sb
    .from("pro_waitlist")
    .select("id", { count: "exact", head: true })
    .like("source", "founder%");

  // This member's own referral code + how many they've brought in, so the
  // success screen can show their share link and the real count. There is
  // no ranking or queue position behind it; the copy must not promise one.
  const myCode = referralCode(raw);
  const { count: myReferrals } = await sb
    .from("pro_waitlist")
    .select("id", { count: "exact", head: true })
    .eq("source", `${REFERRAL_SOURCE_PREFIX}${myCode}`);

  // Welcome email, awaited (see header). A duplicate signup never gets a
  // second mail: UNIQUE(email) caps every address at one welcome ever.
  const email: EmailOutcome = alreadyOnList
    ? { emailed: false, emailReason: "already_on_list" }
    : await sendFounderWelcomeEmail(raw, `${SITE_BASE}/early?ref=${myCode}`);
  if (!email.emailed && email.emailReason === "send_failed") {
    console.error("[/api/early] founder welcome send failed for a new signup");
  }

  return NextResponse.json({
    ok: true,
    alreadyOnList,
    count: count ?? null,
    referralCode: myCode,
    referralCount: myReferrals ?? 0,
    ...email,
  });
}

// Welcome email — only sends if RESEND_API_KEY is configured and we
// have a verified sending domain. Copy intentionally avoids quoting the
// exact founder price; we just promise "a Founder Member rate that no one
// will ever see again" so the number stays out of public archives.
//
// Never throws: the signup has already succeeded by the time this runs,
// and the caller reports the outcome in the JSON instead.
async function sendFounderWelcomeEmail(toEmail: string, referralUrl: string): Promise<EmailOutcome> {
  if (!isResendConfigured()) return { emailed: false, emailReason: "not_configured" };

  const { subject, html, text } = founderWelcomeEmail({ referralUrl });
  try {
    const resend = getResend();
    const { error } = await resend.emails.send({
      from: getResendFrom(),
      to: toEmail,
      subject,
      html,
      text,
    });
    if (error) {
      console.error("[/api/early] Resend error", error.name ?? "?", error.message ?? "");
      return { emailed: false, emailReason: "send_failed" };
    }
    return { emailed: true };
  } catch (err) {
    console.error("[/api/early] Resend threw", err);
    return { emailed: false, emailReason: "send_failed" };
  }
}
