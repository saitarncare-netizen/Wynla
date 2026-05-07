// Server-side Supabase client for React Server Components, Route Handlers,
// and Server Actions. Reads the user session from cookies set by the proxy.
//
// Use this in any `app/**` server file that needs `supabase.auth.getUser()`
// or RLS-aware queries on behalf of the logged-in user.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
              cookieStore.set(name, value, options);
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
