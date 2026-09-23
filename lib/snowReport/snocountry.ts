// SnoCountry Conditions feed (feeds.snocountry.net) — the US ski
// industry's not-for-profit snow-report network. JSON over HTTP with an
// apiKey query parameter. Verified 2026-09-23 with the public demo key
// (`SnoCountry.example`, returns up to 3 Vermont resorts):
//
//   GET http://feeds.snocountry.net/getSnowReport.php?apiKey=KEY&states=vt&output=json
//   → { apiVersion: "1.10", totalItems: 3, items: [ { id: "802002",
//        resortName: "Bolton Valley Resort", state: "VT", reportDateTime: "2026-04-12 14:17:06",
//        resortStatus: "8", operatingStatus: "Open for Events/Activities",
//        newSnowMin: "", newSnowMax: "", snowLast48Hours: "", avgBaseDepthMin: "",
//        avgBaseDepthMax: "", openDownHillTrails: "", openDownHillLifts: "",
//        maxOpenDownHillTrails: "71", maxOpenDownHillLifts: "6",
//        primarySurfaceCondition: "", ... } ] }
//
// resortStatus codes (from the feed docs): 1 Open, 2 Reopen on certain
// days, 3 No recent info (open, stale), 4 Operating no details, 5 Plan
// to open, 6 Opening soon, 7 Closed, 8 Summer operations.
//
// Rate guidance from the docs: single-state calls are unlimited; region
// calls must be 10-15 min apart. We only make state calls.
//
// No id mapping table exists yet, so resorts are matched by normalized
// name + state. Unmatched feed items are reported in the job summary so
// the mapping can be tightened by hand.

import { fetchJson } from "@/lib/weather/http";
import {
  normalizeResortName,
  parseFeedNumber,
  type NormalizedReport,
  type ProviderResortRef,
  type ReportStatus,
  type SnowReportProvider,
} from "./provider";

const FEED_BASE = "http://feeds.snocountry.net/getSnowReport.php";
export const SNOCOUNTRY_DEMO_KEY = "SnoCountry.example";

export type SnoCountryItem = {
  id?: string;
  resortName?: string;
  state?: string;
  reportDateTime?: string;
  resortStatus?: string | number;
  operatingStatus?: string;
  primarySurfaceCondition?: string;
  newSnowMin?: string | number;
  newSnowMax?: string | number;
  snowLast48Hours?: string | number;
  avgBaseDepthMin?: string | number;
  avgBaseDepthMax?: string | number;
  openDownHillTrails?: string | number;
  openDownHillLifts?: string | number;
  maxOpenDownHillTrails?: string | number;
  maxOpenDownHillLifts?: string | number;
};

export type SnoCountryResponse = { totalItems?: number; items?: SnoCountryItem[] };

export function statusFromCode(code: string | number | undefined): ReportStatus {
  const n = Number(code);
  switch (n) {
    case 1:
    case 2:
    case 3:
      return "open";
    case 5:
    case 6:
      return "off-season";
    case 7:
    case 8:
      return "closed";
    default:
      return "unknown";
  }
}

/** "2026-04-12 14:17:06" (US Eastern, the feed's own clock) → ISO UTC.
 *  The feed does not state a zone; SnoCountry is in New Hampshire and
 *  its timestamps track Eastern time, so we apply the Eastern offset. */
export function parseReportTime(v: string | undefined, now: Date = new Date()): string | null {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]));
  // Eastern is UTC-4 in daylight time, UTC-5 otherwise; use the offset in
  // force at the report's own date via Intl so DST is handled properly.
  const probe = new Date(naive);
  const offsetMin = easternOffsetMinutes(probe);
  const t = naive + offsetMin * 60_000;
  // Reports cannot come from the future; clamp any clock skew to now.
  return new Date(Math.min(t, now.getTime() + 60_000)).toISOString();
}

function easternOffsetMinutes(d: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      timeZoneName: "shortOffset",
    }).formatToParts(d);
    const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT-5";
    const m = /GMT([+-]\d{1,2})/.exec(tz);
    return m ? -Number(m[1]) * 60 : 300;
  } catch {
    return 300;
  }
}

/** Feed item → normalized report for a matched resort id. Exported for tests. */
export function normalizeItem(item: SnoCountryItem, resortId: number, now: Date = new Date()): NormalizedReport {
  const baseMin = parseFeedNumber(item.avgBaseDepthMin);
  const baseMax = parseFeedNumber(item.avgBaseDepthMax);
  const base =
    baseMin !== null && baseMax !== null ? Math.round((baseMin + baseMax) / 2) : (baseMax ?? baseMin);
  const new24 = parseFeedNumber(item.newSnowMax) ?? parseFeedNumber(item.newSnowMin);
  return {
    resortId,
    baseDepthIn: base,
    new24In: new24,
    new48In: parseFeedNumber(item.snowLast48Hours),
    liftsOpen: parseFeedNumber(item.openDownHillLifts),
    liftsTotal: parseFeedNumber(item.maxOpenDownHillLifts),
    trailsOpen: parseFeedNumber(item.openDownHillTrails),
    trailsTotal: parseFeedNumber(item.maxOpenDownHillTrails),
    surface: item.primarySurfaceCondition?.trim() || null,
    status: statusFromCode(item.resortStatus),
    reportedAt: parseReportTime(item.reportDateTime, now),
    source: `snocountry:${item.id ?? "?"}`,
  };
}

/** Match feed items to Wynla resorts by state + normalized name. Exact
 *  normalized match first, then a unique prefix match either way. */
export function matchItems(
  items: SnoCountryItem[],
  resorts: ProviderResortRef[],
): { matched: Array<{ item: SnoCountryItem; resort: ProviderResortRef }>; unmatched: string[] } {
  const byState = new Map<string, ProviderResortRef[]>();
  for (const r of resorts) {
    const st = (r.state ?? "").toUpperCase();
    const arr = byState.get(st) ?? [];
    arr.push(r);
    byState.set(st, arr);
  }
  const used = new Set<number>();
  const matched: Array<{ item: SnoCountryItem; resort: ProviderResortRef }> = [];
  const unmatched: string[] = [];
  for (const item of items) {
    const name = item.resortName ? normalizeResortName(item.resortName) : "";
    const pool = (byState.get((item.state ?? "").toUpperCase()) ?? []).filter((r) => !used.has(r.id));
    if (!name || pool.length === 0) {
      unmatched.push(`${item.resortName ?? "?"} (${item.state ?? "?"})`);
      continue;
    }
    let hit = pool.find((r) => normalizeResortName(r.name) === name);
    if (!hit) {
      const prefix = pool.filter((r) => {
        const n = normalizeResortName(r.name);
        return n.length >= 4 && name.length >= 4 && (n.startsWith(name) || name.startsWith(n));
      });
      if (prefix.length === 1) hit = prefix[0];
    }
    if (hit) {
      used.add(hit.id);
      matched.push({ item, resort: hit });
    } else {
      unmatched.push(`${item.resortName ?? "?"} (${item.state ?? "?"})`);
    }
  }
  return { matched, unmatched };
}

export class SnoCountryProvider implements SnowReportProvider {
  readonly name = "snocountry";
  private readonly key: string | null;
  /** Filled by getReports() so the job can log what the feed listed but we could not place. */
  lastUnmatched: string[] = [];

  constructor(apiKey?: string | null) {
    this.key = (apiKey ?? process.env.SNOCOUNTRY_API_KEY ?? "").trim() || null;
  }

  isConfigured(): boolean {
    return this.key !== null;
  }

  isDemoKey(): boolean {
    return this.key === SNOCOUNTRY_DEMO_KEY;
  }

  async fetchState(state: string): Promise<SnoCountryItem[]> {
    if (!this.key) return [];
    const p = new URLSearchParams({ apiKey: this.key, states: state.toLowerCase(), output: "json" });
    const j = await fetchJson<SnoCountryResponse>(`${FEED_BASE}?${p}`, { timeoutMs: 20_000 });
    return j.items ?? [];
  }

  async getReports(resorts: ProviderResortRef[]): Promise<NormalizedReport[]> {
    if (!this.key) return [];
    const states = Array.from(new Set(resorts.map((r) => r.state?.toUpperCase()).filter((s): s is string => !!s)));
    const items: SnoCountryItem[] = [];
    // The demo key answers the same three resorts for any state; one call is enough.
    const targets = this.isDemoKey() ? states.slice(0, 1) : states;
    const CONCURRENCY = 4;
    let i = 0;
    const worker = async () => {
      while (i < targets.length) {
        const st = targets[i++];
        try {
          items.push(...(await this.fetchState(st)));
        } catch (e) {
          console.warn(`[snocountry] state ${st} failed: ${String((e as Error)?.message ?? e).slice(0, 120)}`);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    const { matched, unmatched } = matchItems(items, resorts);
    this.lastUnmatched = unmatched;
    return matched.map(({ item, resort }) => normalizeItem(item, resort.id));
  }
}

/** The provider the job should use, or null when no feed is licensed. */
export function getConfiguredProvider(overrideKey?: string | null): SnowReportProvider | null {
  const p = new SnoCountryProvider(overrideKey);
  return p.isConfigured() ? p : null;
}
