// Opt-in LIVE integration test: runs the full per-resort refresh against
// the real NWS / Open-Meteo / NOHRSC / AWDB endpoints for three resorts
// (Northeast, West with SNOTEL, Alaska) and prints the outcome. Writes
// nothing to the database (it only reads resort rows with the anon key).
//
//   PIPELINE_LIVE=1 npx vitest run lib/weather/live.test.ts
//
// Skipped in CI and in `npm test` unless PIPELINE_LIVE is set, because it
// needs network access and takes ~20-40 s.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findLatestSfav2, Sfav2Sampler } from "./nohrsc";
import { refreshResort, RESORT_COLUMNS, type ResortRow } from "./refreshResort";
import { StationDirectory } from "./stations";

const LIVE = process.env.PIPELINE_LIVE === "1";

function loadEnv(): { url: string; anon: string } | null {
  try {
    const text = readFileSync(".env.local", "utf8");
    const get = (k: string) => {
      const m = new RegExp(`^${k}=(.*)$`, "m").exec(text);
      return m ? m[1].trim().replace(/^"|"$/g, "") : "";
    };
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || get("NEXT_PUBLIC_SUPABASE_URL");
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return url && anon ? { url, anon } : null;
  } catch {
    return null;
  }
}

describe.skipIf(!LIVE)("live refreshResort (network)", () => {
  it(
    "refreshes a Northeast, a Western and an Alaskan resort end to end",
    async () => {
      const env = loadEnv();
      expect(env, "NEXT_PUBLIC_SUPABASE_URL / ANON key needed").not.toBeNull();
      const res = await fetch(
        `${env!.url}/rest/v1/resorts?select=${encodeURIComponent(RESORT_COLUMNS)}&active=eq.true&slug=in.(stowe-mountain-resort,alta-ski-area,alyeska-resort,stowe,alta,alyeska)`,
        { headers: { apikey: env!.anon, Authorization: `Bearer ${env!.anon}` } },
      );
      const resorts = (await res.json()) as ResortRow[];
      expect(resorts.length).toBeGreaterThan(0);
      const now = new Date();
      const file = await findLatestSfav2(now);
      const ctx = { now, directory: new StationDirectory(), sfav2: file ? new Sfav2Sampler(file) : null, allowMeasured: true };
      for (const r of resorts) {
        const out = await refreshResort(r, undefined, ctx);
        const summary = out.ok
          ? {
              slug: r.slug,
              source: out.cacheRow.fetch_source,
              days: out.cacheRow.forecast_json.days.length,
              hourly: out.cacheRow.forecast_json.hourly.length,
              today: out.cacheRow.forecast_json.days[0],
              stations: out.cacheRow.forecast_json.stations,
              obs: out.cacheRow.forecast_json.obs.primary,
              measured: out.cacheRow.forecast_json.measured,
              history: out.historyRow,
              conditions_long: out.cacheRow.conditions_long,
              warnings: out.warnings,
            }
          : out;
        console.log(JSON.stringify(summary, null, 1));
        expect(out.ok, `${r.slug}: ${out.ok ? "" : out.error}`).toBe(true);
        if (out.ok) {
          expect(out.cacheRow.forecast_json.v).toBe(2);
          expect(out.cacheRow.forecast_json.days.length).toBeGreaterThanOrEqual(7);
          expect(out.cacheRow.temp_high_f).not.toBeNull();
        }
      }
    },
    120_000,
  );
});
