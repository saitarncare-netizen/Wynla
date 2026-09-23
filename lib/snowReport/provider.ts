// Pluggable resort snow-report feed.
//
// Wynla has no licensed feed yet (SnoCountry and Mountain News quotes
// are pending). Until one is signed, resorts carry
// snow_report_status = 'no_feed' and their snow numbers come from the
// measured layer (NOHRSC / SNOTEL). Once a key exists, the provider
// returns normalized reports and the season-status job writes them
// with status 'reported'.
//
// To plug another feed: implement SnowReportProvider, register it in
// getConfiguredProvider() and set its env var. The job never imports a
// concrete provider directly.

export type ReportStatus = "open" | "closed" | "off-season" | "unknown";

export type NormalizedReport = {
  /** Wynla resorts.id this report was matched to. */
  resortId: number;
  baseDepthIn: number | null;
  new24In: number | null;
  new48In: number | null;
  liftsOpen: number | null;
  liftsTotal: number | null;
  trailsOpen: number | null;
  trailsTotal: number | null;
  /** Resort-reported surface, e.g. "Packed Powder" (free text from the feed). */
  surface: string | null;
  status: ReportStatus;
  /** ISO-8601 UTC of the resort's own report time, null when unknown. */
  reportedAt: string | null;
  /** Provider name + provider-side id, for provenance ("snocountry:802002"). */
  source: string;
};

export type ProviderResortRef = {
  id: number;
  slug: string;
  name: string;
  state: string | null;
};

export interface SnowReportProvider {
  readonly name: string;
  /** True when the credentials needed to call the feed are present. */
  isConfigured(): boolean;
  /** Reports for as many of the given resorts as the feed covers. */
  getReports(resorts: ProviderResortRef[]): Promise<NormalizedReport[]>;
}

/** Strip decoration so "Killington Resort" matches "Killington". Shared
 *  by providers that must match by name because no id mapping exists. */
export function normalizeResortName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’`.]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(mountain resort|ski resort|ski area|ski and snowboard resort|snow resort|resort|mountain|mtn|ski hill|ski)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Parse feed numerics that arrive as "", "12", "13-15" or 12. Ranges
 *  take the upper bound (what the resort is claiming at most). */
export function parseFeedNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const range = /^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/.exec(s);
  if (range) return Math.max(Number(range[1]), Number(range[2]));
  const digits = s.replace(/[^0-9.\-]/g, "");
  if (!/\d/.test(digits)) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}
