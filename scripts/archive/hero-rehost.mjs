// Re-host the 112 vetted hero photos OFF Wikimedia → Supabase Storage, so the
// live site no longer hotlinks Wikimedia (which 429s under load → broken
// heroes). Uploads the already-downloaded local thumbs to a public bucket and
// repoints hero_image_url at the Supabase public URL. Idempotent (upsert).
import { readFileSync, existsSync } from "node:fs";

const env = (k) => (readFileSync("./.env.local", "utf8").match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const URL = env("NEXT_PUBLIC_SUPABASE_URL");
const KEY = env("SUPABASE_SERVICE_ROLE_KEY");
const BUCKET = "resort-heroes";
const chosen = JSON.parse(readFileSync("./.tmp-hero-candidates/chosen.json", "utf8"));
const auth = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// 1) ensure public bucket exists
async function ensureBucket() {
  const r = await fetch(`${URL}/storage/v1/bucket`, {
    method: "POST", headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg", "image/png", "image/webp"] }),
  });
  if (r.ok) { console.log("bucket created."); return; }
  const t = await r.text();
  if (/exists|Duplicate/i.test(t)) { console.log("bucket already exists."); return; }
  throw new Error(`bucket create failed: ${r.status} ${t}`);
}

async function upload(slug, file) {
  const buf = readFileSync(file);
  const path = `${slug}.jpg`;
  const r = await fetch(`${URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST", headers: { ...auth, "Content-Type": "image/jpeg", "x-upsert": "true", "cache-control": "public, max-age=31536000, immutable" }, body: buf,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return `${URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function patch(slug, url) {
  const r = await fetch(`${URL}/rest/v1/resorts?slug=eq.${encodeURIComponent(slug)}`, {
    method: "PATCH", headers: { ...auth, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ hero_image_url: url, hero_image_source: "supabase" }),
  });
  if (!r.ok) throw new Error(`patch ${r.status} ${await r.text()}`);
}

await ensureBucket();
let ok = 0, fail = 0;
for (const c of chosen) {
  if (!existsSync(c.file)) { fail++; console.error(`  ✗ ${c.slug}: local file missing ${c.file}`); continue; }
  try { const u = await upload(c.slug, c.file); await patch(c.slug, u); ok++; }
  catch (e) { fail++; console.error(`  ✗ ${c.slug}: ${e.message.slice(0, 60)}`); }
}
console.log(`DONE: ${ok} re-hosted, ${fail} failed (of ${chosen.length}).`);
const check = await fetch(`${URL}/rest/v1/resorts?slug=eq.jackson-hole&select=slug,hero_image_url,hero_image_source`, { headers: auth }).then(r => r.json());
console.log("verify:", JSON.stringify(check));
