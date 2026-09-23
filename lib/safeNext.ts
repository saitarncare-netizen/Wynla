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

// The `emailRedirectTo` we hand to signInWithOtp. The email template pastes
// it verbatim (GoTrue passes `RedirectTo` to the template unescaped) as the
// LAST query param of the /auth/confirm link, so the value is percent-decoded
// once by the confirm route's URL parse before nextFromRedirectTo parses it
// again. A single-encoded `next` such as `/?plan=1&resort=vail` would have
// its `&` decoded by that first pass and split the inner query, leaving only
// `/?plan=1`. Encoding `next` twice survives both passes.
export function emailLinkRedirectTo(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(encodeURIComponent(next))}`;
}

// Supabase email templates only know `{{ .RedirectTo }}` (the emailRedirectTo
// we passed to signInWithOtp), which is a full URL of our own auth route with
// the real destination inside its `next` query param. Unwrap that so the
// confirm route can land people where they started. The caller passes the
// value as its URL parser decoded it, so exactly one more decode (the
// searchParams read below) undoes emailLinkRedirectTo's double encoding.
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
