// Apply the vetted hero photos to the live DB via the Supabase REST API
// (service-role key bypasses RLS). Equivalent of running hero-update.sql, but
// runnable by Claude once SUPABASE_SERVICE_ROLE_KEY is set in .env.local.
//   1) reset hero_image_* = NULL on ALL resorts (clears old un-vetted URLs)
//   2) set the 112 vetted winter heroes from chosen.json
import { readFileSync } from "node:fs";

function envFromLocal(key) {
  const m = readFileSync("./.env.local", "utf8").match(new RegExp("^" + key + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

const URL = envFromLocal("NEXT_PUBLIC_SUPABASE_URL");
const KEY = envFromLocal("SUPABASE_SERVICE_ROLE_KEY");
if (!URL || !KEY) {
  console.error("MISSING: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" };
const chosen = JSON.parse(readFileSync("./.tmp-hero-candidates/chosen.json", "utf8"));

async function patch(filter, body) {
  const r = await fetch(`${URL}/rest/v1/resorts?${filter}`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
}

console.log(`Resetting hero columns on all resorts, then setting ${chosen.length} vetted heroes…`);
await patch("id=gte.0", { hero_image_url: null, hero_image_source: null, hero_image_alt: null, hero_image_attribution: null });
console.log("reset done.");

let ok = 0, fail = 0;
for (const c of chosen) {
  try {
    await patch(`slug=eq.${encodeURIComponent(c.slug)}`, {
      hero_image_url: c.url, hero_image_source: c.source, hero_image_alt: c.alt, hero_image_attribution: c.attribution,
    });
    ok++;
  } catch (e) { fail++; console.error(`  ✗ ${c.slug}: ${e.message}`); }
}
console.log(`DONE: ${ok} heroes set, ${fail} failed (of ${chosen.length}).`);

// verify a couple
const check = await fetch(`${URL}/rest/v1/resorts?slug=in.(alta,jackson-hole)&select=slug,hero_image_url`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }).then(r => r.json());
console.log("verify:", JSON.stringify(check));
