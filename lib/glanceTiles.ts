// The four "at a glance" tiles shared by the map's resort sheet
// (components/Map/ResortSheetContent.tsx) and the resort page
// (app/resort/[slug]/page.tsx). One builder so both surfaces use the same
// labels and the same source words: Measured (NOHRSC / SNOTEL analysis
// or a weather station), Reported (a licensed resort report), Forecast
// (weather_cache / the surface model), Not reported. A number is never
// shown without its source, and the source carries an age whenever the
// row has a stamp. No DOM, no React; tested in tests/glanceTiles.test.ts.

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
  key: "snow" | "base" | "status" | "surface" | "temp";
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
  now?: Date;
};

function join(parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p).join(" · ");
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function buildGlanceTiles(input: GlanceInput): GlanceTile[] {
  const { resort, weather, status, surface } = input;
  const now = input.now ?? new Date();
  const reported = resort.snow_report_status === "reported";
  const reportAge = reported ? formatRelativeAge(resort.snow_report_updated_at, now) : null;
  const weatherAge = formatRelativeAge(weather?.fetched_at ?? null, now);
  const tiles: GlanceTile[] = [];

  // 1. New snow. resorts.snow_new_24h_in is written either by a licensed
  //    resort report (Reported) or by the daily NOHRSC / SNOTEL analysis
  //    (Measured, stamped by the same weather sync). When the column is
  //    empty the page falls back to the station's 24 h figure (Measured).
  const columnSnow = resort.snow_new_24h_in;
  const stationSnow = toNumber(weather?.snow_24h_in);
  const snow = columnSnow ?? stationSnow;
  tiles.push({
    key: "snow",
    label: "New snow (24h)",
    value: snow != null ? `${snow}"` : "—",
    source:
      snow == null
        ? "Not reported"
        : columnSnow != null && reported
          ? join(["Reported", reportAge])
          : join(["Measured", weatherAge ?? "daily"]),
    accent: snow != null && snow > 0,
  });

  // 2. Base depth from the resort report, or (map sheet) the derived
  //    open / opens-on status so the tile never sits empty off-season.
  if (resort.snow_base_depth_in != null) {
    tiles.push({
      key: "base",
      label: "Base depth",
      value: `${resort.snow_base_depth_in}"`,
      source: join(["Reported", reportAge]),
    });
  } else if (input.statusWhenNoBase) {
    tiles.push({
      key: "status",
      label: "Status",
      value: status.label,
      source: status.detail ?? (status.kind === "unknown" ? "Check the resort" : "Season dates"),
    });
  } else {
    tiles.push({ key: "base", label: "Base depth", value: "—", source: "Not reported" });
  }

  // 3. Surface class from the daily forecast run; paused while the
  //    surface model is dormant (closed / off-season / no evidence).
  if (surface && surface.kind === "active") {
    tiles.push({
      key: "surface",
      label: "Surface",
      value: surface.label,
      source: join([
        "Forecast",
        weatherAge ?? "today",
        surface.confidence ? `${surface.confidence} confidence` : null,
      ]),
    });
  } else {
    tiles.push({
      key: "surface",
      label: "Surface",
      value: surface?.label || "Paused",
      source: join(["Forecast paused", surface?.reason ?? (status.dormant ? "until lifts run" : "no forecast yet")]),
    });
  }

  // 4. Today's high from weather_cache (the forecast row). The label says
  //    what the number is ("High today", so a bare "28°F" is never read as
  //    the current temperature); the condition and the low get their own
  //    detail line, and the source line stays "Forecast · age" like the
  //    other tiles.
  const high = weather?.temp_high_f ?? null;
  const low = weather?.temp_low_f ?? null;
  const detail = high != null ? join([weather?.conditions_short ?? null, low != null ? `low ${low}°F` : null]) : "";
  tiles.push({
    key: "temp",
    label: "High today",
    value: high != null ? `${high}°F` : "—",
    ...(detail ? { detail } : {}),
    source: high != null ? join(["Forecast", weatherAge ?? "today"]) : "Not synced",
  });

  return tiles;
}
