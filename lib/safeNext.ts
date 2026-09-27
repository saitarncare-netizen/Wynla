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

// The `emailRedirectTo` we hand to signInWithOtp. The email template puts
// it as the LAST query param of the /auth/confirm link. Encoding `next`
// twice keeps a destination with its own query (`/?plan=1&resort=vail`)
// intact whether or not the template escapes the value on the way in; see
// nextFromRedirectTo for how the extra layer is peeled off.
export function emailLinkRedirectTo(origin: string, next: string): string {
  return `${origin}/auth/confirm?next=${encodeURIComponent(encodeURIComponent(next))}`;
}

// GoTrue renders templates with Go's html/template, which percent-escapes
// `{{ .RedirectTo }}` inside an href (seen on a real email 2026-09-26:
// `redirect_to=https%3a%2f%2fwynla.app%2fauth%2fconfirm%3fnext%3d%25252F`).
// After the route's own decode and the searchParams read below, `next` is
// then still encoded once ("%2F"), and resolving that as a path sent people
// to /%2F, a 500. Peel at most two leftover layers, only while the value
// does not yet look like a path; safeNext still vets the result.
function unwrapInnerNext(raw: string | null): string | null {
  let value = raw;
  for (let i = 0; i < 2 && value && !value.startsWith("/"); i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      break;
    }
    if (decoded === value) break;
    value = decoded;
  }
  return value;
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
    return safeNext(unwrapInnerNext(url.searchParams.get("next")), origin);
  }
  return safeNext(url.pathname + url.search + url.hash, origin);
}
