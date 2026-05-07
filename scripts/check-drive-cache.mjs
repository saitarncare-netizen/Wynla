// Read-only audit: check current drive_time_cache coverage so we know how
// many missing routes need to be backfilled in Stage 4.3.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

{
  const text = readFileSync(path.resolve(".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const [{ data: resorts }, { data: cache }] = await Promise.all([
  supabase.from("resorts").select("id").eq("active", true),
  supabase.from("drive_time_cache").select("resort_id, origin_name"),
]);

const totalResorts = resorts?.length ?? 0;
const origins = ["NYC", "Boston", "Philadelphia", "Hartford"];
const need = totalResorts * origins.length;
const have = cache?.length ?? 0;

const byOrigin = {};
for (const o of origins) {
  byOrigin[o] = (cache ?? []).filter((c) => c.origin_name === o).length;
}

const cachedResortIds = new Set((cache ?? []).map((c) => c.resort_id));
const resortsWithoutAnyCache = (resorts ?? []).filter((r) => !cachedResortIds.has(r.id)).length;

console.log(JSON.stringify({
  total_resorts: totalResorts,
  origins: origins.length,
  routes_needed: need,
  routes_cached: have,
  coverage_pct: ((have / need) * 100).toFixed(1) + "%",
  by_origin: byOrigin,
  resorts_with_zero_routes: resortsWithoutAnyCache,
}, null, 2));
