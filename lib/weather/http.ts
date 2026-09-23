// Shared HTTP plumbing for every external weather/snow source.
//
// Every outbound call in the pipeline goes through here so that:
//   - it always carries an AbortController timeout (a hung NWS socket
//     used to be able to burn the whole 300 s cron budget),
//   - it identifies us properly (NWS requires a User-Agent with contact
//     info and will 403 anonymous clients),
//   - transient upstream failures (5xx / network / timeout) get exactly
//     one retry with a short backoff, which is what api.weather.gov's
//     own guidance recommends ("retry after ~5 s"),
//   - a caller can put a whole chain of calls under one deadline
//     (runWithDeadline) so a resort that is still fetching when the cron
//     budget runs out is cancelled instead of being killed by Vercel
//     with its results unwritten,
//   - error messages never carry an API key: SnoCountry and the
//     commercial Open-Meteo host put the key in the query string, and
//     these messages end up in weather_cache.fetch_error, cron_runs and
//     the Vercel log.

import { AsyncLocalStorage } from "node:async_hooks";

export const DEFAULT_TIMEOUT_MS = 20_000;

/** Query parameters that carry credentials; their values are masked in
 *  every error message and log line built from a URL. */
const SECRET_PARAM_RE = /([?&](?:apikey|api_key|key|token|secret)=)[^&#]+/gi;

/** URL with credential-carrying query values masked (for logs and errors). */
export function redactUrl(url: string): string {
  return url.replace(SECRET_PARAM_RE, "$1***");
}

// ---------- deadline propagation ----------

const deadlineStore = new AsyncLocalStorage<AbortSignal>();

/**
 * Run `fn` with `signal` attached to every fetchWithTimeout call made
 * inside it (however deep). When the signal aborts, in-flight requests
 * are cancelled, no retry is attempted and the callers see an
 * AbortError — the cron's worker treats that as "deadline".
 */
export function runWithDeadline<T>(signal: AbortSignal, fn: () => Promise<T>): Promise<T> {
  return deadlineStore.run(signal, fn);
}

/** The deadline signal of the enclosing runWithDeadline, if any. */
export function currentDeadline(): AbortSignal | undefined {
  return deadlineStore.getStore();
}

export function isAbortError(e: unknown): boolean {
  return e instanceof Error && e.name === "AbortError";
}

/** User-Agent sent to every government API. Override the contact via
 *  NWS_CONTACT_EMAIL; the site URL alone already satisfies NWS' rule. */
export function userAgent(): string {
  const contact = process.env.NWS_CONTACT_EMAIL?.trim() || "hello@wynla.app";
  return `Wynla/2.0 (https://wynla.app; ${contact})`;
}

export class HttpError extends Error {
  readonly status: number;
  readonly url: string;
  constructor(status: number, url: string, body?: string) {
    // The message is what gets logged and stored; the raw URL stays on
    // the instance for callers that need to retry it.
    super(`HTTP ${status} for ${redactUrl(url).slice(0, 200)}${body ? `: ${body.slice(0, 120)}` : ""}`);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
  }
}

export type FetchOptions = {
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Retry once on 5xx / network errors (default true). */
  retry?: boolean;
};

function isRetryable(e: unknown, deadline: AbortSignal | undefined): boolean {
  if (deadline?.aborted) return false; // the whole chain is being cancelled
  if (e instanceof HttpError) return e.status >= 500 || e.status === 429;
  // AbortError (per-request timeout), ECONNRESET, DNS hiccups and friends.
  return true;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

/** Fetch with timeout + one retry. Resolves with the raw Response so
 *  callers can pick text / json / arrayBuffer. Non-2xx throws HttpError. */
export async function fetchWithTimeout(
  url: string,
  opts: FetchOptions = {},
): Promise<Response> {
  const attempts = opts.retry === false ? 1 : 2;
  const deadline = currentDeadline();
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (deadline?.aborted) throw abortError();
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    // Link the enclosing deadline to this request's controller so an
    // abort upstream cancels the socket, not just the awaiting promise.
    const onDeadline = () => ac.abort();
    deadline?.addEventListener("abort", onDeadline, { once: true });
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": userAgent(), ...(opts.headers ?? {}) },
        signal: ac.signal,
        // Never let Next's fetch cache serve yesterday's forecast.
        cache: "no-store",
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpError(res.status, url, body);
      }
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt + 1 < attempts && isRetryable(e, deadline)) {
        await sleep(1_500);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timer);
      deadline?.removeEventListener("abort", onDeadline);
    }
  }
  throw lastErr;
}

function abortError(): Error {
  const e = new Error("deadline reached");
  e.name = "AbortError";
  return e;
}

export async function fetchJson<T>(url: string, opts: FetchOptions = {}): Promise<T> {
  const res = await fetchWithTimeout(url, opts);
  return (await res.json()) as T;
}

export async function fetchText(url: string, opts: FetchOptions = {}): Promise<string> {
  const res = await fetchWithTimeout(url, opts);
  return res.text();
}

/** Byte-range read. Returns the bytes even when the server answers 200
 *  (ignores Range) so callers must slice defensively. */
export async function fetchRange(
  url: string,
  from: number,
  to: number,
  opts: FetchOptions = {},
): Promise<Uint8Array> {
  const res = await fetchWithTimeout(url, {
    ...opts,
    headers: { ...(opts.headers ?? {}), Range: `bytes=${from}-${to}` },
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (res.status === 200 && buf.length > to - from + 1) {
    return buf.subarray(from, to + 1);
  }
  return buf;
}

/** Short, log-safe error string (whitespace collapsed, secrets masked). */
export function errorText(e: unknown, max = 160): string {
  const msg = e instanceof Error ? e.message : String(e);
  return redactUrl(msg).replace(/\s+/g, " ").slice(0, max);
}
