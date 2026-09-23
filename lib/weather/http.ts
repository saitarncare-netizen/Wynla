// Shared HTTP plumbing for every external weather/snow source.
//
// Every outbound call in the pipeline goes through here so that:
//   - it always carries an AbortController timeout (a hung NWS socket
//     used to be able to burn the whole 300 s cron budget),
//   - it identifies us properly (NWS requires a User-Agent with contact
//     info and will 403 anonymous clients),
//   - transient upstream failures (5xx / network / timeout) get exactly
//     one retry with a short backoff, which is what api.weather.gov's
//     own guidance recommends ("retry after ~5 s").

export const DEFAULT_TIMEOUT_MS = 20_000;

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
    super(`HTTP ${status} for ${url}${body ? `: ${body.slice(0, 120)}` : ""}`);
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

function isRetryable(e: unknown): boolean {
  if (e instanceof HttpError) return e.status >= 500 || e.status === 429;
  // AbortError (timeout), ECONNRESET, DNS hiccups and friends.
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
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
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
      if (attempt + 1 < attempts && isRetryable(e)) {
        await sleep(1_500);
        continue;
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
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

/** Short, log-safe error string. */
export function errorText(e: unknown, max = 160): string {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.replace(/\s+/g, " ").slice(0, max);
}
