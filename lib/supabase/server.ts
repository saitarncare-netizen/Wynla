// Server-side Supabase client for React Server Components, Route Handlers,
// and Server Actions. Reads the user session from cookies set by the proxy.
//
// Use this in any `app/**` server file that needs `supabase.auth.getUser()`
// or RLS-aware queries on behalf of the logged-in user.
//
// Session lifetime: cookies written here (e.g. by /auth/callback and
// /auth/confirm right after sign-in) get the same 90-day maxAge the proxy
// applies, via the shared helper in lib/supabase/sessionMaxAge.ts, so a
// fresh sign-in and a refreshed session expire on the same schedule.
// Cookie deletions (sign-out, failed refresh) are passed through untouched
// so they actually delete.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { withSessionMaxAge } from "@/lib/supabase/sessionMaxAge";

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
              cookieStore.set(name, value, withSessionMaxAge(value, options));
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
