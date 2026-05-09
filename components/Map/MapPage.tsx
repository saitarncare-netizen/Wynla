"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MapView, { type TripRoutePoint } from "./MapView";
import AlaskaInset from "./AlaskaInset";
import FilterBar from "./FilterBar";
// FilterDrawer removed in Stage 14 — Size + Night now inline pills.
import ResortPanel from "./ResortPanel";
import ResortPicker from "./ResortPicker";
import GeoBanner from "./GeoBanner";
import TripPlannerPanel from "./TripPlannerPanel";
import AuthButton from "@/components/auth/AuthButton";
import Link from "next/link";
import { resolveOrigin } from "@/lib/origins";
import { haversineMeters, estimateDriveSeconds, estimateDriveMeters } from "@/lib/distance";
import { PASS_COLORS, PASS_LABELS, PASS_KEYS } from "@/lib/passColors";
import { sizeTier, matchesSizeFilter, type SizeTier } from "@/lib/sizeTier";

export type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
  tier: "featured" | "listed";
  vertical_drop: number | null;
  total_trails: number | null;
  total_acres: number | null;
  website_url: string | null;
  has_night_skiing: boolean | null;
  // Trail breakdown by difficulty. Stage 18 stores PERCENTAGES
  // (difficulty_pct_*) as the canonical source — easier to verify
  // against resort marketing materials than raw counts. The trails_*
  // count columns are kept for backwards-compat reference; the UI
  // prefers pct when set and derives pct from counts as fallback.
  difficulty_pct_beginner: number | null;
  difficulty_pct_intermediate: number | null;
  difficulty_pct_advanced: number | null;
  difficulty_pct_expert: number | null;
  trails_beginner: number | null;
  trails_intermediate: number | null;
  trails_advanced: number | null;
  trails_expert: number | null;
  has_terrain_park: boolean | null;
  terrain_park_count: number | null;
};

export type DriveTime = {
  resort_id: number;
  origin_name: string;
  duration_seconds: number;
  distance_meters: number | null;
  // True for Haversine-derived estimates produced when the origin is the
  // user's geolocation. Cached city routes (NYC/Boston/Philly/Hartford)
  // are real road-network values and leave this absent/false.
  is_estimate?: boolean;
};

export type ForecastDay = {
  date: string;
  weekday: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  snow_in: number | null;
  precip_chance: number | null;
  wind_short: string | null;
  wind_dir_short: string | null;
};

export type WeatherSnapshot = {
  resort_id: number;
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  snow_24h_in: number | string | null;
  snow_48h_in: number | string | null;
  wind_mph_avg: number | null;
  wind_dir_short: string | null;
  fetched_at: string | null;
  forecast_json: ForecastDay[] | null;
};

type Props = {
  resorts: Resort[];
  driveTimes: DriveTime[];
  weather: WeatherSnapshot[];
  isAuthed: boolean;
};

function isSizeTier(v: string | null): v is SizeTier {
  return v === "small" || v === "medium" || v === "large";
}

export default function MapPage({ resorts, driveTimes, weather, isAuthed }: Props) {
  const weatherByResort = useMemo(
    () => new Map(weather.map((w) => [w.resort_id, w])),
    [weather],
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number; token: string } | null>(null);
  const [previewLeg, setPreviewLeg] = useState<{ fromLat: number; fromLng: number; toLat: number; toLng: number } | null>(null);
  const [tripResortIds, setTripResortIds] = useState<number[]>([]);
  const [tripRoute, setTripRoute] = useState<TripRoutePoint[] | null>(null);
  const [fitTripVersion, setFitTripVersion] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastSeenPlannerOpen, setLastSeenPlannerOpen] = useState(false);

  const passFilter = searchParams.get("pass");
  const sizeParam = searchParams.get("size");
  const sizeFilter: SizeTier | null = isSizeTier(sizeParam) ? sizeParam : null;
  const fromCode = searchParams.get("from") ?? "nyc";
  const fromLat = searchParams.get("fromLat");
  const fromLng = searchParams.get("fromLng");
  const withinHours = Number(searchParams.get("within")) || 0;
  const days = Math.min(30, Math.max(1, Number(searchParams.get("days")) || 1));
  const plannerOpen = searchParams.get("plan") === "1";
  const nightOnly = searchParams.get("night") === "1";

  // Defensive: when the planner closes, clear any trip overlays so a
  // user who saved + deleted a trip never sees lingering "in_trip"
  // pin highlights or preview lines on the main map.
  if (lastSeenPlannerOpen !== plannerOpen) {
    setLastSeenPlannerOpen(plannerOpen);
    if (!plannerOpen) {
      if (tripResortIds.length > 0) setTripResortIds([]);
      if (previewLeg) setPreviewLeg(null);
      if (tripRoute) setTripRoute(null);
    }
  }
  // featured URL param kept for backward compatibility (no UI control).
  const featuredOnly = searchParams.get("featured") === "1";

  const origin = useMemo(
    () => resolveOrigin(fromCode, fromLat, fromLng),
    [fromCode, fromLat, fromLng],
  );

  // For city origins we use the precomputed drive_time_cache rows. For a
  // geo origin we synthesize Haversine ESTIMATES on the fly so filters
  // ("Day trip ≤ 3h") and map UI keep working everywhere. ResortPanel
  // upgrades the estimate to a Mapbox Matrix exact value on click.
  const driveTimeByResort = useMemo(() => {
    const map = new Map<number, Map<string, DriveTime>>();
    if (origin.kind === "geo") {
      for (const r of resorts) {
        const lat = Number(r.latitude);
        const lon = Number(r.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        const meters = haversineMeters(origin.lat, origin.lon, lat, lon);
        const dt: DriveTime = {
          resort_id: r.id,
          origin_name: origin.name,
          duration_seconds: estimateDriveSeconds(meters),
          distance_meters: estimateDriveMeters(meters),
          is_estimate: true,
        };
        map.set(r.id, new Map([[origin.name, dt]]));
      }
    } else {
      for (const dt of driveTimes) {
        if (!map.has(dt.resort_id)) map.set(dt.resort_id, new Map());
        map.get(dt.resort_id)!.set(dt.origin_name, dt);
      }
    }
    return map;
  }, [driveTimes, origin, resorts]);

  // Resorts that pass every filter EXCEPT size — used to compute the
  // "X with unknown size hidden" caption when the size chip is active.
  const filteredIgnoringSize = useMemo(() => {
    return resorts.filter((r) => {
      if (featuredOnly && r.tier !== "featured") return false;
      if (passFilter && !(r.passes ?? []).includes(passFilter)) return false;
      if (nightOnly && !r.has_night_skiing) return false;
      if (withinHours > 0) {
        const dt = driveTimeByResort.get(r.id)?.get(origin.name);
        if (!dt || dt.duration_seconds > withinHours * 3600) return false;
      }
      return true;
    });
  }, [resorts, featuredOnly, passFilter, nightOnly, withinHours, origin, driveTimeByResort]);

  const filtered = useMemo(() => {
    return filteredIgnoringSize.filter((r) => matchesSizeFilter(r.vertical_drop, sizeFilter));
  }, [filteredIgnoringSize, sizeFilter]);

  // Count of resorts hidden specifically because they have NULL vertical_drop
  // and a size filter is active. 0 when no filter active or no NULL hits.
  const hiddenByNullSize = useMemo(() => {
    if (sizeFilter === null) return 0;
    return filteredIgnoringSize.filter((r) => r.vertical_drop == null).length;
  }, [filteredIgnoringSize, sizeFilter]);

  // Pass counts respect the featured-only toggle so chip numbers match what's visible.
  // A resort with multiple passes is counted in each.
  const passCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const pool = featuredOnly ? resorts.filter((r) => r.tier === "featured") : resorts;
    for (const r of pool) {
      for (const p of r.passes ?? []) {
        counts[p] = (counts[p] ?? 0) + 1;
      }
    }
    return counts;
  }, [resorts, featuredOnly]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  }

  // Atomic multi-param update — used when "From here" needs to set
  // ?from=geo&fromLat=…&fromLng=… in one router.replace so the resolver
  // never sees a half-applied state.
  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  }

  // Switch the From-origin to a city. Drops any stale geo lat/lng params.
  function handleFromCity(code: string) {
    updateParams({ from: code, fromLat: null, fromLng: null });
  }

  // Switch the From-origin to the user's actual location.
  function handleFromGeo(lat: number, lng: number) {
    updateParams({
      from: "geo",
      fromLat: lat.toFixed(5),
      fromLng: lng.toFixed(5),
    });
  }

  function clearAll() {
    startTransition(() => {
      router.replace("?", { scroll: false });
    });
  }

  // Resolve the currently-selected resort once per render (not in click
  // handler) so the panel always reflects the latest data — e.g. drive-time
  // updates when the user changes the From-city filter.
  const selectedResort = useMemo(
    () => (selectedId == null ? null : resorts.find((r) => r.id === selectedId) ?? null),
    [selectedId, resorts],
  );

  // ESC key closes the panel — keyboard parity with the X button.
  useEffect(() => {
    if (selectedId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-10 border-b border-wn-charcoal/10 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-extrabold tracking-tight text-wn-navy">
              Wynla
            </span>
            <span className="hidden text-xs text-wn-charcoal/50 sm:inline">
              Plan smart. Ride better.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Header-level resort search. Click → opens the same
                ResortPicker the planner uses, but seeded with the
                origin so results are sorted by drive time. Selecting
                a resort opens its panel and flies the camera in. */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95"
              title="Search for a specific resort"
              aria-label="Search resorts"
            >
              <span aria-hidden="true">🔍</span>
              <span className="hidden sm:inline">Search</span>
            </button>
            {/* My trips — quick access to the saved-trips list. /trips
                redirects to /login when signed out, so we always show
                the button regardless of auth state. */}
            <Link
              href="/trips"
              className="inline-flex items-center gap-1.5 rounded-md border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95"
              title="View saved trips"
              aria-label="My trips"
            >
              <span aria-hidden="true">📋</span>
              <span className="hidden sm:inline">My trips</span>
            </Link>
            {/* Top-level Plan-a-trip CTA. Replaces the buried "Plan my N-day
                trip" button that used to live inside the Trip dropdown. */}
            <button
              type="button"
              onClick={() => updateParam("plan", "1")}
              className="inline-flex items-center gap-1.5 rounded-md bg-wn-navy px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-wn-navy/90 active:scale-95"
              title="Plan a multi-day ski trip"
            >
              <span aria-hidden="true">🗺️</span>
              <span>Plan a trip</span>
            </button>
            <Link
              href="/pro"
              className="hidden rounded-md border border-wn-gold/60 bg-wn-gold/10 px-2.5 py-1 text-xs font-semibold text-wn-navy transition hover:bg-wn-gold/25 sm:inline-block"
              title="Wynla Pro — coming soon"
            >
              ✨ Pro
            </Link>
            <AuthButton />
          </div>
        </div>
        <FilterBar
          passFilter={passFilter}
          origin={origin}
          withinHours={withinHours}
          days={days}
          sizeFilter={sizeFilter}
          nightOnly={nightOnly}
          passCounts={passCounts}
          hiddenByNullSize={hiddenByNullSize}
          filteredCount={filtered.length}
          totalCount={resorts.length}
          onPassChange={(p) => updateParam("pass", p)}
          onFromCity={handleFromCity}
          onFromGeo={handleFromGeo}
          onWithinChange={(w) => updateParam("within", w)}
          onDaysChange={(d) => updateParam("days", d > 1 ? String(d) : null)}
          onSizeChange={(s) => updateParam("size", s)}
          onNightChange={(v) => updateParam("night", v ? "1" : null)}
          onClearAll={clearAll}
        />
      </header>


      <MapView
        resorts={filtered}
        originName={origin.name}
        driveTimeByResort={driveTimeByResort}
        selectedId={selectedId}
        onResortClick={setSelectedId}
        tripRoute={tripRoute ?? undefined}
        cameraTarget={cameraTarget}
        tripResortIds={tripResortIds}
        previewLeg={previewLeg}
        fitTripVersion={fitTripVersion}
      />

      <AlaskaInset resorts={filtered} />

      {/* Empty state — only when filters return zero. The Alaska inset
          handles its own emptiness; this banner is for the main map. */}
      {filtered.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className="pointer-events-auto max-w-sm rounded-xl border border-wn-charcoal/10 bg-white/95 p-6 text-center shadow-lg backdrop-blur-sm">
            <svg
              aria-hidden="true"
              className="mx-auto mb-3 h-14 w-14 text-wn-navy/70"
              viewBox="0 0 64 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Mountain outline — three peaks with a sun behind */}
              <circle cx="46" cy="16" r="5" stroke="#D4A84B" />
              <path d="M4 50 L20 26 L30 38 L42 18 L60 50 Z" />
              <path d="M20 26 L24 32 L28 28" opacity="0.5" />
              <path d="M42 18 L48 28 L52 24" opacity="0.5" />
            </svg>
            <h2 className="mb-1.5 text-lg font-bold tracking-tight text-wn-navy">
              No resorts match
            </h2>
            <p className="mb-4 text-xs leading-relaxed text-wn-charcoal/70">
              Try removing a filter — your current selection has nothing in common.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-xs font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.97]"
            >
              Reset all filters
            </button>
          </div>
        </div>
      )}

      {selectedResort && (
        <ResortPanel
          resort={selectedResort}
          driveTime={driveTimeByResort.get(selectedResort.id)?.get(origin.name)}
          origin={origin}
          weather={weatherByResort.get(selectedResort.id) ?? null}
          onClose={() => setSelectedId(null)}
        />
      )}

      <TripPlannerPanel
        open={plannerOpen}
        origin={origin}
        candidates={filtered}
        allResorts={resorts}
        days={Math.max(2, days)}
        isAuthed={isAuthed}
        onClose={() => updateParam("plan", null)}
        onFocusResort={(point) =>
          point
            ? setCameraTarget({ ...point, token: `${Date.now()}` })
            : setCameraTarget(null)
        }
        onPreviewLeg={setPreviewLeg}
        onTripResortIds={setTripResortIds}
        onTripRoute={setTripRoute}
        onDaysChange={(d) => updateParam("days", d > 1 ? String(d) : null)}
        onViewFullRoute={() => setFitTripVersion((v) => v + 1)}
      />

      {/* Header search modal — re-uses the planner's ResortPicker.
          Selecting a resort flies the camera + opens its panel. We pass
          the active filter set (not all 451) so a user who's narrowed
          down by Pass / Size / Night / Drive sees only those resorts. */}
      <ResortPicker
        open={searchOpen}
        title="Find a resort"
        fromPoint={{ lat: origin.lat, lng: origin.lon, label: origin.kind === "geo" ? "your location" : origin.name }}
        allResorts={filtered}
        alreadyPicked={[]}
        onSelect={(slug) => {
          const r = resorts.find((c) => c.slug === slug);
          if (r) {
            setSelectedId(r.id);
            setCameraTarget({
              lat: Number(r.latitude),
              lng: Number(r.longitude),
              token: `search-${Date.now()}`,
            });
          }
          setSearchOpen(false);
        }}
        onClose={() => setSearchOpen(false)}
      />

      {/* First-visit banner asking permission to use device location.
          Stays mounted at all times — it self-suppresses via localStorage. */}
      <GeoBanner currentFromCode={fromCode} onUseMyLocation={handleFromGeo} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4 sm:justify-end sm:pr-6">
        <div className="pointer-events-auto rounded-lg border border-wn-charcoal/10 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
            Pass
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {PASS_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: PASS_COLORS[key] }}
                />
                <span className="text-wn-charcoal">{PASS_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
