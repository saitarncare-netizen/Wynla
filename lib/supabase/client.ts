// Browser-side Supabase client. Use in any `"use client"` component that
// needs to mutate user data (toggle favorite, sign out, etc.).

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
