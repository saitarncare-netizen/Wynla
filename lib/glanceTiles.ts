// The "at a glance" tiles shared by the map's resort sheet
// (components/Map/ResortSheetContent.tsx) and the resort page
// (app/resort/[slug]/page.tsx). One set of tile builders so both surfaces
// use the same labels and the same source words: Measured (NOHRSC /
// SNOTEL analysis or a weather station), Reported (a licensed resort
// report), Forecast (weather_cache / the surface model), Not reported. A
// number is never shown without its source, and the source carries an
// age whenever the row has a stamp.
//
// buildGlanceTiles is the page's strip (snow / base / surface / high);
// buildSheetTiles is the sheet's 2x2 (snow / today / status-or-base /
// surface-or-next-3-days); buildMountainFacts is the sheet's one-line
// summary of the mountain itself. No DOM, no React; tested in
// tests/glanceTiles.test.ts.

import type { ResortStatus } from "@/lib/seasonDates";

/**
 * "just now" / "12m ago" / "3h ago" / "2d ago" for an ISO stamp, or null
 * when the stamp is missing or unparsable. Relative ages are zone-free,
 * which matters because the map does not know each resort's time zone.
 */
export function formatRelativeAge(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const diffMin = Math.round((now.getTime() - t) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.round(diffMin / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export type GlanceTile = {
  key: "snow" | "base" | "status" | "surface" | "temp" | "next-snow";
  label: string;
  value: string;
  /** Source + age line, e.g. "Measured · 3h ago" or "Forecast · 3h ago · high confidence". */
  source: string;
  /** Optional extra fact about the value, shown on its own line above the
   *  source (the temperature tile: "Cloudy · low 15°F"). */
  detail?: string;
  /** Highlight (fresh snow). */
  accent?: boolean;
};

export type GlanceResort = {
  snow_new_24h_in: number | null;
  snow_base_depth_in: number | null;
  snow_report_status: string | null;
  snow_report_updated_at: string | null;
};

export type GlanceWeather = {
  temp_high_f: number | null;
  temp_low_f?: number | null;
  conditions_short: string | null;
  /** Station-derived 24 h snow; the resort page passes it as a fallback. */
  snow_24h_in?: number | string | null;
  fetched_at?: string | null;
};

export type GlanceSurface =
  | { kind: "active"; label: string; confidence?: "low" | "medium" | "high" | null }
  | { kind: "paused"; label?: string | null; reason?: string | null };

export type GlanceInput = {
  resort: GlanceResort;
  weather: GlanceWeather | null;
  status: ResortStatus;
  surface: GlanceSurface | null;
  /** When the resort reports no base depth, show the derived status tile
   *  instead of an empty "Base depth —" (the map sheet does this so the
   *  row never sits empty off-season; the page keeps the dash). */
  statusWhenNoBase?: boolean;
  /** SeasonInfo.openProjected: the opening date is a third-party
   *  projection, not the operator's announcement. The status tile then
   *  says "projected" next to the countdown. */
  openProjected?: boolean;
  now?: Date;
};

/** Per-resort extras the map sheet fetches when it opens
 *  (lib/fetchResortWeather.ts); structurally the same shape. */
export type GlanceExtras = {
  snowNext3In: number | null;
  lowF: number | null;
  windMph: number | null;
  gustMph: number | null;
  fetchedAt: string | null;
};

export type SheetGlanceInput = Omit<GlanceInput, "statusWhenNoBase"> & {
  /** undefined while the lazy fetch is in flight, null when it failed or
   *  the resort has no weather row yet. */
  extras?: GlanceExtras | null;
};

function join(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p).join(" · ");
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

// ---------- Individual tiles ----------

type Ctx = {
  now: Date;
  reported: boolean;
  reportAge: string | null;
  weatherAge: string | null;
};

function context(resort: GlanceResort, weather: GlanceWeather | null, now: Date): Ctx {
  const reported = resort.snow_report_status === "reported";
  return {
    now,
    reported,
    reportAge: reported ? formatRelativeAge(resort.snow_report_updated_at, now) : null,
    weatherAge: formatRelativeAge(weather?.fetched_at ?? null, now),
  };
}

// New snow. resorts.snow_new_24h_in is written either by a licensed
// resort report (Reported) or by the daily NOHRSC / SNOTEL analysis
// (Measured, stamped by the same weather sync). When the column is empty
// the page falls back to the station's 24 h figure (Measured).
function snowTile(resort: GlanceResort, weather: GlanceWeather | null, ctx: Ctx): GlanceTile {
  const columnSnow = resort.snow_new_24h_in;
  const stationSnow = toNumber(weather?.snow_24h_in);
  const snow = columnSnow ?? stationSnow;
  return {
    key: "snow",
    label: "New snow (24h)",
    value: snow != null ? `${snow}"` : "—",
    source:
      snow == null
        ? "Not reported"
        : columnSnow != null && ctx.reported
          ? join(["Reported", ctx.reportAge])
          : join(["Measured", ctx.weatherAge ?? "daily"]),
    accent: snow != null && snow > 0,
  };
}

function baseTile(resort: GlanceResort, ctx: Ctx): GlanceTile | null {
  if (resort.snow_base_depth_in == null) return null;
  return {
    key: "base",
    label: "Base depth",
    value: `${resort.snow_base_depth_in}"`,
    source: join(["Reported", ctx.reportAge]),
  };
}

// Derived open / opens-on status, for the sheet when there is no base
// depth to show. The countdown goes on the detail line; a projected
// opening (a third-party estimate, lib/seasonDates openProjected) says
// so there, and an announced one never does. Only an "Open today" backed
// by a licensed report is Reported; everything else comes from the
// parsed season dates.
function statusTile(status: ResortStatus, openProjected: boolean, ctx: Ctx): GlanceTile {
  const projected = openProjected && status.kind === "opens";
  const detail = projected ? join([status.detail, "projected"]) : status.detail;
  const live = status.kind === "open" || status.kind === "limited";
  return {
    key: "status",
    label: "Status",
    value: status.label,
    ...(detail ? { detail } : {}),
    source:
      live && ctx.reported
        ? join(["Reported", ctx.reportAge])
        : status.kind === "unknown"
          ? "Check the resort"
          : status.kind === "closed-permanent"
            ? "Resort listing"
            : "Season dates",
  };
}

// Surface class from the daily forecast run; paused while the surface
// model is dormant (closed / off-season / no evidence).
function surfaceTile(surface: GlanceSurface | null, status: ResortStatus, ctx: Ctx): GlanceTile {
  if (surface && surface.kind === "active") {
    return {
      key: "surface",
      label: "Surface",
      value: surface.label,
      source: join([
        "Forecast",
        ctx.weatherAge ?? "today",
        surface.confidence ? `${surface.confidence} confidence` : null,
      ]),
    };
  }
  return {
    key: "surface",
    label: "Surface",
    value: surface?.label || "Paused",
    source: join(["Forecast paused", surface?.reason ?? (status.dormant ? "until lifts run" : "no forecast yet")]),
  };
}

// Today's high from weather_cache (the forecast row), for the page. The
// label says what the number is ("High today", so a bare "28°F" is never
// read as the current temperature); the condition and the low get their
// own detail line, and the source line stays "Forecast · age" like the
// other tiles.
function highTile(weather: GlanceWeather | null, ctx: Ctx): GlanceTile {
  const high = weather?.temp_high_f ?? null;
  const low = weather?.temp_low_f ?? null;
  const detail = high != null ? join([weather?.conditions_short ?? null, low != null ? `low ${low}°F` : null]) : "";
  return {
    key: "temp",
    label: "High today",
    value: high != null ? `${high}°F` : "—",
    ...(detail ? { detail } : {}),
    source: high != null ? join(["Forecast", ctx.weatherAge ?? "today"]) : "Not synced",
  };
}

/** Gusts are named only once they start to matter for exposed chairs
 *  (wind holds typically begin around 35 mph); below that the sustained
 *  figure is the useful one and the line stays short. */
export const GUSTY_MPH = 25;

function windText(windMph: number | null, gustMph: number | null): string | null {
  if (windMph == null) return null;
  const avg = Math.round(windMph);
  const gust = gustMph != null ? Math.round(gustMph) : null;
  return gust != null && gust >= GUSTY_MPH && gust > avg ? `wind ${avg} mph, gusts ${gust}` : `wind ${avg} mph`;
}

// The sheet's weather tile: high and low as one value ("28° / 15°F",
// the weather-app convention, with the label spelling it out), and the
// condition plus wind on the detail line. The low comes from the map
// payload, falling back to the lazy per-resort read when the payload
// has none.
function todayTile(weather: GlanceWeather | null, extras: GlanceExtras | null | undefined, ctx: Ctx): GlanceTile {
  const high = weather?.temp_high_f ?? null;
  const low = weather?.temp_low_f ?? extras?.lowF ?? null;
  const both = high != null && low != null;
  const detail =
    high != null ? join([weather?.conditions_short ?? null, windText(extras?.windMph ?? null, extras?.gustMph ?? null)]) : "";
  return {
    key: "temp",
    label: both ? "High / low today" : "High today",
    value: high == null ? "—" : both ? `${high}° / ${low}°F` : `${high}°F`,
    ...(detail ? { detail } : {}),
    source: high != null ? join(["Forecast", ctx.weatherAge ?? "today"]) : "Not synced",
  };
}

/** `4"` for a forecast total: whole inches from 1" up (a 3-day model sum
 *  has no meaningful tenths), one decimal below that so a dusting does
 *  not round to 0. */
export function formatSnowTotal(inches: number): string {
  if (inches <= 0) return '0"';
  if (inches < 1) return `${Math.round(inches * 10) / 10}"`;
  return `${Math.round(inches)}"`;
}

// Forecast snowfall over today + the next two days, shown off-season or
// whenever the surface model is paused, so the fourth tile still says
// something useful ("is snow coming?") instead of "Paused".
function nextSnowTile(extras: GlanceExtras | null | undefined, ctx: Ctx): GlanceTile {
  const label = "Snow next 3 days";
  if (extras === undefined) return { key: "next-snow", label, value: "…", source: "Forecast" };
  const inches = extras?.snowNext3In ?? null;
  if (inches == null) return { key: "next-snow", label, value: "—", source: "Not synced" };
  return {
    key: "next-snow",
    label,
    value: formatSnowTotal(inches),
    source: join(["Forecast", formatRelativeAge(extras?.fetchedAt ?? null, ctx.now) ?? "today"]),
    accent: inches >= 1,
  };
}

// ---------- Tile sets ----------

/** The resort page's strip: new snow / base depth / surface / high. */
export function buildGlanceTiles(input: GlanceInput): GlanceTile[] {
  const { resort, weather, status, surface } = input;
  const ctx = context(resort, weather, input.now ?? new Date());
  const base = baseTile(resort, ctx);
  return [
    snowTile(resort, weather, ctx),
    base ??
      (input.statusWhenNoBase
        ? statusTile(status, input.openProjected ?? false, ctx)
        : { key: "base", label: "Base depth", value: "—", source: "Not reported" }),
    surfaceTile(surface, status, ctx),
    highTile(weather, ctx),
  ];
}

/**
 * The map sheet's 2x2: new snow and today's weather on top (what the
 * mountain is like right now), then base depth (or the derived status
 * when the resort reports none) and the surface class (or, while the
 * surface model is paused, the next-3-days snow total).
 */
export function buildSheetTiles(input: SheetGlanceInput): GlanceTile[] {
  const { resort, weather, status, surface, extras } = input;
  const ctx = context(resort, weather, input.now ?? new Date());
  return [
    snowTile(resort, weather, ctx),
    todayTile(weather, extras, ctx),
    baseTile(resort, ctx) ?? statusTile(status, input.openProjected ?? false, ctx),
    surface && surface.kind === "active" ? surfaceTile(surface, status, ctx) : nextSnowTile(extras, ctx),
  ];
}

// ---------- Mountain facts ----------

export type MountainFactsInput = {
  summit_elevation_ft: number | string | null;
  base_elevation_ft: number | string | null;
  vertical_drop: number | string | null;
  total_trails: number | string | null;
  total_lifts: number | string | null;
  has_night_skiing: boolean | null;
};

export type MountainFact = { key: "summit" | "base" | "vertical" | "trails" | "lifts" | "night"; text: string };

function positive(v: number | string | null | undefined): number | null {
  const n = toNumber(v);
  return n != null && n > 0 ? Math.round(n) : null;
}

// Non-breaking space between a number and its unit so a wrapped line
// never strands "ft" on its own.
const NBSP = " ";
const feet = (n: number) => `${n.toLocaleString("en-US")}${NBSP}ft`;

/**
 * The sheet's one-line mountain summary: summit and base elevation (or
 * the vertical drop when one of them is missing, since two elevations
 * already imply it), trail and lift counts, night skiing. Only facts the
 * row actually has; an empty list means the sheet shows none.
 */
export function buildMountainFacts(r: MountainFactsInput): MountainFact[] {
  const facts: MountainFact[] = [];
  const summit = positive(r.summit_elevation_ft);
  const base = positive(r.base_elevation_ft);
  const vertical = positive(r.vertical_drop);
  if (summit != null) facts.push({ key: "summit", text: `Summit ${feet(summit)}` });
  if (base != null) facts.push({ key: "base", text: `Base ${feet(base)}` });
  if ((summit == null || base == null) && vertical != null) {
    facts.push({ key: "vertical", text: `Vertical ${feet(vertical)}` });
  }
  const trails = positive(r.total_trails);
  if (trails != null) facts.push({ key: "trails", text: `${trails.toLocaleString("en-US")} ${trails === 1 ? "trail" : "trails"}` });
  const lifts = positive(r.total_lifts);
  if (lifts != null) facts.push({ key: "lifts", text: `${lifts} ${lifts === 1 ? "lift" : "lifts"}` });
  if (r.has_night_skiing === true) facts.push({ key: "night", text: "Night skiing" });
  return facts;
}
