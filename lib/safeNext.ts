// Open-redirect guard for the `next` parameter that flows through /login,
// /auth/callback and /auth/confirm.
//
// A naive check like `starts with "/" and not "//"` is not enough: browsers
// parse `/\evil.com` as `//evil.com`, and encoded or scheme-prefixed values
// slip past prefix tests. Resolving the raw value against our own origin with
// the WHATWG URL parser and then comparing origins uses the same parser the
// browser will use for the Location header, so whatever we accept is by
// construction a same-origin destination.

const AUTH_PATHS = new Set(["/login", "/auth/callback", "/auth/confirm"]);

// Returns a same-origin path (pathname + search + hash) or "/".
export function safeNext(raw: string | null | undefined, origin: string): string {
  if (!raw) return "/";
  let dest: URL;
  try {
    dest = new URL(raw, origin);
  } catch {
    return "/";
  }
  // `javascript:` / `data:` URLs get origin "null"; foreign hosts and scheme
  // swaps (http vs https) get a different origin. Both fall to "/".
  if (dest.origin !== origin) return "/";
  // Never bounce back into the sign-in pages themselves — that would loop.
  if (AUTH_PATHS.has(dest.pathname)) return "/";
  return dest.pathname + dest.search + dest.hash;
}

// Supabase email templates only know `{{ .RedirectTo }}` (the emailRedirectTo
// we passed to signInWithOtp), which is a full URL of our own auth route with
// the real destination inside its `next` query param. Unwrap that so the
// confirm route can land people where they started.
export function nextFromRedirectTo(
  redirectTo: string | null | undefined,
  origin: string,
): string {
  if (!redirectTo) return "/";
  let url: URL;
  try {
    url = new URL(redirectTo, origin);
  } catch {
    return "/";
  }
  if (url.origin !== origin) return "/";
  if (AUTH_PATHS.has(url.pathname)) {
    return safeNext(url.searchParams.get("next"), origin);
  }
  return safeNext(url.pathname + url.search + url.hash, origin);
}
