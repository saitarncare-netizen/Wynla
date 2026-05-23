// Next.js 16 proxy (formerly middleware) — runs on every request. Its only
// job for Wynla is to keep the Supabase auth cookie fresh by calling
// `supabase.auth.getUser()`, which triggers a session refresh if the access
// token expired. Without this the user gets silently logged out after an hour.
//
// Session lifetime (Round 5 polish, 2026-05-23)
// ---------------------------------------------
// Supabase's @supabase/ssr defaults set the auth cookie's maxAge to ~1h —
// which meant users who returned to /trips after a meeting or overnight
// were silently logged out and had to magic-link again. We extend every
// auth cookie this middleware writes to 7 days (604800s) so the session
// persists across normal browsing patterns. The Supabase access token
// itself still rotates every hour (the refresh token does the refreshing
// inside getUser() below), but the COOKIE that carries the session
// survives so we always have something to refresh on the user's next
// visit.
//
// Matcher: we match every page route + every API route, excluding only
// static assets + Next internals. /trips, /trip/[id], /account,
// /favorites etc. all flow through here so their cookies get refreshed
// on every visit. Be careful when changing the matcher regex below —
// excluding /trip would silently kill session refresh for the trip page.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// 7 days in seconds. Long enough that someone who installs the PWA on
// Monday and opens it again on Friday is still signed in; short enough
// that a stolen laptop's session expires within a normal "I'd realize
// it was gone" window.
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            // Extend maxAge to 7 days for every auth cookie we set —
            // Supabase's default is 1h, which silently logged users
            // out between sessions. We preserve every other option
            // (httpOnly, sameSite, secure, path) the SDK chose so
            // we're not opening a security hole.
            const extended: CookieOptions = {
              ...options,
              maxAge: SESSION_MAX_AGE_SECONDS,
            };
            response.cookies.set(name, value, extended);
          }
        },
      },
    },
  );

  // Touch the user — this refreshes the session cookie if the token is near
  // expiry. We don't read the result; the side-effect is what matters.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Match all paths EXCEPT static assets and Next internals. Note:
    // this MUST include /trips, /trip/:id, /account, /favorites — those
    // routes rely on the proxy to refresh the session cookie. Be
    // careful: the regex below uses negative lookahead on the prefixes
    // we want to skip; do NOT add /trip or /account here unless you
    // mean to also skip session refresh on those routes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
