// Server-side Supabase client for React Server Components, Route Handlers,
// and Server Actions. Reads the user session from cookies set by the proxy.
//
// Use this in any `app/**` server file that needs `supabase.auth.getUser()`
// or RLS-aware queries on behalf of the logged-in user.
//
// Session lifetime: cookies written here also use the 7-day maxAge so
// they line up with the proxy's session lifetime. Without this, a route
// handler that wrote auth cookies (e.g. /auth/callback) would default
// to Supabase's 1h, leading to a confusing "I just signed in but the
// cookie expires in 1h" situation. Keep this in sync with proxy.ts.

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              const extended: CookieOptions = {
                ...options,
                maxAge: SESSION_MAX_AGE_SECONDS,
              };
              cookieStore.set(name, value, extended);
            }
          } catch {
            // The setAll method was called from a Server Component (read-only).
            // Cookie-refresh handled by proxy.ts on the next request, so this
            // path can be safely ignored.
          }
        },
      },
    },
  );
}
