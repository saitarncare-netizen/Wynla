// Email-link confirmation that works in ANY browser.
//
// The old flow (Supabase's ConfirmationURL -> /auth/callback?code=...) needs
// the PKCE code verifier cookie from the browser that requested the email.
// iOS opens mail links in Safari, not in the installed PWA; Gmail/Outlook
// open them in an in-app browser; people read mail on the phone and sign in
// on the laptop. In all of those the verifier is missing and sign-in fails.
//
// The email template now links here with `token_hash` + `type` instead
// (see handoff-docs/AUTH_SETUP_2026-09-23.md). verifyOtp with a token hash
// is a plain server-side call: no verifier, the session cookies are written
// for whichever browser opened the link. The 6-digit code in the same email
// remains the primary path; this is the fallback for people who tap the link.

import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { nextFromRedirectTo, safeNext } from "@/lib/safeNext";
import { loginErrorCodeFromAuthError, type LoginErrorCode } from "@/lib/authErrorCode";

const EMAIL_OTP_TYPES: ReadonlySet<string> = new Set<EmailOtpType>([
  "email",
  "magiclink",
  "signup",
  "invite",
  "recovery",
  "email_change",
]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type");
  // The template can carry the destination either as our own `next` or as
  // Supabase's `redirect_to` (= the emailRedirectTo we passed, which wraps
  // `next`). Prefer the explicit one.
  const next = url.searchParams.has("next")
    ? safeNext(url.searchParams.get("next"), url.origin)
    : nextFromRedirectTo(url.searchParams.get("redirect_to"), url.origin);

  const toLogin = (e: LoginErrorCode) => {
    const login = new URL("/login", url.origin);
    login.searchParams.set("e", e);
    if (next !== "/") login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  };

  if (!tokenHash || !rawType || !EMAIL_OTP_TYPES.has(rawType)) {
    return toLogin("invalid");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    type: rawType as EmailOtpType,
    token_hash: tokenHash,
  });
  if (error) {
    return toLogin(loginErrorCodeFromAuthError(error));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
