// /compare — server-rendered side-by-side comparison of up to
// COMPARE_MAX resorts (Stage 34: 5; Pro tier ceiling).
//
// Driven by the `?ids=12,55,99` query string (populated by the floating
// "Compare X" button on the homepage). The compare list lives in
// localStorage; the page itself is pure-server so any link to it is
// shareable / linkable / SEO-indexable.
//
// Layout pivots at md. Desktop is resort-major (each resort a column,
// each metric a row), the canonical compare table. On a phone, one or
// two resorts are metric-major (one card per metric, values side by
// side); three to five become horizontally scrolling resort cards laid
// out in ONE CSS grid so every row lines up across cards, instead of a
// five-column grid squeezed into 375 px (audit fresh-eyes-power-33).
//
// Conditions rows (status, new snow, surface, drive) come from the same
// verdict() the /today and /favorites pages use, so the three never
// disagree about the same mountain.
import Link from "next/link";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";
import { textOn } from "@/lib/contrast";
import { verdict, type Verdict, type VerdictWeather } from "@/lib/goWaitSkip";
import type { DailyWeather } from "@/lib/snowSurface";
import { shiftDate } from "@/lib/weather/time";
import { TODAY_RESORT_COLS, type TodayResort } from "@/app/today/data";
import {
  decodeStoredOrigin,
  findOrigin,
  hasCachedDriveTimes,
  resolveOriginWithFallback,
  withEstimateMark,
  type Origin,
  type StoredOrigin,
} from "@/lib/origins";
import { ORIGIN_COOKIE } from "@/lib/preferences";
import { estimateDriveSeconds, haversineMeters } from "@/lib/distance";
import { getDifficultyMix, type DifficultyMix } from "@/lib/difficulty";
import { COMPARE_MAX } from "@/lib/compareList";
import { ClearCompareButton, RemoveFromCompare, ShareCompareButton } from "./CompareActions";

export const dynamic = "force-dynamic";

// Title/description name the resorts being compared so a shared link
// reads well in chat previews, but the page is NOINDEX: every ?ids=
// permutation is a distinct URL with near-duplicate content, and the
// compare list is personal state (audit finding content-seo-7).
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<CompareSearchParams>;
}): Promise<Metadata> {
  const ids = parseIds((await searchParams).ids);
  const base: Metadata = {
    robots: { index: false, follow: false },
  };
  if (ids.length === 0) {
    return {
      ...base,
      title: "Compare resorts",
      description: "Pick resorts from the map to compare them side by side.",
    };
  }
  const { data } = await supabase
    .from("resorts")
    .select("id, name")
    .in("id", ids)
    .eq("active", true);
  const byId = new Map((data ?? []).map((r) => [r.id as number, r.name as string]));
  const names = ids.map((id) => byId.get(id)).filter((n): n is string => Boolean(n));
  if (names.length === 0) {
    return { ...base, title: "Compare resorts", description: "Side-by-side resort comparison." };
  }
  const joined = names.join(" vs ");
  return {
    ...base,
    title: `${joined} — compare`,
    description: `Vertical, acres, lifts, snowfall, terrain mix and drive times for ${joined}, side by side.`,
    openGraph: {
      title: `${joined} — compare · Wynla`,
      description: `Vertical, acres, lifts, snowfall, terrain mix and drive times for ${joined}, side by side.`,
      images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
    },
  };
}

// Matches the columns we read from `resorts` below: the verdict's set
// (TODAY_RESORT_COLS) plus the stat rows. Supabase returns nulls for
// any unset field; the rows below render those as em-dashes.
type CompareResort = TodayResort & {
  total_acres: number | null;
  total_lifts: number | null;
  high_speed_lifts: number | null;
  base_elevation_ft: number | null;
  summit_elevation_ft: number | null;
  elevation_base: number | null;
  elevation_summit: number | null;
  annual_snowfall_in: number | null;
  snowmaking_pct: number | null;
  has_terrain_park: boolean | null;
  has_night_skiing: boolean | null;
  has_glades: boolean | null;
  has_halfpipe: boolean | null;
  difficulty_pct_beginner: number | null;
  difficulty_pct_intermediate: number | null;
  difficulty_pct_advanced: number | null;
  difficulty_pct_expert: number | null;
  trails_beginner: number | null;
  trails_intermediate: number | null;
  trails_advanced: number | null;
  trails_expert: number | null;
};

type DriveTimeRow = {
  resort_id: number;
  origin_name: string;
  duration_seconds: number | null;
};

// Stat columns not already in TODAY_RESORT_COLS.
const STAT_COLS = [
  "total_acres",
  "high_speed_lifts",
  "base_elevation_ft",
  "summit_elevation_ft",
  "elevation_base",
  "elevation_summit",
  "annual_snowfall_in",
  "snowmaking_pct",
  "has_terrain_park",
  "has_night_skiing",
  "has_glades",
  "has_halfpipe",
  "difficulty_pct_beginner",
  "difficulty_pct_intermediate",
  "difficulty_pct_advanced",
  "difficulty_pct_expert",
  "trails_beginner",
  "trails_intermediate",
  "trails_advanced",
  "trails_expert",
];
const COMPARE_COLS = Array.from(
  new Set([...TODAY_RESORT_COLS.split(",").map((c) => c.trim()), ...STAT_COLS]),
).join(", ");

type WeatherRow = VerdictWeather & { resort_id: number };
type HistoryRow = {
  resort_id: number;
  observed_date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | string | null;
  rain_24h_in: number | string | null;
  precip_24h_in: number | string | null;
  wind_mph_avg: number | string | null;
};

const num = (v: number | string | null | undefined): number | null => {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
};

/** Today's verdict for each resort, from the same inputs /today reads:
 *  the weather_cache row and the trailing week of weather_history. */
async function loadVerdicts(resorts: CompareResort[], now: Date): Promise<Map<number, Verdict>> {
  const ids = resorts.map((r) => r.id);
  const since = shiftDate(now.toISOString().slice(0, 10), -8);
  const [wxRes, histRes] = await Promise.all([
    supabase
      .from("weather_cache")
      .select("resort_id, temp_high_f, temp_low_f, conditions_short, snow_24h_in, wind_mph_avg, wind_mph_gust, fetched_at, forecast_json")
      .in("resort_id", ids)
      .returns<WeatherRow[]>(),
    supabase
      .from("weather_history")
      .select("resort_id, observed_date, temp_high_f, temp_low_f, snow_24h_in, rain_24h_in, precip_24h_in, wind_mph_avg")
      .in("resort_id", ids)
      .gte("observed_date", since)
      .order("observed_date", { ascending: true })
      .returns<HistoryRow[]>(),
  ]);
  if (wxRes.error) console.warn("[compare] weather_cache read failed", wxRes.error.message);
  if (histRes.error) console.warn("[compare] weather_history read failed", histRes.error.message);
  const weatherById = new Map<number, WeatherRow>();
  for (const w of wxRes.data ?? []) weatherById.set(w.resort_id, w);
  const historyById = new Map<number, DailyWeather[]>();
  for (const h of histRes.data ?? []) {
    const list = historyById.get(h.resort_id) ?? [];
    list.push({
      observed_date: h.observed_date,
      temp_high_f: h.temp_high_f,
      temp_low_f: h.temp_low_f,
      snow_24h_in: num(h.snow_24h_in),
      rain_24h_in: num(h.rain_24h_in),
      precip_24h_in: num(h.precip_24h_in),
      wind_mph_avg: num(h.wind_mph_avg),
    });
    historyById.set(h.resort_id, list);
  }
  const out = new Map<number, Verdict>();
  for (const r of resorts) {
    out.set(r.id, verdict(r, weatherById.get(r.id) ?? null, null, { now, history: historyById.get(r.id) ?? [] }));
  }
  return out;
}

/** "2 h ago" for a labelled value's timestamp; the page is dynamic so
 *  the clock is the request's. */
function ago(iso: string | null, now: Date): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((now.getTime() - t) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

function inchesText(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} in`;
}

/** Share link that pins the drive origin, so the recipient sees the
 *  same drive column instead of their own cookie's. */
function sharePath(ids: number[], origin: Origin): string {
  const p = new URLSearchParams();
  p.set("ids", ids.join(","));
  if (origin.kind === "geo") {
    p.set("from", "geo");
    p.set("fromLat", origin.lat.toFixed(2));
    p.set("fromLng", origin.lon.toFixed(2));
  } else {
    p.set("from", origin.code);
  }
  return `/compare?${p.toString()}`;
}

function parseIds(raw: string | string[] | undefined): number[] {
  if (!raw) return [];
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (!str) return [];
  const out: number[] = [];
  for (const part of str.split(",")) {
    const n = Number(part.trim());
    if (Number.isFinite(n) && Number.isInteger(n) && n > 0) out.push(n);
  }
  // Dedup and cap at COMPARE_MAX — single source of truth lives in
  // lib/compareList.ts; importing keeps server + client in sync so a
  // bump there can't leave this server route capping at the old value.
  const seen = new Set<number>();
  const deduped: number[] = [];
  for (const n of out) {
    if (seen.has(n)) continue;
    seen.add(n);
    deduped.push(n);
    if (deduped.length >= COMPARE_MAX) break;
  }
  return deduped;
}

type CompareSearchParams = {
  ids?: string | string[];
  from?: string | string[];
  fromLat?: string | string[];
  fromLng?: string | string[];
};

function firstParam(v: string | string[] | undefined): string | null {
  if (v == null) return null;
  const s = Array.isArray(v) ? v[0] : v;
  return s ? s : null;
}

// The origin the drive-time row is measured from. Same precedence as
// the map: URL ?from= (share links), then the origin cookie the map
// writes when the user picks a city or "here", then the account's
// default starting city, then NYC. The page used to hard-code an
// origin_name ("New York City, NY") that never existed in
// drive_time_cache, so the column was always "—" (audit performance-9
// / fresh-eyes-newbie-39 / account-social-13).
async function resolveCompareOrigin(sp: CompareSearchParams): Promise<Origin> {
  let stored: StoredOrigin | null = null;
  try {
    stored = decodeStoredOrigin((await cookies()).get(ORIGIN_COOKIE)?.value);
  } catch {
    stored = null;
  }
  if (!stored) {
    try {
      const ssr = await createSupabaseServerClient();
      const { data: u } = await ssr.auth.getUser();
      if (u.user?.id) {
        const { data, error } = await ssr
          .from("profiles")
          .select("preferred_origin")
          .eq("id", u.user.id)
          .maybeSingle<{ preferred_origin: string | null }>();
        if (error) {
          console.warn("[compare] profiles.preferred_origin read failed", error.message);
        } else if (data?.preferred_origin && findOrigin(data.preferred_origin)) {
          stored = { kind: "city", code: data.preferred_origin };
        }
      }
    } catch (e) {
      console.warn("[compare] profile lookup failed", e instanceof Error ? e.message : e);
    }
  }
  return resolveOriginWithFallback(
    firstParam(sp.from),
    firstParam(sp.fromLat),
    firstParam(sp.fromLng),
    stored,
  );
}

type DriveCell = { seconds: number | null; estimate: boolean };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<CompareSearchParams>;
}) {
  const sp = await searchParams;
  const ids = parseIds(sp.ids);

  if (ids.length === 0) {
    return (
      <main className="min-h-dvh bg-wn-offwhite px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-4 inline-block text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
          >
            ← Map
          </Link>
          <h1 className="mb-2 text-2xl font-extrabold text-wn-navy sm:text-3xl">
            Compare resorts
          </h1>
          <p className="mb-6 text-sm text-wn-charcoal/70">
            Nothing to compare yet. Open a resort from the map and tap
            <span className="mx-1 rounded bg-wn-navy/5 px-1.5 py-0.5 font-mono text-xs text-wn-navy">
              + Compare
            </span>
            on up to {COMPARE_MAX} resorts to see them side by side.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Browse the map
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </main>
    );
  }

  // Fetch all requested resorts in one round trip.
  const { data: rows } = await supabase
    .from("resorts")
    .select(COMPARE_COLS)
    .in("id", ids)
    .eq("active", true)
    .returns<CompareResort[]>();

  // Preserve URL order — Supabase doesn't guarantee `.in()` ordering.
  const byId = new Map((rows ?? []).map((r) => [r.id, r]));
  const resorts: CompareResort[] = ids
    .map((id) => byId.get(id))
    .filter((r): r is CompareResort => !!r);

  // Drive-time enrichment. Cached cities read drive_time_cache (keyed
  // by origin.name, the same key the map uses); every other origin gets
  // the lib/distance estimate from the resort coordinates, labelled
  // "≈". We don't fail the page if the table is empty.
  const origin = await resolveCompareOrigin(sp);
  const driveByResort = new Map<number, DriveCell>();
  if (hasCachedDriveTimes(origin)) {
    const { data: dtRows, error } = await supabase
      .from("drive_time_cache")
      .select("resort_id, origin_name, duration_seconds")
      .in("resort_id", ids)
      .eq("origin_name", origin.name)
      .returns<DriveTimeRow[]>();
    if (error) console.warn("[compare] drive_time_cache read failed", error.message);
    for (const row of dtRows ?? []) {
      driveByResort.set(row.resort_id, { seconds: row.duration_seconds, estimate: false });
    }
  }
  for (const r of resorts) {
    if (driveByResort.has(r.id)) continue;
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const meters = haversineMeters(origin.lat, origin.lon, lat, lng);
    driveByResort.set(r.id, { seconds: estimateDriveSeconds(meters), estimate: true });
  }
  const driveLabel = `Drive from ${origin.kind === "geo" ? "your location" : origin.short}`;
  const anyEstimate = [...driveByResort.values()].some((c) => c.estimate);

  const now = new Date();
  const verdictById = resorts.length > 0 ? await loadVerdicts(resorts, now) : new Map<number, Verdict>();
  const share = sharePath(resorts.map((r) => r.id), origin);
  const shareTitle = `${resorts.map((r) => r.name).join(" vs ")} on Wynla`;
  const rowsSpec = metricRows(driveLabel, driveByResort, verdictById, now);

  if (resorts.length === 0) {
    return (
      <main className="min-h-dvh bg-wn-offwhite px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/"
            className="mb-4 inline-block text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
          >
            ← Map
          </Link>
          <h1 className="mb-2 text-2xl font-extrabold text-wn-navy">Compare resorts</h1>
          <p className="text-sm text-wn-charcoal/70">
            Those resorts couldn&rsquo;t be found. They may have been removed.
          </p>
        </div>
      </main>
    );
  }

  // iOS safe-area padding for the "← Map" link comes from the #main-content
  // rule in globals.css (shared by every non-map route).
  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-md border border-wn-charcoal/15 bg-white px-3 text-xs font-semibold text-wn-charcoal/70 transition hover:border-wn-navy hover:text-wn-navy"
          >
            ← Map
          </Link>
          {/* Share is the constructive action; Clear all is destructive,
              so it stays muted and sits last, opposite Back. */}
          <div className="flex items-center gap-2">
            <ShareCompareButton path={share} title={shareTitle} />
            <ClearCompareButton />
          </div>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">
            Comparing {resorts.length} resort{resorts.length === 1 ? "" : "s"}
          </h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Today&rsquo;s conditions, then stats, amenities and difficulty mix.
            Tap a resort name for its full page.
          </p>
          <p className="mt-1 text-xs text-wn-charcoal/70">
            {driveLabel}
            {anyEstimate
              ? " · ≈ times are estimated from straight-line distance. Change the origin from the map's From picker."
              : " · cached road routes. Change the origin from the map's From picker."}
          </p>
        </header>

        {/* Desktop: resort-major table */}
        <div className="hidden md:block">
          <DesktopCompareTable resorts={resorts} rows={rowsSpec} />
        </div>

        {/* Phone: metric-major for one or two resorts, scrolling resort
            cards for three or more. */}
        <div className="md:hidden">
          {resorts.length <= 2 ? (
            <MobileCompareList resorts={resorts} rows={rowsSpec} />
          ) : (
            <MobileCompareCards resorts={resorts} rows={rowsSpec} />
          )}
        </div>
      </div>
    </main>
  );
}

// ---------- Metric definitions ----------
//
// Each row is a (label, render) pair so the desktop table and both
// phone layouts share one source of truth; no view can drift on what
// counts as a row. Conditions rows come first because they answer the
// question people actually compare on in season.

type MetricFn = (r: CompareResort) => ReactNode;
type MetricRowSpec = { label: string; render: MetricFn; group: "conditions" | "stats" };

const STAT_METRICS: Array<{ label: string; render: MetricFn }> = [
  { label: "Passes", render: (r) => (r.passes && r.passes.length > 0 ? r.passes.map(passLabel).join(", ") : "—") },
  { label: "State", render: (r) => r.state || "—" },
  { label: "Region", render: (r) => r.region ?? "—" },
  { label: "Vertical drop", render: (r) => (r.vertical_drop != null ? `${r.vertical_drop.toLocaleString()} ft` : "—") },
  { label: "Trails", render: (r) => (r.total_trails != null ? String(r.total_trails) : "—") },
  { label: "Skiable acres", render: (r) => (r.total_acres != null ? r.total_acres.toLocaleString() : "—") },
  {
    label: "Lifts",
    render: (r) => {
      if (r.total_lifts == null) return "—";
      if (r.high_speed_lifts != null && r.high_speed_lifts > 0) {
        return `${r.total_lifts} (${r.high_speed_lifts} high-speed)`;
      }
      return String(r.total_lifts);
    },
  },
  {
    label: "Base elevation",
    render: (r) => {
      const b = r.base_elevation_ft ?? r.elevation_base;
      return b != null ? `${b.toLocaleString()} ft` : "—";
    },
  },
  {
    label: "Summit elevation",
    render: (r) => {
      const s = r.summit_elevation_ft ?? r.elevation_summit;
      return s != null ? `${s.toLocaleString()} ft` : "—";
    },
  },
  { label: "Annual snowfall", render: (r) => (r.annual_snowfall_in != null ? `${r.annual_snowfall_in} in` : "—") },
  { label: "Snowmaking", render: (r) => (r.snowmaking_pct != null ? `${r.snowmaking_pct}%` : "—") },
  { label: "Terrain park", render: (r) => boolCell(r.has_terrain_park) },
  { label: "Night skiing", render: (r) => boolCell(r.has_night_skiing) },
  { label: "Glades", render: (r) => boolCell(r.has_glades) },
  { label: "Halfpipe", render: (r) => boolCell(r.has_halfpipe) },
];

// A check for yes; a dash for no or unknown. A cross next to a check
// read as a warning in the audit (fresh-eyes-power-46), and "no" and
// "unknown" are rarely worth telling apart in a compare table.
function boolCell(v: boolean | null): ReactNode {
  if (v === true) {
    return (
      <span className="text-emerald-700" aria-label="Yes">
        ✓
      </span>
    );
  }
  return <span aria-label={v === false ? "No" : "Unknown"}>—</span>;
}

// Compact form for the table cells ("2.5 h" rather than "2h 30m"), with
// the same estimate mark the map uses.
function formatDriveTime(cell: DriveCell | undefined): string {
  const seconds = cell?.seconds;
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const hours = seconds / 3600;
  const compact =
    hours < 1
      ? `${Math.round(seconds / 60)} min`
      : hours < 10
        ? `${hours.toFixed(1)} h`
        : `${Math.round(hours)} h`;
  return withEstimateMark(compact, cell?.estimate === true);
}

function difficultyText(mix: DifficultyMix | null): string {
  if (!mix) return "—";
  return `🟢 ${mix.beginner}% · 🔵 ${mix.intermediate}% · ⚫ ${mix.advanced}% · ◆ ${mix.expert}%`;
}

/** A value with its source and time underneath, so no number on the
 *  page is printed without saying where it came from. */
function Labelled({ value, source }: { value: ReactNode; source: string }) {
  return (
    <span className="block">
      <span className="block">{value}</span>
      <span className="block text-[10px] font-normal text-wn-charcoal/70">{source}</span>
    </span>
  );
}

const STATUS_TONE: Record<Verdict["status"]["tone"], string> = {
  green: "text-emerald-700",
  amber: "text-amber-700",
  red: "text-red-700",
  navy: "text-wn-navy",
  muted: "text-wn-charcoal/60",
};

function metricRows(
  driveLabel: string,
  driveByResort: Map<number, DriveCell>,
  verdictById: Map<number, Verdict>,
  now: Date,
): MetricRowSpec[] {
  const conditions: MetricRowSpec[] = [
    {
      label: "Status",
      group: "conditions",
      render: (r) => {
        const v = verdictById.get(r.id);
        if (!v) return "—";
        const st = v.status;
        // Where the status came from, in priority order of
        // lib/seasonDates.deriveResortStatus: the resort's own report,
        // the verified operating flag, then published season dates.
        const source =
          r.snow_report_status === "reported" && r.snow_report_updated_at
            ? `Reported ${ago(r.snow_report_updated_at, now)}`
            : st.kind === "open" || st.kind === "limited"
              ? "Reported operating status"
              : st.kind === "likely-open"
                ? "Estimated from season dates"
                : st.kind === "unknown"
                  ? "Check the resort"
                  : "From published season dates";
        return (
          <Labelled
            value={
              <span className={`font-semibold ${STATUS_TONE[st.tone]}`}>
                {st.label}
                {st.detail ? ` · ${st.detail}` : ""}
              </span>
            }
            source={source}
          />
        );
      },
    },
    {
      label: "New snow (24 h)",
      group: "conditions",
      render: (r) => {
        const v = verdictById.get(r.id);
        const ns = v?.newSnow;
        if (!ns) return <Labelled value="—" source="No report yet" />;
        const when = ns.at ? ago(ns.at, now) : "";
        return <Labelled value={inchesText(ns.inches)} source={`${ns.source}${when ? ` ${when}` : ""}`} />;
      },
    },
    {
      label: "Surface today",
      group: "conditions",
      render: (r) => {
        const v = verdictById.get(r.id);
        if (!v || v.dormant) return <Labelled value="—" source="Lifts not running" />;
        if (!v.surface) return <Labelled value="—" source="Not enough weather history" />;
        const at = v.stale ? "" : ago(v.labels.find((l) => l.source === "Forecast")?.at ?? null, now);
        return (
          <Labelled
            value={v.surface.label}
            source={`Estimated, ${v.surface.confidence} confidence${at ? ` · ${at}` : ""}`}
          />
        );
      },
    },
    {
      label: driveLabel,
      group: "conditions",
      render: (r) => {
        const cell = driveByResort.get(r.id);
        return <Labelled value={formatDriveTime(cell)} source={cell?.estimate ? "Estimated from distance" : "Cached road route"} />;
      },
    },
  ];
  const stats: MetricRowSpec[] = [
    { label: "Difficulty mix", group: "stats", render: (r) => difficultyText(getDifficultyMix(r)) },
    ...STAT_METRICS.map((m) => ({ ...m, group: "stats" as const })),
  ];
  return [...conditions, ...stats];
}

// ---------- Resort header (shared by the desktop table and phone cards) ----------

function ResortHeading({ resort, compact = false }: { resort: CompareResort; compact?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-1">
      <div className="min-w-0">
        <Link
          href={`/resort/${resort.slug}`}
          className={`block font-extrabold tracking-tight text-wn-navy hover:underline ${compact ? "text-sm leading-snug" : "text-base"}`}
        >
          {resort.name}
        </Link>
        <div className="mt-0.5 text-[11px] text-wn-charcoal/65">
          {resort.state}
          {resort.region ? ` · ${resort.region}` : ""}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(resort.passes ?? []).map((p) => (
            <span
              key={p}
              className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold"
              style={{
                backgroundColor: passColor(p),
                color: textOn(passColor(p)),
              }}
            >
              {passLabel(p)}
            </span>
          ))}
        </div>
      </div>
      <RemoveFromCompare id={resort.id} name={resort.name} />
    </div>
  );
}

function stripStyle(resort: CompareResort) {
  return { background: `linear-gradient(135deg, ${passColor(primaryPass(resort.passes))} 0%, #1E2952 100%)` };
}

// ---------- Desktop: resort-major table ----------

function DesktopCompareTable({ resorts, rows }: { resorts: CompareResort[]; rows: MetricRowSpec[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[180px] bg-wn-offwhite px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/70">
              Metric
            </th>
            {resorts.map((r) => (
              <th key={r.id} className="border-b border-wn-charcoal/10 bg-white px-4 pb-3 pt-0 text-left align-bottom">
                {/* Pass-colour strip, the same anchor as the hero and pins. */}
                <div className="-mx-4 mb-3 h-1.5" style={stripStyle(r)} aria-hidden="true" />
                <ResortHeading resort={r} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m, i) => {
            const groupStart = i === 0 || rows[i - 1].group !== m.group;
            return (
              <tr key={m.label} className={groupStart && i > 0 ? "border-t-4 border-wn-offwhite" : "even:bg-wn-offwhite/50"}>
                <td className="border-t border-wn-charcoal/5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/70">
                  {m.label}
                </td>
                {resorts.map((r) => (
                  <td key={r.id} className="border-t border-wn-charcoal/5 px-4 py-2.5 align-top text-sm text-wn-charcoal">
                    {m.render(r)}
                  </td>
                ))}
              </tr>
            );
          })}
          <tr>
            <td className="border-t border-wn-charcoal/5 bg-wn-offwhite px-4 py-3" />
            {resorts.map((r) => (
              <td key={r.id} className="border-t border-wn-charcoal/5 px-4 py-3 align-top">
                <Link
                  href={`/resort/${r.slug}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-md bg-wn-navy px-3 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
                >
                  View full details
                  <span aria-hidden="true">→</span>
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ---------- Phone, one or two resorts: metric-major cards ----------

function MobileCompareList({ resorts, rows }: { resorts: CompareResort[]; rows: MetricRowSpec[] }) {
  const gridStyle = { gridTemplateColumns: `repeat(${resorts.length}, minmax(0, 1fr))` };
  return (
    <div className="space-y-3">
      <div className="grid gap-2" style={gridStyle}>
        {resorts.map((r) => (
          <div key={r.id} className="overflow-hidden rounded-lg border border-wn-charcoal/10 bg-white shadow-sm">
            <div className="h-1.5 w-full" style={stripStyle(r)} aria-hidden="true" />
            <div className="px-3 py-2.5">
              <ResortHeading resort={r} compact />
            </div>
          </div>
        ))}
      </div>

      {rows.map((m) => (
        <div key={m.label} className="rounded-lg border border-wn-charcoal/10 bg-white p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/70">{m.label}</div>
          <div className="grid gap-2" style={gridStyle}>
            {resorts.map((r) => (
              <div key={r.id} className="min-w-0 border-l border-wn-charcoal/10 pl-2 first:border-l-0 first:pl-0">
                <div className="truncate text-[10px] text-wn-charcoal/70">{r.name.split(" ")[0]}</div>
                <div className="break-words text-sm font-semibold text-wn-charcoal">{m.render(r)}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="grid gap-2 pt-2" style={gridStyle}>
        {resorts.map((r) => (
          <Link
            key={r.id}
            href={`/resort/${r.slug}`}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-wn-navy px-3 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
          >
            {r.name.split(" ")[0]} →
          </Link>
        ))}
      </div>
    </div>
  );
}

// ---------- Phone, three to five resorts: scrolling resort cards ----------
//
// One CSS grid holds every card: column j is resort j, row i is metric
// i, so the rows stay aligned across cards no matter how long a value
// wraps. The container scrolls sideways with snap points, showing one
// card plus the edge of the next so the scroll is discoverable.

function MobileCompareCards({ resorts, rows }: { resorts: CompareResort[]; rows: MetricRowSpec[] }) {
  const gridStyle = {
    gridTemplateColumns: `repeat(${resorts.length}, 17rem)`,
  };
  const lastRow = rows.length + 1;
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-3" style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
      <div className="grid gap-x-2" style={gridStyle}>
        {resorts.map((r, j) => (
          <div
            key={`h-${r.id}`}
            className="overflow-hidden rounded-t-xl border border-b-0 border-wn-charcoal/10 bg-white"
            style={{ gridColumn: j + 1, gridRow: 1, scrollSnapAlign: "start", scrollMarginLeft: "1rem" }}
          >
            <div className="h-1.5 w-full" style={stripStyle(r)} aria-hidden="true" />
            <div className="px-3 py-2.5">
              <ResortHeading resort={r} compact />
            </div>
          </div>
        ))}
        {rows.map((m, i) =>
          resorts.map((r, j) => {
            const groupStart = i > 0 && rows[i - 1].group !== m.group;
            return (
              <div
                key={`${m.label}-${r.id}`}
                className={[
                  "border-x border-wn-charcoal/10 bg-white px-3 py-2",
                  groupStart ? "border-t-4 border-t-wn-offwhite" : "border-t border-t-wn-charcoal/5",
                ].join(" ")}
                style={{ gridColumn: j + 1, gridRow: i + 2 }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/70">{m.label}</div>
                <div className="mt-0.5 break-words text-sm font-semibold text-wn-charcoal">{m.render(r)}</div>
              </div>
            );
          }),
        )}
        {resorts.map((r, j) => (
          <div
            key={`f-${r.id}`}
            className="rounded-b-xl border border-t-0 border-wn-charcoal/10 bg-white px-3 py-3"
            style={{ gridColumn: j + 1, gridRow: lastRow + 1 }}
          >
            <Link
              href={`/resort/${r.slug}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg bg-wn-navy px-3 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
            >
              View full details
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-[11px] text-wn-charcoal/70">Swipe sideways to see every resort.</p>
    </div>
  );
}
