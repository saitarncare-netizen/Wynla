// /compare — server-rendered side-by-side comparison of up to
// COMPARE_MAX resorts (Stage 34: 5; Pro tier ceiling).
//
// Driven by the `?ids=12,55,99` query string (populated by the floating
// "Compare X" button on the homepage). The compare list lives in
// localStorage; the page itself is pure-server so any link to it is
// shareable / linkable / SEO-indexable.
//
// Layout pivots at md: mobile is metric-major (one row per metric,
// resort values side-by-side as columns inside the row) so a phone
// user scrolls a single vertical column. Desktop is resort-major
// (each resort gets a column, each metric a row) — the canonical
// "compare table" UX.
import Link from "next/link";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";
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
import ClearCompareButton from "./CompareActions";

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

// Matches the columns we read from `resorts` below. We pull the
// superset that the metric rows need — Supabase returns nulls for
// any unset field, the rows below handle them gracefully with em-dashes.
type CompareResort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  passes: string[];
  vertical_drop: number | null;
  total_trails: number | null;
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
            Nothing to compare yet — open a resort from the map and tap
            <span className="mx-1 rounded bg-wn-navy/5 px-1.5 py-0.5 font-mono text-xs text-wn-navy">
              + Compare
            </span>
            to start a side-by-side list.
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
    .select(
      [
        "id",
        "slug",
        "name",
        "state",
        "region",
        "latitude",
        "longitude",
        "passes",
        "vertical_drop",
        "total_trails",
        "total_acres",
        "total_lifts",
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
      ].join(", "),
    )
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
            className="inline-flex h-9 items-center rounded-md border border-wn-charcoal/15 bg-white px-3 text-xs font-semibold text-wn-charcoal/70 transition hover:border-wn-navy hover:text-wn-navy"
          >
            ← Map
          </Link>
          {/* Clear-all action — destructive so we keep it visually muted
              (matching back-to-map weight) and to the right of the back
              affordance, the way iOS Mail puts Delete opposite Back.
              Resolves Saitarn's "ไม่มีปุ่มกดเคลียร์คอมแพร์" complaint. */}
          <ClearCompareButton />
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">
            Comparing {resorts.length} resort{resorts.length === 1 ? "" : "s"}
          </h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Side-by-side stats, amenities, and difficulty mix. Tap any column
            header for the full resort page.
          </p>
          <p className="mt-1 text-xs text-wn-charcoal/55">
            {driveLabel}
            {anyEstimate
              ? " · ≈ times are estimated from straight-line distance. Change the origin from the map's From picker."
              : " · cached road routes. Change the origin from the map's From picker."}
          </p>
        </header>

        {/* Desktop: resort-major table */}
        <div className="hidden md:block">
          <DesktopCompareTable
            resorts={resorts}
            driveByResort={driveByResort}
            driveLabel={driveLabel}
          />
        </div>

        {/* Mobile: metric-major stacked rows */}
        <div className="md:hidden">
          <MobileCompareList
            resorts={resorts}
            driveByResort={driveByResort}
            driveLabel={driveLabel}
          />
        </div>
      </div>
    </main>
  );
}

// ---------- Metric definitions ----------
//
// Each metric is a (label, render) pair so the desktop table and the
// mobile stacked layout share the same source of truth — no risk of
// the two views drifting on what counts as a "row".

type MetricFn = (r: CompareResort) => string;

const METRICS: Array<{ label: string; render: MetricFn }> = [
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
        return `${r.total_lifts} (${r.high_speed_lifts} HS)`;
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
  { label: "Annual snowfall", render: (r) => (r.annual_snowfall_in != null ? `${r.annual_snowfall_in}"` : "—") },
  { label: "Snowmaking", render: (r) => (r.snowmaking_pct != null ? `${r.snowmaking_pct}%` : "—") },
  { label: "Terrain park", render: (r) => boolCell(r.has_terrain_park) },
  { label: "Night skiing", render: (r) => boolCell(r.has_night_skiing) },
  { label: "Glades", render: (r) => boolCell(r.has_glades) },
  { label: "Halfpipe", render: (r) => boolCell(r.has_halfpipe) },
];

function boolCell(v: boolean | null): string {
  if (v === true) return "✓";
  if (v === false) return "✗"; // confirmed absent — distinct from "—" (unknown)
  return "—";
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

// ---------- Desktop: resort-major table ----------

function DesktopCompareTable({
  resorts,
  driveByResort,
  driveLabel,
}: {
  resorts: CompareResort[];
  driveByResort: Map<number, DriveCell>;
  driveLabel: string;
}) {
  // Column widths: shrink the metric label column as more resorts pile up.
  return (
    <div className="overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-[180px] bg-wn-offwhite px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
              Metric
            </th>
            {resorts.map((r) => (
              <ResortHeaderCell key={r.id} resort={r} />
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Drive-time first (most actionable). */}
          <MetricRow
            label={driveLabel}
            resorts={resorts}
            render={(r) => formatDriveTime(driveByResort.get(r.id))}
          />
          {/* Difficulty row uses the shared helper. */}
          <MetricRow
            label="Difficulty mix"
            resorts={resorts}
            render={(r) => difficultyText(getDifficultyMix(r))}
          />
          {METRICS.map((m) => (
            <MetricRow key={m.label} label={m.label} resorts={resorts} render={m.render} />
          ))}
          <tr>
            <td className="border-t border-wn-charcoal/5 bg-wn-offwhite px-4 py-3" />
            {resorts.map((r) => (
              <td
                key={r.id}
                className="border-t border-wn-charcoal/5 px-4 py-3 align-top"
              >
                <Link
                  href={`/resort/${r.slug}`}
                  className="inline-flex items-center gap-1 rounded-md bg-wn-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
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

function ResortHeaderCell({ resort }: { resort: CompareResort }) {
  const primary = primaryPass(resort.passes);
  const stripColor = passColor(primary);
  return (
    <th className="border-b border-wn-charcoal/10 bg-white px-4 pb-3 pt-0 text-left align-bottom">
      {/* Pass-color gradient strip — visual anchor matching the
          slug-page hero and the homepage pin colors. */}
      <div
        className="-mx-4 mb-3 h-1.5"
        style={{
          background: `linear-gradient(135deg, ${stripColor} 0%, #1E2952 100%)`,
        }}
        aria-hidden="true"
      />
      <Link
        href={`/resort/${resort.slug}`}
        className="block text-base font-extrabold tracking-tight text-wn-navy hover:underline"
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
              color: p === "ikon" ? "#1E2952" : "#FFFFFF",
            }}
          >
            {passLabel(p)}
          </span>
        ))}
      </div>
    </th>
  );
}

function MetricRow({
  label,
  resorts,
  render,
}: {
  label: string;
  resorts: CompareResort[];
  render: MetricFn;
}) {
  return (
    <tr className="even:bg-wn-offwhite/50">
      <td className="border-t border-wn-charcoal/5 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
        {label}
      </td>
      {resorts.map((r) => (
        <td
          key={r.id}
          className="border-t border-wn-charcoal/5 px-4 py-2.5 align-top text-sm text-wn-charcoal"
        >
          {render(r)}
        </td>
      ))}
    </tr>
  );
}

// ---------- Mobile: metric-major stacked layout ----------

function MobileCompareList({
  resorts,
  driveByResort,
  driveLabel,
}: {
  resorts: CompareResort[];
  driveByResort: Map<number, DriveCell>;
  driveLabel: string;
}) {
  // Use exactly N columns matching the resort count so the layout
  // never leaves an asymmetric half-empty row — Saitarn's complaint
  // 2026-05-23 was the old `grid-cols-2` putting resort #3 alone on
  // the left of row 2 every time she compared three. With N columns
  // every metric row reads as a symmetric strip regardless of count.
  // For 4-5 resorts on a narrow phone the cells get tight (≤78px),
  // but the metric values are short (✓ / — / "100%" / "1,600 ft")
  // so they still fit cleanly; resort names truncate via `truncate`.
  const gridStyle = {
    gridTemplateColumns: `repeat(${resorts.length}, minmax(0, 1fr))`,
  };
  return (
    <div className="space-y-4">
      {/* Resort header strip — one card per resort, name + pass colors. */}
      <div className="grid gap-2" style={gridStyle}>
        {resorts.map((r) => {
          const primary = primaryPass(r.passes);
          const c = passColor(primary);
          return (
            <Link
              key={r.id}
              href={`/resort/${r.slug}`}
              className="block overflow-hidden rounded-lg border border-wn-charcoal/10 bg-white shadow-sm"
            >
              <div
                className="h-1.5 w-full"
                style={{
                  background: `linear-gradient(135deg, ${c} 0%, #1E2952 100%)`,
                }}
                aria-hidden="true"
              />
              <div className="px-3 py-2.5">
                {/* Names bumped to text-base + font-extrabold + leading-snug
                    per Saitarn 2026-05-23 feedback — previous text-sm /
                    font-bold read as "small + faded" against the gradient
                    strip. Tighter line-height keeps two-line names tidy. */}
                <div className="break-words text-base font-extrabold leading-snug text-wn-navy">
                  {r.name}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-wn-charcoal/60">
                  {r.state}
                  {r.region ? ` · ${r.region}` : ""}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <MobileMetricCard
        label={driveLabel}
        resorts={resorts}
        render={(r) => formatDriveTime(driveByResort.get(r.id))}
      />
      <MobileMetricCard
        label="Difficulty mix"
        resorts={resorts}
        render={(r) => difficultyText(getDifficultyMix(r))}
      />
      {METRICS.map((m) => (
        <MobileMetricCard
          key={m.label}
          label={m.label}
          resorts={resorts}
          render={m.render}
        />
      ))}

      <div className="grid gap-2 pt-2" style={gridStyle}>
        {resorts.map((r) => (
          <Link
            key={r.id}
            href={`/resort/${r.slug}`}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-wn-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
          >
            {r.name.split(" ")[0]} →
          </Link>
        ))}
      </div>
    </div>
  );
}

function MobileMetricCard({
  label,
  resorts,
  render,
}: {
  label: string;
  resorts: CompareResort[];
  render: MetricFn;
}) {
  // Mirror the MobileCompareList header strip — N equal columns so
  // every metric row stays in lockstep with the resort header cards.
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
        {label}
      </div>
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${resorts.length}, minmax(0, 1fr))`,
        }}
      >
        {resorts.map((r) => (
          <div key={r.id} className="min-w-0 border-l border-wn-charcoal/10 pl-2 first:border-l-0 first:pl-0">
            <div className="truncate text-[10px] text-wn-charcoal/45">{r.name.split(" ")[0]}</div>
            <div className="break-words text-sm font-semibold text-wn-charcoal">{render(r)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
