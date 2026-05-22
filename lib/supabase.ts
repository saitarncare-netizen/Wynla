import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Build resilience: createClient() throws "supabaseUrl is required" if
// env vars are missing at module-init time. That breaks `next build`'s
// "Collecting page data" pass even for routes that won't actually run
// the query at build time (e.g. edge runtime / dynamic). We lazy-init
// on first property access via a Proxy and fall back to harmless
// placeholders during build when env is absent — runtime will still
// surface a real error if it ever tries to query without env, which is
// what we want.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const anon =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "placeholder-anon-key-for-build-time-only";

let _client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(url, anon);
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = getClient();
    const v = c[prop as keyof SupabaseClient];
    return typeof v === "function" ? v.bind(c) : v;
  },
}) as SupabaseClient;
