// One-click digest unsubscribe. Works with no session: the token in the
// URL is an HMAC over the subscription id (lib/digestUnsubscribe.ts).
//
// GET  ?token=…  Renders a tiny confirmation page with a single button.
//                GET is deliberately side-effect free: corporate mail
//                scanners and link previewers fetch every URL in an
//                email, and an unsubscribe-on-GET would silently opt
//                people out.
// POST ?token=…  Disables the subscription. This is the button's form
//                target AND the RFC 8058 List-Unsubscribe-Post target
//                (Gmail / Yahoo POST "List-Unsubscribe=One-Click" here).
//
// Rows are disabled, not deleted, matching /api/digest/subscribe DELETE.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { digestSigningSecret, verifyUnsubscribeToken } from "@/lib/digestUnsubscribe";

export const runtime = "nodejs";

const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app").replace(/\/+$/, "");

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function page(title: string, bodyHtml: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${escapeHtml(title)} · Wynla</title>
</head>
<body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#4A4D5A;">
  <main style="max-width:480px;margin:48px auto;padding:0 16px;">
    <div style="background:#fff;border-radius:12px;padding:28px 24px;border-top:3px solid #87CEEB;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1E2952;">Wynla</div>
      <h1 style="margin:12px 0 8px;font-size:22px;line-height:1.25;color:#1E2952;">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </div>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

function invalidTokenPage(): NextResponse {
  return page(
    "This unsubscribe link is not valid",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;">The link may be incomplete or from an older email. You can manage digest emails from your account instead.</p>
     <a href="${SITE_BASE}/account/digest" style="display:inline-block;padding:10px 16px;background:#1E2952;color:#FAF7F2;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open digest settings</a>`,
    400,
  );
}

function resolveSubscriptionId(req: NextRequest): number | null {
  const secret = digestSigningSecret();
  if (!secret) return null;
  return verifyUnsubscribeToken(req.nextUrl.searchParams.get("token"), secret);
}

export async function GET(req: NextRequest) {
  const id = resolveSubscriptionId(req);
  if (id == null) return invalidTokenPage();
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const action = `${SITE_BASE}/api/digest/unsubscribe?token=${encodeURIComponent(token)}`;
  return page(
    "Stop the Wynla digest?",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;">You will no longer receive the snow digest email. Your favorites and snow alerts stay as they are, and you can turn the digest back on any time from your account.</p>
     <form method="post" action="${escapeHtml(action)}" style="margin:0 0 12px;">
       <button type="submit" style="padding:10px 16px;background:#1E2952;color:#FAF7F2;border:0;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Unsubscribe</button>
     </form>
     <a href="${SITE_BASE}/account/digest" style="font-size:13px;color:#4A4D5A;">Change cadence or threshold instead</a>`,
  );
}

export async function POST(req: NextRequest) {
  const id = resolveSubscriptionId(req);
  if (id == null) return invalidTokenPage();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return page(
      "Something went wrong",
      `<p style="margin:0;font-size:15px;line-height:1.5;">We could not update your subscription right now. Please try again later or use your account settings.</p>`,
      503,
    );
  }
  const admin = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await admin
    .from("digest_subscriptions")
    .update({ enabled: false })
    .eq("id", id);
  if (error) {
    return page(
      "Something went wrong",
      `<p style="margin:0;font-size:15px;line-height:1.5;">We could not update your subscription right now. Please try again later or use your account settings.</p>`,
      500,
    );
  }

  // Mail clients doing an RFC 8058 one-click POST only look at the status
  // code; humans coming from the confirmation form get the page.
  const accept = req.headers.get("accept") ?? "";
  if (!accept.includes("text/html")) {
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  }
  return page(
    "You are unsubscribed",
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;">No more digest emails. Snow alerts on your phone, if you turned any on, are separate and still active.</p>
     <a href="${SITE_BASE}/account/digest" style="display:inline-block;padding:10px 16px;background:#1E2952;color:#FAF7F2;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Turn it back on</a>`,
  );
}
