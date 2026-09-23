// Shared plumbing for the resort photo pipeline (scripts/photos/*).
//
// Why a shared module: the three scripts talk to the same Supabase project,
// the same public APIs and the same report folder, and each one has to be
// polite (1 request/s per host), resumable and quiet about secrets. Keeping
// that in one place means a rate-limit or auth fix lands everywhere.
//
// Secrets: .env.local is read into process.env and NEVER printed. Callers
// must not log the values either; use `redact()` if a URL that may embed a
// key has to be logged.

import { readFileSync, existsSync, mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execSync } from "node:child_process";

export const USER_AGENT = "Wynla/1.0 (https://wynla.app; saitarncare@gmail.com) resort-photo-pipeline";

export const REPORTS_DIR = resolve("scripts/photos/reports");

/**
 * Load .env.local into process.env. The pipeline runs from a git worktree
 * whose checkout has no .env.local (it is git-ignored), so fall back to the
 * main worktree's copy, found through the shared git common dir. Values are
 * assigned, never returned or logged.
 */
export function loadEnv() {
  const candidates = [resolve(".env.local")];
  try {
    const common = execSync("git rev-parse --path-format=absolute --git-common-dir", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (common) candidates.push(join(dirname(common), ".env.local"));
  } catch {
    // Not a git checkout; the cwd candidate is the only one.
  }
  const file = candidates.find((p) => existsSync(p));
  if (!file) throw new Error("No .env.local found (looked in cwd and the main worktree)");
  const text = readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] != null) continue;
    process.env[key] = m[2].replace(/^["']|["']$/g, "");
  }
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing from .env.local");
  return {
    supabaseUrl: url,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  };
}

/** Strip anything that looks like a JWT or apikey from a string before logging. */
export function redact(s) {
  return String(s)
    .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[redacted-jwt]")
    .replace(/(apikey|api_key|key)=([^&\s]+)/gi, "$1=[redacted]");
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Per-host politeness gate: at most one request per `intervalMs` to each
 * hostname, no matter how many callers are in flight. Wikimedia's API
 * etiquette asks for serial requests from bots; AWS S3 does not care, but a
 * single gate keeps the code path identical.
 */
const hostGates = new Map();
export async function politeWait(hostname, intervalMs = 1000) {
  const now = Date.now();
  const nextAllowed = hostGates.get(hostname) ?? 0;
  const at = Math.max(now, nextAllowed);
  hostGates.set(hostname, at + intervalMs);
  if (at > now) await sleep(at - now);
}

/**
 * fetch with a hard timeout, per-host politeness, retry on 429/5xx and
 * network errors. Returns the Response or throws after `retries` attempts.
 */
export async function politeFetch(url, { headers = {}, timeoutMs = 25000, retries = 4, intervalMs = 1000, method = "GET", body } = {}) {
  const host = new URL(url).hostname;
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    await politeWait(host, intervalMs);
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(url, { method, body, headers: { "User-Agent": USER_AGENT, ...headers }, signal: ac.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status} from ${host}`);
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        await sleep(Math.max(retryAfter * 1000, 2000 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e) {
      clearTimeout(timer);
      lastErr = e;
      await sleep(1500 * (attempt + 1));
    }
  }
  throw lastErr ?? new Error(`fetch failed: ${redact(url)}`);
}

export async function fetchJson(url, opts = {}) {
  const res = await politeFetch(url, { ...opts, headers: { Accept: "application/json", ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${redact(url).slice(0, 160)}`);
  return res.json();
}

/**
 * Read-only PostgREST query with the anon key. `query` is the part after
 * `/rest/v1/resorts?`. Pages through results so the 1000-row default cap
 * never silently truncates the resort list.
 */
export async function restSelect(env, table, query, { pageSize = 1000 } = {}) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const res = await politeFetch(`${env.supabaseUrl}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${env.anonKey}`,
        Range: `${from}-${from + pageSize - 1}`,
        Prefer: "count=exact",
      },
      intervalMs: 200,
    });
    if (!res.ok) throw new Error(`PostgREST ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

/** Active resorts with the columns the photo pipeline needs. */
export async function loadActiveResorts(env) {
  const cols = [
    "slug", "name", "state", "latitude", "longitude", "tier",
    "hero_image_url", "hero_image_source", "hero_image_verified_winter", "hero_image_attribution", "hero_image_credit", "hero_image_alt",
    "base_elevation_ft", "summit_elevation_ft", "vertical_drop",
  ].join(",");
  return restSelect(env, "resorts", `select=${cols}&active=eq.true&order=slug.asc`);
}

/**
 * Supabase Storage helpers (service-role key). Bucket creation is
 * idempotent; upload uses x-upsert so re-runs replace the object.
 */
export function storageHeaders(env) {
  if (!env.serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing; storage writes need it");
  return { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}` };
}

export async function ensurePublicBucket(env, bucket, { allowedMime = ["image/webp", "image/jpeg", "image/png"], fileSizeLimit = 5 * 1024 * 1024 } = {}) {
  const res = await politeFetch(`${env.supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...storageHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: fileSizeLimit, allowed_mime_types: allowedMime }),
    intervalMs: 100,
    retries: 2,
  });
  if (res.ok) return "created";
  const text = await res.text();
  if (/already exists|Duplicate/i.test(text)) return "exists";
  throw new Error(`bucket create failed: ${res.status} ${redact(text).slice(0, 200)}`);
}

export async function uploadObject(env, bucket, path, buffer, contentType, { cacheControl = "31536000" } = {}) {
  const res = await politeFetch(`${env.supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      ...storageHeaders(env),
      "Content-Type": contentType,
      "x-upsert": "true",
      // Supabase stores the number of seconds and serves it as
      // `Cache-Control: max-age=<n>`; the string "public, max-age=..." is
      // rejected on some versions, so send the bare seconds.
      "cache-control": cacheControl,
    },
    body: buffer,
    intervalMs: 100,
    retries: 3,
    timeoutMs: 60000,
  });
  if (!res.ok) throw new Error(`upload ${path} failed: ${res.status} ${redact(await res.text()).slice(0, 200)}`);
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

/** Append-only log + JSON progress file under scripts/photos/reports/. */
export function makeLogger(name) {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const logFile = join(REPORTS_DIR, `${name}-log.txt`);
  const progressFile = join(REPORTS_DIR, `${name}-progress.json`);
  const startedAt = new Date().toISOString();
  return {
    logFile,
    progressFile,
    log(msg) {
      const line = `${new Date().toISOString()} ${redact(msg)}`;
      appendFileSync(logFile, line + "\n");
      process.stdout.write(line + "\n");
    },
    progress(state) {
      writeFileSync(progressFile, JSON.stringify({ startedAt, updatedAt: new Date().toISOString(), ...state }, null, 2));
    },
  };
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

export function readJsonIfExists(path, fallback = null) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

/** Great-circle distance in km. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Parse `--flag value` and `--flag` from argv into an object. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next != null && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

/** Run `fn` over `items` with at most `limit` in flight. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
