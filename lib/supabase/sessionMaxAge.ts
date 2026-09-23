// Shared session-cookie lifetime for every place that writes Supabase auth
// cookies on the server (proxy.ts and lib/supabase/server.ts).
//
// Why an override at all: @supabase/ssr's own default is ~400 days
// (node_modules/@supabase/ssr/dist/main/utils/constants.js), so the SDK is
// not the reason people were signed out. We used to override it to 7 days,
// which turned the cookie into a 7-day inactivity timeout: anyone who did
// not open Wynla for a week had to sign in again. Ski trips are weekend
// affairs with weeks between them, so the cookie has to outlive that gap.
// 90 days covers a whole season while still bounding a session on a lost
// device; the access token itself keeps rotating every hour underneath.
//
// Safari ITP caps script-written cookies at 7 days but honours HTTP
// Set-Cookie from the server, which is why the server-side writes matter
// and why this constant lives here rather than in the browser client.

import type { CookieOptions } from "@supabase/ssr";

export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

// Apply the 90-day lifetime to a cookie the SDK is writing, unless the SDK
// is deleting it. @supabase/ssr removes cookies by writing an empty value
// with maxAge 0 (cookies.js); blindly extending those would leave empty
// auth cookies alive for 90 days after sign-out or a failed refresh.
export function withSessionMaxAge(
  value: string,
  options: CookieOptions,
): CookieOptions {
  const isDeletion =
    value === "" ||
    options.maxAge === 0 ||
    (options.expires instanceof Date && options.expires.getTime() <= Date.now());
  if (isDeletion) return options;
  return { ...options, maxAge: SESSION_MAX_AGE_SECONDS };
}
