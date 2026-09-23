// OAuth (Google) and legacy magic-link callback. Supabase redirects here with
// a PKCE `code` after the provider round trip; we exchange it for a session
// and forward the user to where they started. Email links now go through
// /auth/confirm (token_hash, works in any browser); this route stays the
// OAuth landing and still handles any old-template magic link.
//
// On failure Supabase does not send a `code` at all but `error`,
// `error_code` and `error_description` query params (expired link, link
// already consumed by a mail scanner, provider cancel). Those, and any
// exchange error, are mapped to a short internal code so the login page can
// show human copy with the right next step. Raw SDK strings never reach
// the URL.

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safeNext";
import {
  loginErrorCodeFromAuthError,
  loginErrorCodeFromRedirectParams,
  type LoginErrorCode,
} from "@/lib/authErrorCode";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"), url.origin);

  const toLogin = (e: LoginErrorCode | null) => {
    const login = new URL("/login", url.origin);
    if (e) login.searchParams.set("e", e);
    if (next !== "/") login.searchParams.set("next", next);
    return NextResponse.redirect(login);
  };

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    return toLogin(loginErrorCodeFromAuthError(error));
  }

  const error = url.searchParams.get("error");
  const errorCode = url.searchParams.get("error_code");
  if (error || errorCode) {
    return toLogin(loginErrorCodeFromRedirectParams({ error, errorCode }));
  }

  // Neither a code nor an error: someone hit the URL by hand or a mangled link.
  return toLogin("invalid");
}
