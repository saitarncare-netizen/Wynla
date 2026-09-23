#!/usr/bin/env node
// Trigger the data-pipeline endpoints by hand, the same way Vercel Cron
// and the GitHub workflow do. Reads CRON_SECRET from the environment or
// from .env.local (never prints it).
//
//   node scripts/pipeline-trigger.mjs refresh-weather [--base=https://wynla.app] [--force] [--limit=25] [--resort=42]
//   node scripts/pipeline-trigger.mjs refresh-snow-conditions --dry-run
//   node scripts/pipeline-trigger.mjs check-snow-alerts
//   node scripts/pipeline-trigger.mjs daily-digest
//   node scripts/pipeline-trigger.mjs health [--notify]
//   node scripts/pipeline-trigger.mjs resort <id-or-slug>
//
// --base defaults to PIPELINE_BASE_URL, then NEXT_PUBLIC_SITE_URL, then
// http://localhost:3000 (run `npm run dev` first for local testing).

import { readFileSync } from "node:fs";

const args = process.argv.slice(2);
const job = args.find((a) => !a.startsWith("--"));
const flag = (name) => args.some((a) => a === `--${name}`);
const opt = (name) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : null;
};

function envFromFile(key) {
  if (process.env[key]) return process.env[key];
  try {
    const text = readFileSync(".env.local", "utf8");
    const m = new RegExp(`^${key}=(.*)$`, "m").exec(text);
    return m ? m[1].trim().replace(/^"|"$/g, "") : "";
  } catch {
    return "";
  }
}

const base = (opt("base") || envFromFile("PIPELINE_BASE_URL") || envFromFile("NEXT_PUBLIC_SITE_URL") || "http://localhost:3000").replace(/\/$/, "");
const secret = envFromFile("CRON_SECRET");

const JOBS = {
  "refresh-weather": () => {
    const p = new URLSearchParams();
    if (flag("force")) p.set("force", "1");
    if (opt("limit")) p.set("limit", opt("limit"));
    if (opt("resort")) p.set("resort", opt("resort"));
    return { path: `/api/cron/refresh-weather${p.size ? `?${p}` : ""}`, auth: true, timeoutMs: 330_000 };
  },
  "refresh-snow-conditions": () => ({
    path: `/api/cron/refresh-snow-conditions${flag("dry-run") ? "?dryRun=1" : ""}`,
    auth: true,
    timeoutMs: 150_000,
  }),
  "check-snow-alerts": () => ({ path: "/api/cron/check-snow-alerts", auth: true, timeoutMs: 330_000 }),
  "daily-digest": () => ({ path: "/api/cron/daily-digest", auth: true, timeoutMs: 330_000 }),
  "thursday-picks": () => ({
    path: `/api/cron/thursday-picks${flag("force") ? "?force=1" : ""}`,
    auth: true,
    timeoutMs: 330_000,
  }),
  health: () => ({ path: `/api/health${flag("notify") ? "?notify=1" : ""}`, auth: false, timeoutMs: 60_000 }),
  resort: () => {
    const id = args.filter((a) => !a.startsWith("--"))[1];
    if (!id) throw new Error("usage: resort <id-or-slug>");
    return { path: `/api/refresh/resort/${encodeURIComponent(id)}`, auth: false, timeoutMs: 90_000 };
  },
};

if (!job || !JOBS[job]) {
  console.error(`usage: node scripts/pipeline-trigger.mjs <${Object.keys(JOBS).join("|")}> [options]`);
  process.exit(2);
}
const spec = JOBS[job]();
if (spec.auth && !secret) {
  console.error("CRON_SECRET is not set (environment or .env.local)");
  process.exit(2);
}

const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), spec.timeoutMs);
const started = Date.now();
try {
  const res = await fetch(base + spec.path, {
    headers: spec.auth ? { Authorization: `Bearer ${secret}` } : {},
    signal: ac.signal,
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 2000);
  }
  console.log(`${res.status} ${base}${spec.path} (${Math.round((Date.now() - started) / 1000)} s)`);
  console.log(JSON.stringify(body, null, 1));
  process.exit(res.ok ? 0 : 1);
} catch (e) {
  console.error(`request failed: ${String(e?.message ?? e)}`);
  process.exit(1);
} finally {
  clearTimeout(timer);
}
