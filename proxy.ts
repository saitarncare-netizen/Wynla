// Next.js 16 proxy (formerly middleware). Its only job for Wynla is to keep
// the Supabase auth cookie fresh by calling `supabase.auth.getUser()`, which
// refreshes the session if the access token is about to expire, and to write
// the refreshed cookies back with a season-long lifetime.
//
// Session lifetime
// ----------------
// @supabase/ssr's own cookie default is ~400 days (not 1 hour, as an older
// comment here claimed). The 7-day override we used to apply was therefore
// not fixing a short default; it was CREATING a 7-day inactivity timeout,
// which is why people who skipped a week got signed out. The lifetime now
// comes from lib/supabase/sessionMaxAge.ts (90 days) and is shared with
// lib/supabase/server.ts. HTTP Set-Cookie from here is not subject to
// Safari's 7-day cap on script-written cookies, so this write is the one
// that keeps iPhone users signed in.
//
// Matcher
// -------
// Every page route and every user-facing API route flows through here so
// their cookies get refreshed (/trips, /trip/[id], /account, /favorites,
// /api/me/*, /api/push/* ...). Requests that never carry a user session are
// excluded so they skip the Supabase round trip: Next internals, the service
// worker, manifest, robots/sitemap, cron endpoints (secret-authenticated,
// no cookie), the health check, Open Graph image routes and static files.
// Be careful when changing the regex: excluding /trip or /account would
// silently kill session refresh on those routes.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { withSessionMaxAge } from "@/lib/supabase/sessionMaxAge";

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
          // Re-inject into the request first so Server Components rendered
          // in this same pass read the refreshed token.
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            // Preserve every option the SDK chose (httpOnly, sameSite,
            // secure, path); only the lifetime changes, and deletions are
            // left alone so sign-out really clears the cookie.
            response.cookies.set(name, value, withSessionMaxAge(value, options));
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
    // Negative lookahead on everything that never needs a session. Static
    // file extensions are matched at the end of the path so app routes like
    // /resort/vail are unaffected. Literal dots are written as `[.]`: Next
    // runs this string through path-to-regexp, which strips a single
    // backslash escape, so `\\.` would silently become "any character" and
    // skip routes such as /guides/best-json.
    "/((?!_next/static|_next/image|favicon[.]ico|sw[.]js|manifest[.]json|robots[.]txt|sitemap[.]xml|offline(?:/|$)|api/cron/|api/health(?:/|$)|.*/opengraph-image|.*[.](?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|json|txt|xml|woff|woff2|ttf|webmanifest)$).*)",
  ],
};
