// Magic-link / OAuth callback. Supabase auth redirects here with a `code`
// query param after the user clicks their email link or completes OAuth.
// We exchange it for a session and forward them to wherever they came from.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // `next` is set by the login page so we can return to the original
  // destination (e.g. /resort/foo) after sign-in. Only honor same-origin
  // relative paths — an absolute or protocol-relative value (`https://evil.com`,
  // `//evil.com`) would turn sign-in into an open-redirect / phishing relay.
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    // Fall through to error path if exchange failed.
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin),
    );
  }

  // No code — bad link.
  return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
}
