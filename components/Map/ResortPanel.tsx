"use client";

import { useEffect, useRef, useState } from "react";
// useEffect/useState used by the matrix-driven drive-time refinement;
// useRef + the snap state below drive the mobile bottom-sheet drag.
import Link from "next/link";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { fetchMatrixDriveTime, type MatrixResult } from "@/lib/mapboxMatrix";
import { parseSeasonDates } from "@/lib/seasonDates";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import CompareToggle from "@/components/CompareToggle";
import SeasonCountdown from "@/components/SeasonCountdown";
import { addRecent } from "@/lib/recentlyViewed";
import type { Resort, DriveTime, WeatherSnapshot } from "./MapPage";
import NearbyRestaurants from "@/components/NearbyRestaurants";
import NearbyActivities from "@/components/NearbyActivities";
import { fetchNearbyRestaurants, fetchNearbyActivities } from "@/lib/fetchNearby";
import type { NearbyRow } from "@/lib/nearbyCategories";

type Props = {
  resort: Resort;
  driveTime: DriveTime | undefined;
  origin: Origin;
  weather: WeatherSnapshot | null;
  /** Round 5 polish — when ?airport=XXX is active, MapPage passes the
   *  picked airport's coordinates + label so the panel can show
   *  "✈ ~XX min from <city> (<IATA>)" alongside the existing
   *  drive-from-origin time. Null when no airport filter is set. */
  activeAirport?: { lat: number; lng: number; label: string; iata: string } | null;
  onClose: () => void;
};

export default function ResortPanel({
  resort,
  driveTime,
  origin,
  weather,
  activeAirport,
  onClose,
}: Props) {
  const lng = Number(resort.longitude);
  const lat = Number(resort.latitude);

  // Typographic hero — pass-color gradient instead of imagery. All resorts
  // get equal visual treatment regardless of tier. Primary pass drives the
  // gradient hue (matches the pin color on the map for visual continuity).
  const primary = primaryPass(resort.passes);
  const heroBg = passColor(primary);

  // Phase B: when the origin is the user's geolocation the initial drive
  // time is a Haversine ESTIMATE. We upgrade it to a Mapbox Matrix exact
  // value once the panel opens. The state is keyed on resort.id + origin
  // signature so stale results from a previous pin are ignored without
  // having to call setState synchronously inside the effect.
  type MatrixState = {
    key: string;
    result: MatrixResult;
  };
  const matrixKey = `${resort.id}|${origin.kind}|${origin.lat.toFixed(5)}|${origin.lon.toFixed(5)}`;
  const [matrixState, setMatrixState] = useState<MatrixState | null>(null);
  const matrixResult = matrixState?.key === matrixKey ? matrixState.result : null;
  useEffect(() => {
    if (origin.kind !== "geo") return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    const ctrl = new AbortController();
    fetchMatrixDriveTime({ lat: origin.lat, lng: origin.lon }, { lat, lng }, token, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted || !res) return;
        setMatrixState({ key: matrixKey, result: res });
      });
    return () => ctrl.abort();
  }, [matrixKey, lat, lng, origin]);

  // Record this resort in the localStorage "recently viewed" list so
  // the homepage strip can show it next time. We push the minimum
  // projection needed to render the chip + drive the camera flyTo
  // (id, slug, name, primary pass for the color dot, lat/lng).
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    addRecent({
      id: resort.id,
      slug: resort.slug,
      name: resort.name,
      primary_pass: primary,
      lat,
      lng,
    });
  }, [resort.id, resort.slug, resort.name, primary, lat, lng]);

  // Round 5 polish — when the airport filter is active, compute a
  // Haversine-based drive time from the airport to the resort so the
  // panel can show "✈ ~XX min from Denver (DEN)" alongside the
  // existing origin drive. We use estimateDriveSeconds (the same
  // 1.2× / 60 mph model used everywhere else in the app) so the
  // number is consistent with the rest of the planner. Null when no
  // airport is active or the resort lacks coordinates.
  const airportDriveText = (() => {
    if (!activeAirport) return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const meters = haversineMeters(activeAirport.lat, activeAirport.lng, lat, lng);
    const seconds = estimateDriveSeconds(meters);
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `~${minutes} min`;
    return formatDriveTime(seconds);
  })();

  // Pick the best drive-time data we have for display.
  const isEstimate = matrixResult ? false : driveTime?.is_estimate ?? false;
  const displayDurationSeconds = matrixResult?.durationSeconds ?? driveTime?.duration_seconds ?? null;
  const displayDistanceMeters =
    matrixResult?.distanceMeters ?? driveTime?.distance_meters ?? null;
  const driveText =
    displayDurationSeconds != null ? formatDriveTime(displayDurationSeconds) : null;
  const distanceMiles =
    displayDistanceMeters != null
      ? Math.round(displayDistanceMeters / 1609.34)
      : null;
  const originShort = origin.kind === "geo" ? "your location" : origin.short;

  // Mobile bottom-sheet snap state — half (default, ~50vh) or full
  // (85vh). No scrim on mobile so the map stays pannable behind. User
  // can drag the handle up/down between snaps, or X out to close. On
  // desktop this state is unused (the panel is a fixed right rail).
  type Snap = "half" | "full";
  const [snap, setSnap] = useState<Snap>("half");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [vh, setVh] = useState(800);
  const [isMobile, setIsMobile] = useState(false);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      setVh(window.innerHeight);
      setIsMobile(window.matchMedia("(max-width: 767px)").matches);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  function snapToPx(s: Snap) {
    return Math.round(vh * (s === "half" ? 0.5 : 0.85));
  }
  function nearestSnap(px: number): Snap {
    return Math.abs(px - snapToPx("half")) < Math.abs(px - snapToPx("full"))
      ? "half"
      : "full";
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!isMobile) return;
    const t = e.touches[0];
    dragRef.current = {
      startY: t.clientY,
      startHeight: dragHeight ?? snapToPx(snap),
    };
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    const t = e.touches[0];
    const dy = dragRef.current.startY - t.clientY;
    const proposed = dragRef.current.startHeight + dy;
    // Allow drag below half so the user can flick down to close.
    setDragHeight(Math.max(80, Math.min(vh * 0.95, proposed)));
  }
  function handleTouchEnd() {
    if (!dragRef.current) return;
    const finalH = dragHeight ?? snapToPx(snap);
    // Drag-down past half closes the panel — common bottom-sheet UX.
    if (finalH < snapToPx("half") - 80) {
      onClose();
    } else {
      setSnap(nearestSnap(finalH));
    }
    setDragHeight(null);
    dragRef.current = null;
  }

  const sheetHeight = isMobile ? (dragHeight ?? snapToPx(snap)) : undefined;

  // Stage 33 — stop touch propagation at both React + DOM layers.
  // Mapbox attaches its drag/pan listener at window/document level, so
  // React.stopPropagation alone wasn't enough; stopImmediatePropagation
  // on the native event keeps the panel's body from triggering a map
  // pan when the user scrolls the 3-stat card or taps the CTA.
  const stopTouchBubble = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <>
      {/* No mobile scrim — Stage 21. Map stays fully pannable behind
          the resort detail card so the user can keep exploring while
          reading. Tap the X (top-right of card) or flick the sheet
          down to close. */}
      <aside
        role="complementary"
        aria-label={`${resort.name} details`}
        onTouchStart={stopTouchBubble}
        onTouchMove={stopTouchBubble}
        onTouchEnd={stopTouchBubble}
        className={[
          "fixed z-40 flex flex-col bg-white shadow-2xl",
          // mobile bottom sheet — slides up from bottom on open
          "inset-x-0 bottom-0 rounded-t-2xl",
          "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          // desktop right side panel — slides in from right
          "md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[380px] md:max-h-none md:rounded-none",
          "md:animate-[slideLeft_220ms_cubic-bezier(0.16,1,0.3,1)]",
        ].join(" ")}
        style={{
          height: sheetHeight != null ? `${sheetHeight}px` : undefined,
          transition:
            dragHeight !== null
              ? "none"
              : "height 220ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Mobile drag handle — touch handlers attached so the user
            can resize between half/full or flick down to close. */}
        <div
          className="flex shrink-0 cursor-grab justify-center py-2 active:cursor-grabbing md:hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        >
          <div className="h-1 w-10 rounded-full bg-wn-charcoal/25" />
        </div>

        {/* Hero — vetted winter photo (hero_image_url) when present, else
            the designed gradient fallback. */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${heroBg} 0%, #1E2952 100%)`,
          }}
        >
          {resort.hero_image_url && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resort.hero_image_url}
                alt={resort.hero_image_alt ?? `${resort.name} in winter`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(15,21,48,0.35) 0%, rgba(15,21,48,0.15) 40%, rgba(15,21,48,0.8) 100%)",
                }}
              />
            </>
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.85'/></svg>\")",
              backgroundSize: "160px 160px",
            }}
          />
          <div className="relative h-32 px-4 pt-4 pb-3 md:h-36">
            {/* Top-right: Compare + Favorite + Close */}
            <div className="absolute right-3 top-3 flex items-center gap-2 z-10">
              <CompareToggle resortId={resort.id} />
              <FavoriteToggle resortId={resort.id} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-wn-navy shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>

            {/* Title block bottom-left */}
            <div className="absolute inset-x-4 bottom-3">
              <h2 className="text-2xl font-extrabold leading-tight text-white drop-shadow-md sm:text-3xl">
                {resort.name}
              </h2>
              <p className="mt-0.5 text-xs text-white/90 drop-shadow">
                {resort.state}
                {resort.region ? " · " + resort.region : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Body — stat preview + nearby strips. Must scroll: the Round-9
            NearbyInPanel adds restaurant/activity rows that overflow the
            half-snap sheet, so this is overflow-y-auto (was overflow-hidden,
            which clipped everything below the fold). pan-y keeps the vertical
            scroll inside the panel instead of leaking to the Mapbox canvas. */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3" style={{ touchAction: "pan-y" }}>
          {/* Pass badges row */}
          {resort.passes?.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {resort.passes.map((p) => (
                <span
                  key={p}
                  className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: passColor(p) }}
                >
                  {passLabel(p)}
                </span>
              ))}
            </div>
          )}

          {/* Season-status badge — small countdown sitting just above
              the 3-stat grid. Hidden when both season fields are
              unparseable (status "unknown") to keep the preview tight. */}
          {(() => {
            const seasonInfo = parseSeasonDates(
              resort.season_open_text,
              resort.season_close_text,
            );
            if (seasonInfo.status === "unknown") return null;
            return (
              <div className="mb-3">
                <SeasonCountdown info={seasonInfo} variant="badge" />
              </div>
            );
          })()}

          {/* 3-stat compact card: weather / drive / [smart slot 3].
              Slot 3 is context-aware — see pickSlot3() below. Priority:
              fresh snow > % open > vertical drop > trail count. The
              point is to surface the single most decision-relevant
              number at a glance, not a fixed "size" stat. */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-wn-charcoal/10 bg-white p-3">
            <CompactStat
              emoji={weatherEmoji(weather?.conditions_short)}
              label={weather?.conditions_short ?? "Weather"}
              value={
                weather?.temp_high_f != null
                  ? `${weather.temp_high_f}°F`
                  : "—"
              }
            />
            <CompactStat
              emoji="🚗"
              label={`from ${originShort}`}
              value={driveText ? `${isEstimate ? "≈ " : ""}${driveText}` : "—"}
            />
            {(() => {
              const slot3 = pickSlot3(resort);
              return (
                <CompactStat
                  emoji={slot3.emoji}
                  label={slot3.label}
                  value={slot3.value}
                />
              );
            })()}
          </div>

          {/* Round 5 polish — airport drive context. Shows only when
              ?airport=XXX is active. Sits just below the 3-stat card
              alongside the existing "drive from origin" stat so users
              comparing fly-in routes see both numbers at a glance. */}
          {activeAirport && airportDriveText && (
            <p className="mt-2 text-center text-[11px] font-medium text-wn-charcoal/65">
              <span aria-hidden="true">✈ </span>
              {airportDriveText} from {activeAirport.label} ({activeAirport.iata})
            </p>
          )}

          {/* Round 9 (2026-06) — nearby restaurants + off-mountain
              activities. Lazy-loaded from Supabase when the panel
              opens so the homepage SSR payload stays small (we don't
              want to ship 425 resorts × ~30 nearby rows for every
              map mount). Renders nothing while loading or empty. */}
          <NearbyInPanel resortId={resort.id} />
        </div>

        {/* Sticky footer CTA — pad past the iOS home indicator on notched phones */}
        <div
          className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
          <Link
            href={`/resort/${resort.slug}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            View full details
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
// Round 9 (2026-06) — lazy-loads nearby_restaurants + nearby_activities
// for the currently-open panel resort. Keeps the homepage SSR payload
// from ballooning with rows the user may never click through to. The
// compact variant of the shared NearbyGroup cards renders inside the
// panel's scroll surface.
function NearbyInPanel({ resortId }: { resortId: number }) {
  const [restaurants, setRestaurants] = useState<NearbyRow[]>([]);
  const [activities, setActivities] = useState<NearbyRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    // Clear the previous resort's rows immediately so switching panels
    // doesn't render resort A's nearby data under resort B's header.
    setRestaurants([]);
    setActivities([]);
    (async () => {
      const [r, a] = await Promise.all([
        fetchNearbyRestaurants(resortId),
        fetchNearbyActivities(resortId),
      ]);
      if (cancelled) return;
      setRestaurants(r);
      setActivities(a);
    })();
    return () => {
      cancelled = true;
    };
  }, [resortId]);
  if (restaurants.length === 0 && activities.length === 0) return null;
  return (
    <div className="mt-4 border-t border-wn-charcoal/10 pt-3">
      <NearbyRestaurants rows={restaurants} variant="compact" />
      <NearbyActivities rows={activities} variant="compact" />
    </div>
  );
}

function CompactStat({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div className="text-center">
      <div className="text-2xl leading-none" aria-hidden="true">{emoji}</div>
      <div className="mt-1 text-base font-extrabold tracking-tight text-wn-navy">
        {value}
      </div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-wn-charcoal/55 truncate">
        {label}
      </div>
    </div>
  );
}

// Smart slot 3 — picks the single most decision-relevant stat to
// show in the compact preview card. Order of preference:
//   1. ❄️ Fresh snow in last 24h (only when > 0) — emotional + actionable
//   2. 🟢 % terrain open today — actionable, "is it worth the drive?"
//   3. ⛰ Vertical drop — universal size signal that doesn't go stale
//   4. ⛷️ Trail count — fallback when nothing better is known
//
// Slots 1 & 2 light up only when the Stage 26 snow-report cron has
// populated the relevant columns. Until that cron runs (deferred to
// fall 2026), most resorts will fall through to slot 3 (vertical
// drop) which is the meaningful "size" hint we have for almost every
// resort in the catalog.
function pickSlot3(resort: {
  snow_new_24h_in: number | null;
  trails_open_today: number | null;
  total_trails: number | null;
  snow_report_status: string | null;
  vertical_drop: number | null;
}): { emoji: string; label: string; value: string } {
  if (resort.snow_new_24h_in != null && resort.snow_new_24h_in > 0) {
    return {
      emoji: "❄️",
      label: "new (24h)",
      value: `${resort.snow_new_24h_in}"`,
    };
  }
  if (
    resort.snow_report_status === "open" &&
    resort.trails_open_today != null &&
    resort.total_trails != null &&
    resort.total_trails > 0
  ) {
    const pct = Math.round(
      (resort.trails_open_today / resort.total_trails) * 100,
    );
    return {
      emoji: "🟢",
      label: "open today",
      value: `${pct}%`,
    };
  }
  if (resort.vertical_drop != null) {
    return {
      emoji: "⛰",
      label: "vertical",
      value: `${resort.vertical_drop.toLocaleString()} ft`,
    };
  }
  return {
    emoji: "⛷️",
    label: "trails",
    value: resort.total_trails != null ? String(resort.total_trails) : "—",
  };
}

function weatherEmoji(cond: string | null | undefined): string {
  if (!cond) return "🌤️";
  const c = cond.toLowerCase();
  if (c.includes("snow")) return "🌨️";
  if (c.includes("rain") || c.includes("shower")) return "🌧️";
  if (c.includes("thunder")) return "⛈️";
  if (c.includes("cloud")) return "☁️";
  if (c.includes("clear") || c.includes("sun")) return "☀️";
  if (c.includes("fog") || c.includes("mist")) return "🌫️";
  return "🌤️";
}

