// Fix Cache-Control on the re-hosted hero images. hero-rehost.mjs sent
// `cache-control: public, max-age=31536000, immutable` as a raw header, but
// Supabase Storage only accepts the bare `max-age=N` form at upload time —
// everything else silently falls back to `no-cache`, which made browsers
// re-download ~300 KB LCP images on every page view (2026-06-28 sweep).
//
// This script lists the bucket (ground truth), re-downloads each object's own
// bytes from the public URL, re-upserts them with the accepted header form,
// and HEAD-verifies the result. Idempotent; safe to re-run.
import { readFileSync } from "node:fs";

const env = (k) => (readFileSync("./.env.local", "utf8").match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const URL_ = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const BUCKET = "resort-heroes";
const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function listAll() {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const r = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 100, offset }),
    });
    if (!r.ok) throw new Error(`list failed: ${r.status} ${await r.text()}`);
    const page = await r.json();
    out.push(...page);
    if (page.length < 100) break;
  }
  return out.filter((o) => o.name?.endsWith(".jpg"));
}

async function fixOne(name) {
  const pub = `${URL_}/storage/v1/object/public/${BUCKET}/${name}`;
  // Already fixed? Skip without re-uploading.
  const head = await fetch(pub, { method: "HEAD" });
  const cc = head.headers.get("cache-control") ?? "";
  if (/max-age=31536000/.test(cc)) return "already-ok";
  const bytes = await fetch(pub).then((r) => {
    if (!r.ok) throw new Error(`download ${r.status}`);
    return r.arrayBuffer();
  });
  const up = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
      // The ONLY form Supabase Storage persists. It serves it back as
      // `public, max-age=31536000` on the public URL.
      "cache-control": "max-age=31536000",
    },
    body: bytes,
  });
  if (!up.ok) throw new Error(`upload ${up.status} ${await up.text()}`);
  const verify = await fetch(pub, { method: "HEAD" });
  const vcc = verify.headers.get("cache-control") ?? "";
  if (!/max-age=31536000/.test(vcc)) throw new Error(`still wrong: "${vcc}"`);
  return "fixed";
}

const objects = await listAll();
console.log(`${objects.length} hero objects in bucket.`);
let fixed = 0, ok = 0, fail = 0;
for (const o of objects) {
  try {
    const res = await fixOne(o.name);
    if (res === "fixed") fixed++; else ok++;
  } catch (e) {
    fail++;
    console.error(`  ✗ ${o.name}: ${String(e.message).slice(0, 80)}`);
  }
}
console.log(`DONE: ${fixed} fixed, ${ok} already ok, ${fail} failed.`);
