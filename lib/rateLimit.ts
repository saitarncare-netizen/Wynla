// Lightweight, infra-free abuse guards for public POST endpoints
// (/api/early, /api/feedback). Two layers:
//
//   1. sameOriginOk — reject cross-site scripted submits. The browser
//      always sends Origin/Referer on a fetch POST, so a form posted from
//      our own pages passes; a script POSTing from another origin (or with
//      a forged foreign Origin) is rejected. Absent header → allowed
//      (some privacy tools strip it; we don't want to break real users).
//
//   2. checkRateLimit — a per-instance in-memory sliding window. This is
//      BEST-EFFORT: serverless instances each have their own memory, so it
//      catches double-clicks, a single hammering connection, and casual
//      abuse, but not a distributed flood. A KV/Upstash-backed limiter is
//      the robust upgrade when we need it; this adds a real layer at zero
//      infra + zero stored-PII cost in the meantime.

const HITS = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  opts: { windowMs: number; max: number },
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const recent = (HITS.get(key) ?? []).filter((t) => t > cutoff);
  if (recent.length >= opts.max) {
    const oldest = recent[0];
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000)),
    };
  }
  recent.push(now);
  HITS.set(key, recent);
  // Opportunistic prune so the map can't grow without bound on a warm instance.
  if (HITS.size > 5000) {
    for (const [k, v] of HITS) {
      const live = v.filter((t) => t > cutoff);
      if (live.length === 0) HITS.delete(k);
      else HITS.set(k, live);
    }
  }
  return { ok: true, retryAfterSec: 0 };
}

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export function sameOriginOk(req: Request): boolean {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const source = origin || referer;
  if (!source) return true; // header stripped — don't punish real users
  let host: string;
  try {
    host = new URL(source).host.toLowerCase();
  } catch {
    return false;
  }
  let siteHost = "wynla.app";
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      siteHost = new URL(process.env.NEXT_PUBLIC_SITE_URL).host.toLowerCase();
    }
  } catch {
    /* fall back to wynla.app */
  }
  return (
    host === siteHost ||
    host === "wynla.app" ||
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host.startsWith("127.0.0.1") ||
    // *.vercel.app is a shared multi-tenant domain, so trusting it outright
    // would let anyone deploy evil-xyz.vercel.app and forge a valid Origin.
    // Only honor it on our OWN preview deploys (VERCEL_ENV=preview); in
    // production this branch is off, so foreign vercel.app origins are rejected.
    (process.env.VERCEL_ENV === "preview" && host.endsWith(".vercel.app"))
  );
}
