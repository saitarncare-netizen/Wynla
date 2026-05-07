// Next.js 16 proxy (formerly middleware) — runs on every request. Its only
// job for Wynla is to keep the Supabase auth cookie fresh by calling
// `supabase.auth.getUser()`, which triggers a session refresh if the access
// token expired. Without this the user gets silently logged out after an hour.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
            response.cookies.set(name, value, options);
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
    // Match all paths EXCEPT static assets and Next internals.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
