"use client";

import {
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MapView, { type TripRoutePoint } from "./MapView";
import AlaskaInset from "./AlaskaInset";
import FilterBar from "./FilterBar";
// FilterDrawer removed in Stage 14 — Size + Night now inline pills.
import ResortPanel from "./ResortPanel";
import ResortPicker from "./ResortPicker";
import LocationButton from "./LocationButton";
import FeedbackButton from "@/components/FeedbackButton";
import FiltersDrawer, { AIRPORT_OPTIONS } from "./FiltersDrawer";
import MobileQuickFilters from "./MobileQuickFilters";
import TripPlannerPanel from "./TripPlannerPanel";
import AuthButton from "@/components/auth/AuthButton";
import ProBadge from "@/components/ProBadge";
import CompareFloatingButton from "@/components/CompareFloatingButton";
import RecentlyViewedStrip, {
  OPEN_RESORT_EVENT,
  type OpenResortDetail,
} from "@/components/RecentlyViewedStrip";
// OnboardingCard import removed — 3-step wizard retired (Round 5 polish).
// First-time users now land directly on the full map. The file is kept
// on disk so the work isn't lost; we may resurface a lightweight version
// later for personalization (skill badges, sort order).
import OffSeasonBanner from "@/components/OffSeasonBanner";
import ProBenefitsCard from "@/components/ProBenefitsCard";
// Stage 33 — matchesSkill / getPreferences are still exported for
// future use (badges, sort order, curated lists), but the map-level
// "🎯 For you" filter that used them was retired: it hid mid/large
// resorts (Vail, Killington, etc) from beginners despite those
// resorts having plenty of green terrain in absolute acreage. Bad
// for both users and resorts.
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
  // Stage 23 — lifts/elevation/snow/amenities/airport/URLs
  total_lifts: number | null;
  high_speed_lifts: number | null;
  base_elevation_ft: number | null;
  summit_elevation_ft: number | null;
  annual_snowfall_in: number | null;
  season_open_text: string | null;
  season_close_text: string | null;
  snowmaking_pct: number | null;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  hero_image_attribution: string | null;
  // Stage 26 — live snow + open conditions (cron-refreshed)
  snow_base_depth_in: number | null;
  snow_new_24h_in: number | null;
  snow_new_48h_in: number | null;
  snow_new_7d_in: number | null;
  trails_open_today: number | null;
  lifts_open_today: number | null;
  snow_report_status: string | null;
  snow_report_updated_at: string | null;
  // Stage 27 — lift ticket pricing
  ticket_price_adult_min: number | null;
  ticket_price_adult_max: number | null;
  ticket_price_currency: string | null;
  ticket_booking_url: string | null;
  ticket_price_updated_at: string | null;
  has_tubing: boolean | null;
  has_lessons: boolean | null;
  has_rentals: boolean | null;
  has_lodging_on_mountain: boolean | null;
  has_xc_skiing: boolean | null;
  has_backcountry_access: boolean | null;
  trail_map_url: string | null;
  webcam_url: string | null;
  closest_airport_iata: string | null;
  closest_airport_distance_mi: number | null;
  // Phase 0 (one-app build, 2026-05-21) — Tier 1 verified data.
  allows_snowboards: boolean | null;
  // Stage 4 (filter expansion, 2026-05-22) — schema updated to match
  // the Phase 2 mass-research keys actually populated in production.
  // Previous keys (chair_fixed / chair_detach / tbar / poma / rope /
  // carpet) were never populated — they were a placeholder schema from
  // Phase 0. New canonical keys below.
  lift_types: {
    high_speed_six?: number;
    high_speed_quad?: number;
    fixed_quad?: number;
    fixed_triple?: number;
    fixed_double?: number;
    gondola?: number;
    bubble_chair?: number;
    tram?: number;
    surface?: number;
    magic_carpet?: number;
  } | null;
  currently_open: boolean | null;
  season_end_date: string | null;
  terrain_park_features: number | null;
  // Inaugural Season 2026 — Snow Surface Forecast. Written by the
  // refresh-weather cron after each daily run; off-season resorts get
  // NULL. Filterable via ?surface=PP,PPC,MG on the URL.
  current_surface_class: string | null;
  current_surface_updated_at: string | null;
  // Stage 4 — Best-for expansion. ?adaptive=1 narrows to resorts with
  // a certified adaptive ski school. Source data filled by a separate
  // research agent (boolean true / false / null).
  has_adaptive_program: boolean | null;
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cameraTarget, setCameraTarget] = useState<{ lat: number; lng: number; token: string } | null>(null);
  const [previewLeg, setPreviewLeg] = useState<{ fromLat: number; fromLng: number; toLat: number; toLng: number } | null>(null);
  const [tripResortIds, setTripResortIds] = useState<number[]>([]);
  const [tripRoute, setTripRoute] = useState<TripRoutePoint[] | null>(null);
  const [fitTripVersion, setFitTripVersion] = useState(0);
  const [searchOpen, setSearchOpenRaw] = useState(false);
  const [filtersOpen, setFiltersOpenRaw] = useState(false);
  const [lastSeenPlannerOpen, setLastSeenPlannerOpen] = useState(false);
  // Stage 33 — Search / Filter / ResortPanel are mutually exclusive on
  // mobile. Opening any one of them closes the other two so they
  // never stack visually. selectedId drives the ResortPanel; setting
  // it to null hides the panel.
  function setSearchOpen(v: boolean) {
    setSearchOpenRaw(v);
    if (v) {
      setFiltersOpenRaw(false);
      setSelectedId(null);
    }
  }
  function setFiltersOpen(v: boolean) {
    setFiltersOpenRaw(v);
    if (v) {
      setSearchOpenRaw(false);
      setSelectedId(null);
    }
  }
  function openResort(id: number | null) {
    setSelectedId(id);
    if (id != null) {
      setSearchOpenRaw(false);
      setFiltersOpenRaw(false);
    }
  }
  // Onboarding wizard removed (Round 5 polish). First-time users go
  // straight to the full map — no skill / pass / origin questions
  // upfront. Personalization can return later as a passive sort-order
  // tweak instead of a blocking modal.

  // Branded splash overlay state — visible on first ever mount until
  // Mapbox fires `load`. 3s safety timeout in case the map never loads
  // (missing token, network error).
  //
  // INTENT (do not "optimize" the delay away):
  //   1. MINIMUM display 1000ms so the tagline "Plan smart. Ride better."
  //      is readable on fast networks. The 3s safety timeout also
  //      respects this floor.
  //   2. LOCAL-STORAGE gating with 7-day TTL. Splash shows on the very
  //      first visit per device. After that it skips for a week,
  //      preventing the "flashes every time I reopen the PWA" complaint
  //      Saitarn flagged on iPhone (iOS Safari unloads tabs aggressively
  //      so sessionStorage clears between PWA opens). After 7 days the
  //      splash returns once as a soft brand re-impression.
  //   3. STORAGE FORMAT: `wynla_splash_seen_at` = unix ms of last show.
  //      If absent OR older than 7 days, show splash; else skip.
  const SPLASH_MIN_MS = 1000;
  const SPLASH_SAFETY_MS = 3000;
  const SPLASH_STORAGE_KEY = "wynla_splash_seen_at";
  const SPLASH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  // Lazy initial state — read localStorage at mount-time so we never
  // flash the overlay on returning visits within the TTL. SSR-safe.
  const [splashVisible, setSplashVisible] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = window.localStorage.getItem(SPLASH_STORAGE_KEY);
      if (!raw) return true;
      const last = Number(raw);
      if (!Number.isFinite(last)) return true;
      return Date.now() - last > SPLASH_TTL_MS;
    } catch {
      return true;
    }
  });
  // Initialized to 0; the mount-effect overwrites this with Date.now()
  // so impure-call lint passes and the start-time is captured exactly
  // when the splash actually begins displaying (mount), not earlier
  // during render. For returning visitors (splashVisible=false) we
  // skip the effect entirely so this stays 0 and is never read.
  const splashShownAtRef = useRef<number>(0);
  const splashHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Centralized hide helper — respects the 1500ms floor and writes the
  // session flag so re-mounts don't re-show the splash. Safe to call
  // multiple times; the timer is cleared and the flag stored on the
  // first invocation.
  function hideSplashRespectingMin() {
    const elapsed = Date.now() - splashShownAtRef.current;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
    if (splashHideTimer.current) {
      clearTimeout(splashHideTimer.current);
      splashHideTimer.current = null;
    }
    const commit = () => {
      setSplashVisible(false);
      try {
        window.localStorage.setItem(SPLASH_STORAGE_KEY, String(Date.now()));
      } catch {
        /* localStorage unavailable (private mode / quota) —
           splash will re-show next visit, acceptable */
      }
    };
    if (remaining === 0) {
      commit();
    } else {
      splashHideTimer.current = setTimeout(commit, remaining);
    }
  }
  useEffect(() => {
    // If splashVisible was initialized false (returning visitor),
    // skip the safety timer entirely — overlay is already hidden.
    if (!splashVisible) return;
    splashShownAtRef.current = Date.now();
    // Safety net: schedule a hide after 8s so users never get stuck
    // staring at the splash if Mapbox token / network is broken. The
    // hide helper itself enforces the 1500ms minimum, but at 8s that
    // floor is always satisfied so it's effectively immediate then.
    splashHideTimer.current = setTimeout(
      hideSplashRespectingMin,
      SPLASH_SAFETY_MS,
    );
    return () => {
      if (splashHideTimer.current) clearTimeout(splashHideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function handleMapLoaded() {
    // Only act if the splash is still on-screen. Once it's hidden,
    // subsequent Mapbox style-reloads (theme switches, etc.) won't
    // re-trigger the splash because splashVisible is already false.
    if (!splashVisible) return;
    hideSplashRespectingMin();
  }
  // Stage 19.5: when the trip planner's picker is active, it
  // registers a handler here. Map pin clicks route through it
  // (treating the click as "pick this resort for the current stop")
  // instead of the default "open ResortPanel" behavior, so the user
  // can build a trip directly from the map without dismissing the
  // picker. Stored in a ref because we don't need re-renders when it
  // flips — only the click handler reads the latest value.
  const mapPickHandlerRef = useRef<((slug: string) => void) | null>(null);
  function handleMapPickHandlerChange(handler: ((slug: string) => void) | null) {
    mapPickHandlerRef.current = handler;
  }

  // Pass filter is multi-select. URL stores it as a comma-separated
  // list ("?pass=ikon,epic"). Empty list = no pass filter active. The
  // single legacy value ("?pass=ikon") is still parsed correctly since
  // it splits to ["ikon"]. A resort matches when ANY of its passes is
  // in the active filter set (OR semantics — multi-pass owners see
  // every resort that's on at least one of their passes). Memoized so
  // downstream useMemo deps don't change identity on every render.
  const passFilterRaw = searchParams.get("pass");
  const passFilter = useMemo<string[]>(
    () =>
      passFilterRaw
        ? passFilterRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    [passFilterRaw],
  );
  const sizeParam = searchParams.get("size");
  const sizeFilter: SizeTier | null = isSizeTier(sizeParam) ? sizeParam : null;
  const fromCode = searchParams.get("from") ?? "nyc";
  const fromLat = searchParams.get("fromLat");
  const fromLng = searchParams.get("fromLng");
  const withinHours = Number(searchParams.get("within")) || 0;
  const days = Math.min(30, Math.max(1, Number(searchParams.get("days")) || 1));
  const plannerOpen = searchParams.get("plan") === "1";
  const nightOnly = searchParams.get("night") === "1";
  // Stage 33 — fresh-snow filter. URL `?freshsnow=1` narrows to
  // resorts where the Stage 26 snow cron populated snow_new_24h_in > 0
  // (e.g. powder-day chasers). Off-season this filter will surface
  // only the rare late-season snow events (Mt. Hood, etc).
  const freshSnowOnly = searchParams.get("freshsnow") === "1";
  // Phase 3 (one-app build) — Open Now filter. ?open=1 narrows to resorts
  // with currently_open=true (Tier 1 verified data). Most useful during
  // late-spring (May-Jul) when only a handful of resorts are still
  // operating. Hidden from chip strip when zero resorts qualify.
  const openNowOnly = searchParams.get("open") === "1";
  // Phase 3 — lift-type requirement. ?lift=gondola|tram|highspeed|nosurface
  // filters by minimum lift inventory. Useful for "I want gondola access"
  // (visual partners, beginners, comfort) or "no surface-only" (avoid
  // resorts where the only uphill option is a T-bar / poma / magic carpet).
  const liftReq = searchParams.get("lift");
  // Stage 4 (filter expansion) — amenity + snow feature URL params.
  // All boolean flags use "?key=1" → only resorts where the column is
  // STRICTLY true. Missing / null fails the filter (matches the
  // size-filter pattern: filter-when-active is strict so users don't
  // get false positives from unknown-data resorts).
  const lessonsOnly = searchParams.get("lessons") === "1";
  const rentalsOnly = searchParams.get("rentals") === "1";
  const lodgingOnly = searchParams.get("lodging") === "1";
  const tubingOnly = searchParams.get("tubing") === "1";
  const xcOnly = searchParams.get("xc") === "1";
  const backcountryOnly = searchParams.get("backcountry") === "1";
  const terrainparkOnly = searchParams.get("terrainpark") === "1";
  // Stage 5 round 2 — removed `snowboardsOnly`. Only 3 US resorts ban
  // snowboards (Mad River Glen, Alta, Deer Valley) so the filter was
  // dead weight for 99% of users. URL param parsing dropped along with
  // the predicate.
  const webcamOnly = searchParams.get("webcam") === "1";
  // Family Mountain composite filter — ?family=1 narrows to resorts
  // that work well for family / beginner trips. A resort qualifies if
  // it has BOTH a ski school AND rental shop (table stakes for a family
  // outing) AND either a chunk of beginner terrain (>=25% green) OR a
  // dedicated learning lift (magic carpet). Strict-when-active: NULL
  // on any required field fails.
  const familyOnly = searchParams.get("family") === "1";
  function matchesFamily(r: Resort): boolean {
    if (r.has_lessons !== true) return false;
    if (r.has_rentals !== true) return false;
    const beginnerPct = r.difficulty_pct_beginner ?? 0;
    const hasMagicCarpet = (r.lift_types?.magic_carpet ?? 0) >= 1;
    if (beginnerPct < 25 && !hasMagicCarpet) return false;
    return true;
  }
  // Stage 4 — Best-for expansion. Two composite filters surfaced
  // alongside Family Mountain in the FiltersDrawer:
  //   ?expert=1   — >=30% expert terrain AND >=2000 ft vertical
  //   ?adaptive=1 — has_adaptive_program === true (certified adaptive school)
  // Strict semantics: NULL on the required column fails the filter.
  // (Stage 5 round 2 dropped ?powder=1 — historical snowfall was
  // misleading vs real-time PP/PPC surface forecast.)
  const expertOnly = searchParams.get("expert") === "1";
  const adaptiveOnly = searchParams.get("adaptive") === "1";
  function matchesExpert(r: Resort): boolean {
    return (
      (r.difficulty_pct_expert ?? 0) >= 30 && (r.vertical_drop ?? 0) >= 2000
    );
  }
  function matchesAdaptive(r: Resort): boolean {
    return r.has_adaptive_program === true;
  }
  // Inaugural Season 2026 — Snow today filter. URL form: ?surface=PP,PPC,MG
  // (comma-separated SANY surface codes, case-insensitive). Resort
  // matches when its current_surface_class is in the list. NULL fails
  // strictly when the filter is active (matches the size-filter pattern).
  const surfaceParamRaw = searchParams.get("surface");
  const surfaceFilter = useMemo<string[]>(
    () =>
      surfaceParamRaw
        ? surfaceParamRaw
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        : [],
    [surfaceParamRaw],
  );
  function matchesSurface(r: Resort): boolean {
    if (surfaceFilter.length === 0) return true;
    if (!r.current_surface_class) return false;
    return surfaceFilter.includes(r.current_surface_class.toUpperCase());
  }
  // Snowmaking threshold — ?snowmake=60 → only resorts with
  // snowmaking_pct >= 60. NULL fails. 0 / missing = no filter.
  const snowmakeMinRaw = searchParams.get("snowmake");
  const snowmakeMin = (() => {
    if (!snowmakeMinRaw) return 0;
    const n = Number(snowmakeMinRaw);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round(n)));
  })();
  // Stage 8 — airport filter. URL form: ?airport=DEN. Empty / missing
  // = no airport filter. Matched against resort.closest_airport_iata
  // with a 120-mile shuttle-range distance cap; resorts with NULL
  // airport data are excluded when this filter is active.
  const airportParam = searchParams.get("airport");
  const airportFilter: string | null = airportParam
    ? airportParam.toUpperCase()
    : null;
  const AIRPORT_MAX_DISTANCE_MI = 120;

  // Resolve the picked airport's coordinates from AIRPORT_OPTIONS so
  // MapView can drop a ✈️ marker and ResortPanel can compute drive
  // time from the airport. Null when no airport filter is active.
  const activeAirport = useMemo(() => {
    if (!airportFilter) return null;
    const a = AIRPORT_OPTIONS.find((opt) => opt.iata === airportFilter);
    if (!a) return null;
    return { lat: a.lat, lng: a.lng, label: a.label, iata: a.iata };
  }, [airportFilter]);

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

  // Stage 8 — airport-match predicate. Reused across pipelines.
  const matchesAirport = (r: Resort): boolean => {
    if (!airportFilter) return true;
    if (r.closest_airport_iata !== airportFilter) return false;
    // Distance cap — keep the result set to realistic shuttle range so
    // a user filtering by DEN doesn't see a resort 280 mi away.
    if (
      r.closest_airport_distance_mi != null &&
      r.closest_airport_distance_mi > AIRPORT_MAX_DISTANCE_MI
    ) {
      return false;
    }
    return true;
  };

  // Resorts that pass every filter EXCEPT size — used to compute the
  // "X with unknown size hidden" caption when the size chip is active.
  const filteredIgnoringSize = useMemo(() => {
    return resorts.filter((r) => {
      if (featuredOnly && r.tier !== "featured") return false;
      if (passFilter.length > 0) {
        const userPasses = r.passes ?? [];
        if (!userPasses.some((p) => passFilter.includes(p))) return false;
      }
      if (nightOnly && !r.has_night_skiing) return false;
      if (freshSnowOnly && !(r.snow_new_24h_in != null && r.snow_new_24h_in > 0)) {
        return false;
      }
      if (openNowOnly && r.currently_open !== true) return false;
      if (liftReq) {
        const t = r.lift_types;
        if (!t) return false;
        // Stage 4 — schema migrated from {chair_fixed, chair_detach}
        // to the Phase 2 keys {high_speed_six, high_speed_quad,
        // fixed_quad, fixed_triple, fixed_double, gondola, bubble_chair,
        // tram, surface, magic_carpet}. Update logic in lockstep.
        if (liftReq === "gondola" && (t.gondola ?? 0) < 1) return false;
        if (liftReq === "tram" && (t.tram ?? 0) < 1) return false;
        if (liftReq === "highspeed") {
          const hs = (t.high_speed_six ?? 0) + (t.high_speed_quad ?? 0);
          if (hs < 1) return false;
        }
        if (liftReq === "nosurface") {
          // exclude resorts where surface lifts / carpets are the
          // ONLY uphill option. Aerial = anything that's not surface
          // or magic_carpet.
          const aerial =
            (t.high_speed_six ?? 0) +
            (t.high_speed_quad ?? 0) +
            (t.fixed_quad ?? 0) +
            (t.fixed_triple ?? 0) +
            (t.fixed_double ?? 0) +
            (t.gondola ?? 0) +
            (t.tram ?? 0) +
            (t.bubble_chair ?? 0);
          if (aerial < 1) return false;
        }
      }
      // Stage 4 — amenity / snow-feature filters. Strict semantics:
      // NULL on the column fails the filter (matches size pattern).
      if (lessonsOnly && r.has_lessons !== true) return false;
      if (rentalsOnly && r.has_rentals !== true) return false;
      if (lodgingOnly && r.has_lodging_on_mountain !== true) return false;
      if (tubingOnly && r.has_tubing !== true) return false;
      if (xcOnly && r.has_xc_skiing !== true) return false;
      if (backcountryOnly && r.has_backcountry_access !== true) return false;
      if (terrainparkOnly && r.has_terrain_park !== true) return false;
      if (webcamOnly && !(r.webcam_url && r.webcam_url.trim() !== "")) {
        return false;
      }
      if (familyOnly && !matchesFamily(r)) return false;
      if (expertOnly && !matchesExpert(r)) return false;
      if (adaptiveOnly && !matchesAdaptive(r)) return false;
      if (surfaceFilter.length > 0 && !matchesSurface(r)) return false;
      if (snowmakeMin > 0) {
        if (r.snowmaking_pct == null || r.snowmaking_pct < snowmakeMin) {
          return false;
        }
      }
      if (withinHours > 0) {
        const dt = driveTimeByResort.get(r.id)?.get(origin.name);
        if (!dt || dt.duration_seconds > withinHours * 3600) return false;
      }
      if (!matchesAirport(r)) return false;
      return true;
    });
    // matchesAirport closes over airportFilter; depending on
    // airportFilter is enough for memoization correctness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resorts,
    featuredOnly,
    passFilter,
    nightOnly,
    freshSnowOnly,
    openNowOnly,
    liftReq,
    lessonsOnly,
    rentalsOnly,
    lodgingOnly,
    tubingOnly,
    xcOnly,
    backcountryOnly,
    terrainparkOnly,
    webcamOnly,
    familyOnly,
    expertOnly,
    adaptiveOnly,
    surfaceFilter,
    snowmakeMin,
    withinHours,
    origin,
    driveTimeByResort,
    airportFilter,
  ]);

  const filtered = useMemo(() => {
    return filteredIgnoringSize.filter((r) => matchesSizeFilter(r.vertical_drop, sizeFilter));
  }, [filteredIgnoringSize, sizeFilter]);

  // Stage 5 round 2 — touch perf. User reported filter taps feel slow.
  // Root cause: every filter change triggers a router.replace → URL
  // updates → MapPage rerenders → MapView re-emits GeoJSON → Mapbox
  // re-clusters 425 pins synchronously. Even cheap toggles read
  // janky. Fix: keep URL update synchronous (so the checkbox visual
  // updates immediately and stays in sync), but defer the array we
  // hand to the map. useDeferredValue lets React paint the new
  // checkbox state first, then re-compute the map cluster in a
  // lower-priority pass. The deferred value lags one render behind
  // the source when work is heavy — exactly the perceptual win we
  // want (UI feels instant, map catches up). React 19 / Next 16. */}
  const filteredForMap = useDeferredValue(filtered);

  // Pool offered to the trip-planner picker: every active filter
  // EXCEPT pass. The picker has its own pass-chip row inside the
  // dialog, so a multi-pass owner can scope to "Ikon + Epic" for the
  // current pick without disrupting the map filter behind. We still
  // honor drive cap / size / night / featured because those are about
  // whether the user can actually get to / use the resort.
  const filteredForPicker = useMemo(() => {
    return resorts.filter((r) => {
      if (featuredOnly && r.tier !== "featured") return false;
      if (nightOnly && !r.has_night_skiing) return false;
      if (freshSnowOnly && !(r.snow_new_24h_in != null && r.snow_new_24h_in > 0)) {
        return false;
      }
      if (openNowOnly && r.currently_open !== true) return false;
      // Stage 4 — apply all new amenity / snow / lift filters to the
      // trip-planner picker pool as well, so a user who narrowed the
      // map by e.g. "lessons + tubing" sees the same candidates in
      // the planner picker. Pass is still intentionally NOT applied
      // here (planner has its own pass-chip row inside the dialog).
      if (liftReq) {
        const t = r.lift_types;
        if (!t) return false;
        if (liftReq === "gondola" && (t.gondola ?? 0) < 1) return false;
        if (liftReq === "tram" && (t.tram ?? 0) < 1) return false;
        if (liftReq === "highspeed") {
          const hs = (t.high_speed_six ?? 0) + (t.high_speed_quad ?? 0);
          if (hs < 1) return false;
        }
        if (liftReq === "nosurface") {
          const aerial =
            (t.high_speed_six ?? 0) +
            (t.high_speed_quad ?? 0) +
            (t.fixed_quad ?? 0) +
            (t.fixed_triple ?? 0) +
            (t.fixed_double ?? 0) +
            (t.gondola ?? 0) +
            (t.tram ?? 0) +
            (t.bubble_chair ?? 0);
          if (aerial < 1) return false;
        }
      }
      if (lessonsOnly && r.has_lessons !== true) return false;
      if (rentalsOnly && r.has_rentals !== true) return false;
      if (lodgingOnly && r.has_lodging_on_mountain !== true) return false;
      if (tubingOnly && r.has_tubing !== true) return false;
      if (xcOnly && r.has_xc_skiing !== true) return false;
      if (backcountryOnly && r.has_backcountry_access !== true) return false;
      if (terrainparkOnly && r.has_terrain_park !== true) return false;
      if (webcamOnly && !(r.webcam_url && r.webcam_url.trim() !== "")) {
        return false;
      }
      if (familyOnly && !matchesFamily(r)) return false;
      if (expertOnly && !matchesExpert(r)) return false;
      if (adaptiveOnly && !matchesAdaptive(r)) return false;
      if (surfaceFilter.length > 0 && !matchesSurface(r)) return false;
      if (snowmakeMin > 0) {
        if (r.snowmaking_pct == null || r.snowmaking_pct < snowmakeMin) {
          return false;
        }
      }
      if (withinHours > 0) {
        const dt = driveTimeByResort.get(r.id)?.get(origin.name);
        if (!dt || dt.duration_seconds > withinHours * 3600) return false;
      }
      if (!matchesSizeFilter(r.vertical_drop, sizeFilter)) return false;
      if (!matchesAirport(r)) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resorts,
    featuredOnly,
    nightOnly,
    freshSnowOnly,
    openNowOnly,
    liftReq,
    lessonsOnly,
    rentalsOnly,
    lodgingOnly,
    tubingOnly,
    xcOnly,
    backcountryOnly,
    terrainparkOnly,
    webcamOnly,
    familyOnly,
    expertOnly,
    adaptiveOnly,
    surfaceFilter,
    snowmakeMin,
    withinHours,
    origin,
    driveTimeByResort,
    sizeFilter,
    airportFilter,
  ]);

  // Open Now count — drives whether the chip surfaces in the
  // FilterBar (no chip if 0 resorts qualify).
  const openNowCount = useMemo(
    () => resorts.filter((r) => r.currently_open === true).length,
    [resorts],
  );

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

  // Stage 21.4 — dropped `startTransition()` around router.replace.
  // The transition wrapper marked URL writes as low-priority, which on
  // a phone meant filter taps felt laggy (the user saw the chip toggle
  // ~150-300ms after tapping). Replace runs synchronously now so the
  // checkbox visual + map re-filter happen in the same paint.
  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
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
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
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
    router.replace("?", { scroll: false });
  }

  // Resolve the currently-selected resort once per render (not in click
  // handler) so the panel always reflects the latest data — e.g. drive-time
  // updates when the user changes the From-city filter.
  const selectedResort = useMemo(
    () => (selectedId == null ? null : resorts.find((r) => r.id === selectedId) ?? null),
    [selectedId, resorts],
  );

  // Stage 5 round 2 — lock the viewport scroll on the map route only.
  // MapPage fills `h-dvh` already, but the global legal footer in
  // app/layout.tsx still sat below the map and let users scroll past
  // it. We toggle a `route-map` class on <body> while MapPage is
  // mounted; globals.css uses it to hide the layout footer and set
  // body { overflow: hidden }. On unmount (navigating away to /early,
  // /pro, /account, /resort/[slug], etc.) the class is removed and
  // those routes get their normal scroll + footer back.
  useEffect(() => {
    document.body.classList.add("route-map");
    return () => {
      document.body.classList.remove("route-map");
    };
  }, []);

  // ESC key closes the panel — keyboard parity with the X button.
  useEffect(() => {
    if (selectedId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  // Recently-viewed strip dispatches OPEN_RESORT_EVENT when the user
  // taps a chip. Catch it here and re-use the existing selectedId +
  // cameraTarget machinery to fly to the pin and open the panel —
  // same UX path as picking from the header search.
  useEffect(() => {
    function onOpenResort(e: Event) {
      const ce = e as CustomEvent<OpenResortDetail>;
      const detail = ce.detail;
      if (!detail || typeof detail.id !== "number") return;
      openResort(detail.id);
      setCameraTarget({
        lat: detail.lat,
        lng: detail.lng,
        token: `recent-${Date.now()}`,
      });
    }
    window.addEventListener(OPEN_RESORT_EVENT, onOpenResort);
    return () => window.removeEventListener(OPEN_RESORT_EVENT, onOpenResort);
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <header
        className="absolute inset-x-0 top-0 z-10 md:border-b md:border-wn-charcoal/10 md:bg-white/95 md:backdrop-blur-sm"
        // User feedback (post-Round-5 install): the +8px bump felt like
        // the header was floating too far below the iOS status bar.
        // Reverted to bare env(safe-area-inset-top) so the button row
        // sits snug under the iOS clock/battery — no extra gap. The
        // FiltersDrawer + /resort/[slug] hero keep their +12px padding
        // because those views don't have the same "search pill +
        // tappable row" affordance directly below the status bar.
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between gap-1.5 px-2 pt-3 sm:gap-2 sm:px-6">
          <div className="flex items-baseline gap-3">
            {/* Brand pill — gets its own bg on mobile (header is transparent
                there for a Google-Maps-style float), inherits the solid
                header bg on desktop. Slightly smaller on mobile so the
                button row to its right has more breathing room — 6 pills
                + logo otherwise wrap into a second line on iPhone widths. */}
            <span className="rounded-md bg-white/90 px-1.5 py-0.5 text-lg font-extrabold tracking-tight text-wn-navy shadow-sm backdrop-blur-sm sm:px-2 sm:text-xl md:bg-transparent md:px-0 md:py-0 md:shadow-none md:backdrop-blur-none">
              Wynla
            </span>
            <span className="hidden text-xs text-wn-charcoal/50 sm:inline">
              Plan smart. Ride better.
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Stage 21.3 — mobile header buttons are all same-size
                icon-only square pills. Plan-a-trip is navy (primary
                action), others are white pills. Desktop keeps text
                labels (`sm:` reveals them). */}
            {/* Header-level resort search. Click → opens the same
                ResortPicker the planner uses, but seeded with the
                origin so results are sorted by drive time. */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-wn-charcoal/20 bg-white px-2 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95 sm:px-3"
              title="Search resorts"
              aria-label="Search resorts"
            >
              <span aria-hidden="true">🔍</span>
              <span className="hidden sm:inline">Search</span>
            </button>
            {/* Stage 4 — "Plan a trip" + "My trips" moved into the
                AuthButton dropdown for signed-in users (keeps the
                header less crowded). Anonymous visitors still need a
                discoverable entry to the planner, so we surface a
                single "Plan a trip" CTA that bounces them through
                /login (and back to /?plan=1) — preserves the funnel
                without ever showing a useless "My trips" link to
                someone who has none. */}
            {!isAuthed && (
              <Link
                href="/login?next=/?plan=1"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-wn-navy px-2 text-xs font-semibold text-white shadow-sm transition hover:bg-wn-navy/90 active:scale-95 sm:px-3"
                title="Plan a multi-day ski trip"
                aria-label="Plan a trip"
              >
                <span aria-hidden="true">🗺️</span>
                <span className="hidden sm:inline">Plan a trip</span>
              </Link>
            )}
            {/* Mobile-only Filters trigger. */}
            {(() => {
              const activeFilterCount =
                passFilter.length +
                (withinHours > 0 ? 1 : 0) +
                (sizeFilter ? 1 : 0) +
                (nightOnly ? 1 : 0) +
                (airportFilter ? 1 : 0) +
                (origin.kind === "geo" ? 1 : 0) +
                // Stage 4 — new filters add to the badge count so users
                // can see at a glance how many filters are stacked.
                (freshSnowOnly ? 1 : 0) +
                (openNowOnly ? 1 : 0) +
                (liftReq ? 1 : 0) +
                (lessonsOnly ? 1 : 0) +
                (rentalsOnly ? 1 : 0) +
                (lodgingOnly ? 1 : 0) +
                (tubingOnly ? 1 : 0) +
                (xcOnly ? 1 : 0) +
                (backcountryOnly ? 1 : 0) +
                (terrainparkOnly ? 1 : 0) +
                (webcamOnly ? 1 : 0) +
                (familyOnly ? 1 : 0) +
                (expertOnly ? 1 : 0) +
                (adaptiveOnly ? 1 : 0) +
                (surfaceFilter.length > 0 ? 1 : 0) +
                (snowmakeMin > 0 ? 1 : 0);
              return (
                <button
                  type="button"
                  onClick={() => setFiltersOpen(true)}
                  className="relative inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-wn-charcoal/20 bg-white px-2 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95 md:hidden"
                  title="Filters"
                  aria-label={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
                >
                  <span aria-hidden="true" className="text-base leading-none">☰</span>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wn-navy px-1 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              );
            })()}
            {/* Deals — desktop only. Sits between My trips and Pro so
                users can pop over to the season-pass tracker while
                browsing the map. Mobile placement lives in the
                FiltersDrawer footer to keep the header minimal. */}
            <Link
              href="/deals"
              className="hidden h-11 items-center justify-center gap-1.5 rounded-md border border-wn-charcoal/20 bg-white px-3 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95 sm:inline-flex"
              title="Season pass deals"
              aria-label="Pass deals"
            >
              <span aria-hidden="true">🎟️</span>
              <span>Deals</span>
            </Link>
            {/* Stage 8 — Guides + Lists SEO surfaces. Desktop-only nav
                entries; mobile users reach them via the FiltersDrawer
                footer "More" section. */}
            <Link
              href="/guides"
              className="hidden h-11 items-center justify-center gap-1.5 rounded-md border border-wn-charcoal/20 bg-white px-3 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95 lg:inline-flex"
              title="Editorial guides"
              aria-label="Guides"
            >
              <span aria-hidden="true">📖</span>
              <span>Guides</span>
            </Link>
            <Link
              href="/lists"
              className="hidden h-11 items-center justify-center gap-1.5 rounded-md border border-wn-charcoal/20 bg-white px-3 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95 lg:inline-flex"
              title="Curated lists"
              aria-label="Curated lists"
            >
              <span aria-hidden="true">⭐</span>
              <span>Lists</span>
            </Link>
            {/* Stage 35 — Pro badge. ProBadge client island swaps between
                "✨ Pro · Free trial" (free / anon) and "💎 Pro" (subscribed)
                so paying users see the badge they paid for and free users
                see the trial nudge. */}
            <ProBadge />
            <AuthButton />
          </div>
        </div>
        {/* Mobile-only quick pass-filter chips. Doubles as the pass
            legend (chip color = pin color) which used to be desktop-only
            in the bottom-right legend card. Hidden on md+. */}
        <MobileQuickFilters
          passFilter={passFilter}
          passCounts={passCounts}
          onPassChange={(passes) =>
            updateParam("pass", passes.length === 0 ? null : passes.join(","))
          }
        />
        {/* Stage 33 — both the off-season banner and the recently-viewed
            chips hide when the user is actively searching or planning
            (searchOpen / plannerOpen). They're "ambient" UI for the
            idle-map state; while the user is focused on picking a
            resort or building a trip those rows just push the map down
            and add noise. Show them again the moment those flows close. */}
        {/* Stage 4 — most-personal-context first. RecentlyViewedStrip
            (which returns null when empty, so no clutter for new
            users) sits ABOVE the promotional OffSeasonBanner. Hidden
            entirely while the user is searching or planning. */}
        {!searchOpen && !plannerOpen && (
          <>
            <RecentlyViewedStrip />
            <OffSeasonBanner />
          </>
        )}
        {/* Stage 35 — Pro benefits / status card. Free users see a
            "Try Pro · 7 days free" pitch with 3 bullet benefits; Pro
            users see a "You're a Pro" confirmation with their unlocked
            features. Dismissable (free: re-appears in 14d; Pro: stays
            dismissed). Hidden while a flow is active. */}
        <ProBenefitsCard hidden={searchOpen || plannerOpen} />
        {/* Inline filter pills row — desktop only. Mobile uses the
            single ☰ Filters button above + FiltersDrawer below. */}
        <div className="hidden md:block">
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
            onPassChange={(passes) =>
              updateParam("pass", passes.length === 0 ? null : passes.join(","))
            }
            onFromCity={handleFromCity}
            onFromGeo={handleFromGeo}
            onWithinChange={(w) => updateParam("within", w)}
            onDaysChange={(d) => updateParam("days", d > 1 ? String(d) : null)}
            onSizeChange={(s) => updateParam("size", s)}
            onNightChange={(v) => updateParam("night", v ? "1" : null)}
            onClearAll={clearAll}
          />
        </div>
      </header>


      <MapView
        resorts={filteredForMap}
        originName={origin.name}
        driveTimeByResort={driveTimeByResort}
        selectedId={selectedId}
        onMapLoaded={handleMapLoaded}
        // Stage 33 — freeze map interaction whenever a full-bleed
        // overlay is on screen. Without this, vertical scrolls inside
        // the filter drawer / search picker leak through to Mapbox's
        // pan handler. ResortPanel + Planner stay interactive because
        // they're partial-height bottom sheets where users still want
        // to see and pan the map behind.
        interactionDisabled={searchOpen || filtersOpen}
        userLocation={
          origin.kind === "geo" ? { lat: origin.lat, lng: origin.lon } : null
        }
        onResortClick={(id) => {
          // While the trip planner's picker is open, route pin
          // clicks through to handlePicked — let the user build a
          // trip from the map. Otherwise fall through to the normal
          // "open the resort panel" behavior.
          const pickHandler = mapPickHandlerRef.current;
          if (pickHandler) {
            const r = resorts.find((c) => c.id === id);
            if (r) pickHandler(r.slug);
            return;
          }
          openResort(id);
        }}
        tripRoute={tripRoute ?? undefined}
        cameraTarget={cameraTarget}
        tripResortIds={tripResortIds}
        previewLeg={previewLeg}
        fitTripVersion={fitTripVersion}
        airportMarker={activeAirport}
      />

      <AlaskaInset resorts={filteredForMap} />

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
          activeAirport={activeAirport}
          onClose={() => setSelectedId(null)}
        />
      )}

      <TripPlannerPanel
        open={plannerOpen}
        origin={origin}
        candidates={filteredForPicker}
        allResorts={resorts}
        onMapPickHandlerChange={handleMapPickHandlerChange}
        days={Math.max(1, days)}
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
        // Stage 33 final — let the trip-planner picker open the
        // FiltersDrawer stacked on top (bypassing mutex). Same UX as
        // header search: refine candidates by pass/conditions/etc
        // without leaving the planner.
        onOpenFilters={() => setFiltersOpenRaw(true)}
        activeFilterCount={
          passFilter.length +
          (sizeFilter ? 1 : 0) +
          (nightOnly ? 1 : 0) +
          (withinHours > 0 ? 1 : 0) +
          (airportFilter ? 1 : 0) +
          (freshSnowOnly ? 1 : 0) +
          // Stage 4 — comprehensive filter expansion counted here too.
          (openNowOnly ? 1 : 0) +
          (liftReq ? 1 : 0) +
          (lessonsOnly ? 1 : 0) +
          (rentalsOnly ? 1 : 0) +
          (lodgingOnly ? 1 : 0) +
          (tubingOnly ? 1 : 0) +
          (xcOnly ? 1 : 0) +
          (backcountryOnly ? 1 : 0) +
          (terrainparkOnly ? 1 : 0) +
          (webcamOnly ? 1 : 0) +
          (familyOnly ? 1 : 0) +
          (expertOnly ? 1 : 0) +
          (adaptiveOnly ? 1 : 0) +
          (surfaceFilter.length > 0 ? 1 : 0) +
          (snowmakeMin > 0 ? 1 : 0)
        }
      />

      {/* Header search modal — re-uses the planner's ResortPicker.
          Selecting a resort flies the camera + opens its panel. We pass
          the active filter set (not all 451) so a user who's narrowed
          down by Pass / Size / Night / Drive sees only those resorts. */}
      <ResortPicker
        open={searchOpen}
        title="Find a resort"
        // Stage 33 — header search uses full-screen picker (mobile).
        // Map isn't relevant while typing a name; full-screen avoids
        // the "map peeks through but is frozen" UX bug.
        fullScreen
        // Stage 33 — let users open the filter drawer ON TOP of the
        // search picker without closing search. Bypasses the
        // mutually-exclusive `setFiltersOpen` wrapper that kills
        // search; we want both open with filter stacked above.
        onOpenFilters={() => setFiltersOpenRaw(true)}
        // Stage 33 — count of "other" filters set (size, night,
        // drive, airport). Pass chips + fresh snow live inline in
        // the picker so they're not counted; this badge represents
        // only the filters that require opening the drawer to see.
        activeFilterCount={
          (sizeFilter ? 1 : 0) +
          (nightOnly ? 1 : 0) +
          (withinHours > 0 ? 1 : 0) +
          (airportFilter ? 1 : 0) +
          // Stage 4 — new filters surface in the search-picker badge.
          (openNowOnly ? 1 : 0) +
          (liftReq ? 1 : 0) +
          (lessonsOnly ? 1 : 0) +
          (rentalsOnly ? 1 : 0) +
          (lodgingOnly ? 1 : 0) +
          (tubingOnly ? 1 : 0) +
          (xcOnly ? 1 : 0) +
          (backcountryOnly ? 1 : 0) +
          (terrainparkOnly ? 1 : 0) +
          (webcamOnly ? 1 : 0) +
          (familyOnly ? 1 : 0) +
          (expertOnly ? 1 : 0) +
          (adaptiveOnly ? 1 : 0) +
          (surfaceFilter.length > 0 ? 1 : 0) +
          (snowmakeMin > 0 ? 1 : 0)
        }
        fromPoint={{ lat: origin.lat, lng: origin.lon, label: origin.kind === "geo" ? "your location" : origin.name }}
        allResorts={filtered}
        alreadyPicked={[]}
        onSelect={(slug) => {
          const r = resorts.find((c) => c.slug === slug);
          if (r) {
            openResort(r.id);
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

      {/* Floating "use my location" pill — replaces Stage 19's GeoBanner.
          Always discoverable on mobile, doesn't occlude the map. */}
      <LocationButton
        isUsingGeo={origin.kind === "geo"}
        onUseMyLocation={handleFromGeo}
      />

      {/* Inaugural Season — Floating feedback pill at the bottom-left
          corner (mirror of LocationButton). Tap opens a modal that
          POSTs to /api/feedback. */}
      <FeedbackButton />

      {/* Compare CTA — fixed pill bottom-center (mobile) / bottom-left
          (desktop). Renders only when the localStorage list has ≥2.
          Routes to /compare?ids=… (RecentlyViewedStrip moved into the
          header above so it stacks inline on mobile instead of
          absolute-overlapping the off-season banner / quick filters.) */}
      <CompareFloatingButton />

      {/* Stage 21.2 — mobile filters drawer. Triggered by the ☰ Filters
          button in the header. All filter controls in one bottom sheet,
          so the header stays minimal and the map gets the full screen.
          Stage 21.3 — Trip-type / city dropdowns removed (planner owns
          trip length; ZIP + geo cover origin precisely enough). */}
      <FiltersDrawer
        open={filtersOpen}
        passFilter={passFilter}
        passCounts={passCounts}
        onPassChange={(passes) =>
          updateParam("pass", passes.length === 0 ? null : passes.join(","))
        }
        withinHours={withinHours}
        sizeFilter={sizeFilter}
        nightOnly={nightOnly}
        airportFilter={airportFilter}
        filteredCount={filtered.length}
        totalCount={resorts.length}
        freshSnowOnly={freshSnowOnly}
        freshSnowCount={resorts.filter(
          (r) => r.snow_new_24h_in != null && r.snow_new_24h_in > 0,
        ).length}
        // Inaugural Season 2026 — Snow today filter. surfaceCount is the
        // total number of resorts the weather cron has classified today;
        // FiltersDrawer hides the "Snow today" section entirely when 0.
        surfaceFilter={surfaceFilter}
        surfaceCount={resorts.filter((r) => r.current_surface_class != null).length}
        onSurfaceChange={(codes) =>
          updateParam("surface", codes.length === 0 ? null : codes.join(","))
        }
        // Stage 4 — Best-for expansion: Expert + Adaptive composites
        // alongside the existing Family Mountain checkbox. (Powder
        // dropped Stage 5 round 2 — historical snowfall was misleading
        // vs real-time PP/PPC surface forecast.)
        expertOnly={expertOnly}
        onExpertChange={(v) => updateParam("expert", v ? "1" : null)}
        adaptiveOnly={adaptiveOnly}
        onAdaptiveChange={(v) => updateParam("adaptive", v ? "1" : null)}
        // Stage 4 — new filter state + handlers wired through. Each
        // boolean → updateParam(key, on ? "1" : null). snowmakeMin is
        // an integer 0-100 stored as a string (null when 0). (Snowboards
        // filter dropped Stage 5 round 2 — only 3 US resorts ban them.)
        openNowOnly={openNowOnly}
        openNowCount={openNowCount}
        onOpenNowChange={(v) => updateParam("open", v ? "1" : null)}
        terrainparkOnly={terrainparkOnly}
        onTerrainparkChange={(v) => updateParam("terrainpark", v ? "1" : null)}
        tubingOnly={tubingOnly}
        onTubingChange={(v) => updateParam("tubing", v ? "1" : null)}
        xcOnly={xcOnly}
        onXcChange={(v) => updateParam("xc", v ? "1" : null)}
        backcountryOnly={backcountryOnly}
        onBackcountryChange={(v) => updateParam("backcountry", v ? "1" : null)}
        lessonsOnly={lessonsOnly}
        onLessonsChange={(v) => updateParam("lessons", v ? "1" : null)}
        rentalsOnly={rentalsOnly}
        onRentalsChange={(v) => updateParam("rentals", v ? "1" : null)}
        lodgingOnly={lodgingOnly}
        onLodgingChange={(v) => updateParam("lodging", v ? "1" : null)}
        webcamOnly={webcamOnly}
        onWebcamChange={(v) => updateParam("webcam", v ? "1" : null)}
        familyOnly={familyOnly}
        onFamilyChange={(v) => updateParam("family", v ? "1" : null)}
        liftReq={liftReq}
        onLiftReqChange={(v) => updateParam("lift", v)}
        snowmakeMin={snowmakeMin}
        onSnowmakeMinChange={(n) => updateParam("snowmake", n > 0 ? String(n) : null)}
        onWithinChange={(w) => updateParam("within", w)}
        onSizeChange={(s) => updateParam("size", s)}
        onNightChange={(v) => updateParam("night", v ? "1" : null)}
        onAirportChange={(iata) => {
          updateParam("airport", iata);
          // Stage 33 — fly the map camera to the picked airport so
          // the user immediately sees its surrounding resorts. Skips
          // when iata is null (filter cleared) — leave the map where
          // it was.
          if (iata) {
            const a = AIRPORT_OPTIONS.find((opt) => opt.iata === iata);
            if (a) {
              setCameraTarget({
                lat: a.lat,
                lng: a.lng,
                token: `airport-${a.iata}-${Date.now()}`,
              });
            }
          }
        }}
        onFreshSnowChange={(v) => updateParam("freshsnow", v ? "1" : null)}
        onClearAll={clearAll}
        onClose={() => setFiltersOpen(false)}
      />

      {/* OnboardingCard removed (Round 5 polish). First-time users
          land directly on the full map — no questions asked. */}

      {/* Branded splash overlay — covers the entire map area while
          Mapbox library + tiles boot. Only shows on first mount; the
          handleMapLoaded callback fires from MapView once Mapbox emits
          its `load` event, and an 8s safety timeout hides the overlay
          even if Mapbox never loads (missing token, network error).
          Pointer-events flip to none during the fade so users can
          interact with the map underneath the moment it's ready. */}
      <div
        aria-hidden={!splashVisible}
        className={[
          "absolute inset-0 z-[60] flex flex-col items-center justify-center bg-wn-navy",
          "transition-opacity duration-500 ease-out",
          splashVisible
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        ].join(" ")}
      >
        <div className="flex flex-col items-center px-6 text-center">
          <span className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl">
            Wynla
          </span>
          <span className="mt-2 text-sm font-medium text-white/70 sm:text-base">
            Plan smart. Ride better.
          </span>
          <span className="mt-6 inline-flex h-1.5 w-24 overflow-hidden rounded-full bg-white/15">
            <span className="h-full w-full origin-left animate-[wynla-splash-bar_1.4s_ease-in-out_infinite] bg-white/70" />
          </span>
        </div>
        <style>{`
          @keyframes wynla-splash-bar {
            0%   { transform: translateX(-100%); }
            50%  { transform: translateX(0%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>


      {/* Pass color legend — desktop only. On mobile, the same info
          is already conveyed by the active-filter chips and the pin
          dot colors, so we save the screen real estate. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden justify-center px-4 pb-4 md:flex sm:justify-end sm:pr-6">
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
