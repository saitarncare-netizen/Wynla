"use client";

// Resort detail for the map: a three-snap bottom sheet on phones
// (ResortSheet.tsx) and a 380 px right rail on desktop, both built from
// the same content pieces in ResortSheetContent.tsx. This file owns the
// data resolution (drive time upgrade, status, tiles) and the snap state.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { passColor, primaryPass } from "@/lib/passColors";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { fetchMatrixDriveTime, type MatrixResult } from "@/lib/mapboxMatrix";
import { resolveSeasonInfo, deriveResortStatus } from "@/lib/seasonDates";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import SeasonCountdown from "@/components/SeasonCountdown";
import { addRecent } from "@/lib/recentlyViewed";
import type { Resort, DriveTime, WeatherSnapshot } from "./MapPage";
import ResortSheet, { type SheetSnap } from "./ResortSheet";
import {
  ActionBar,
  HeroBackdrop,
  HeroStatusPill,
  NearbyInPanel,
  PassChips,
  RailControls,
  StatRow,
  StatusRow,
  buildStatTiles,
  pickKeyStat,
  type DriveDisplay,
} from "./ResortSheetContent";
import { mapBottomPadding, snapHeights } from "./ResortSheetMath";

type Props = {
  resort: Resort;
  driveTime: DriveTime | undefined;
  origin: Origin;
  weather: WeatherSnapshot | null;
  /** When ?airport=XXX is active, the picked airport's coordinates + label
   *  so the panel can show "✈ ~XX min from <city> (<IATA>)" alongside the
   *  drive-from-origin time. Null when no airport is set. */
  activeAirport?: { lat: number; lng: number; label: string; iata: string } | null;
  /** True below md: render the bottom sheet instead of the rail. */
  mobile: boolean;
  /** Snap the sheet is at; MapPage owns it so a map tap can collapse it. */
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Settled sheet height → map padding + the bottom pill stack. */
  onSheetHeightChange?: (height: number | null) => void;
  onPlanTrip: () => void;
  onClose: () => void;
};

export default function ResortPanel({
  resort,
  driveTime,
  origin,
  weather,
  activeAirport,
  mobile,
  snap,
  onSnapChange,
  onSheetHeightChange,
  onPlanTrip,
  onClose,
}: Props) {
  const lng = Number(resort.longitude);
  const lat = Number(resort.latitude);

  // Pass-colour gradient behind the photo (or instead of it). The primary
  // pass drives the hue so the sheet matches the pin the user tapped.
  const primary = primaryPass(resort.passes);
  const heroBg = passColor(primary);

  // When the origin is the user's geolocation the initial drive time is a
  // Haversine ESTIMATE; upgrade it to a Mapbox Matrix value once the panel
  // opens. Keyed on resort + origin so a stale result for a previous pin
  // is ignored.
  type MatrixState = { key: string; result: MatrixResult };
  const matrixKey = `${resort.id}|${origin.kind}|${origin.lat.toFixed(5)}|${origin.lon.toFixed(5)}`;
  const [matrixState, setMatrixState] = useState<MatrixState | null>(null);
  const matrixResult = matrixState?.key === matrixKey ? matrixState.result : null;
  useEffect(() => {
    if (origin.kind !== "geo") return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    const ctrl = new AbortController();
    fetchMatrixDriveTime({ lat: origin.lat, lng: origin.lon }, { lat, lng }, token, ctrl.signal).then((res) => {
      if (ctrl.signal.aborted || !res) return;
      setMatrixState({ key: matrixKey, result: res });
    });
    return () => ctrl.abort();
  }, [matrixKey, lat, lng, origin]);

  // Record the resort in the localStorage "recently viewed" list (the
  // header strip). Minimum projection the chip + camera flyTo need.
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    addRecent({ id: resort.id, slug: resort.slug, name: resort.name, primary_pass: primary, lat, lng });
  }, [resort.id, resort.slug, resort.name, primary, lat, lng]);

  // Airport drive context (Haversine, the same 1.2x / 60 mph model as the
  // planner) — only when ?airport= is active.
  const airportDriveText = (() => {
    if (!activeAirport) return null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const meters = haversineMeters(activeAirport.lat, activeAirport.lng, lat, lng);
    const seconds = estimateDriveSeconds(meters);
    const minutes = Math.max(1, Math.round(seconds / 60));
    if (minutes < 60) return `~${minutes} min`;
    return formatDriveTime(seconds);
  })();

  // Best drive-time data on hand. Beyond ~10 h nobody drives — "35h from
  // NYC" reads as a bug — so those are reframed as fly trips with the
  // distance instead. 10 h splits regional road trips (NYC → VT ≈ 5-6 h)
  // from cross-country flights (NYC → Utah ≈ 28-35 h).
  const drive: DriveDisplay | null = useMemo(() => {
    const seconds = matrixResult?.durationSeconds ?? driveTime?.duration_seconds ?? null;
    if (seconds == null) return null;
    const meters = matrixResult?.distanceMeters ?? driveTime?.distance_meters ?? null;
    const estimate = matrixResult ? false : driveTime?.is_estimate ?? false;
    const originShort = origin.kind === "geo" ? "your location" : origin.short;
    const fly = seconds > 10 * 3600;
    if (fly) {
      const miles = meters != null ? Math.round(meters / 1609.34) : null;
      return {
        value: miles != null ? `${miles.toLocaleString()} mi` : "Fly",
        label: `fly · ${originShort}`,
        estimate,
        fly,
      };
    }
    return { value: formatDriveTime(seconds), label: `from ${originShort}`, estimate, fly };
  }, [matrixResult, driveTime, origin]);

  // Status: the same inputs and helpers as the resort page, so the sheet
  // and the page never disagree. Fields are passed explicitly so a dropped
  // column fails tsc here instead of silently losing a fallback.
  const seasonInfo = useMemo(
    () =>
      resolveSeasonInfo({
        season_open_text: resort.season_open_text,
        season_close_text: resort.season_close_text,
        typical_season_start: resort.typical_season_start,
        typical_season_end: resort.typical_season_end,
      }),
    [resort.season_open_text, resort.season_close_text, resort.typical_season_start, resort.typical_season_end],
  );
  const status = useMemo(
    () =>
      deriveResortStatus(
        {
          currently_open: resort.currently_open,
          snow_report_status: resort.snow_report_status,
          snow_report_updated_at: resort.snow_report_updated_at,
          operating_status: resort.operating_status,
          lifts_open_today: resort.lifts_open_today,
          total_lifts: resort.total_lifts,
          trails_open_today: resort.trails_open_today,
          total_trails: resort.total_trails,
          season_end_date: resort.season_end_date,
        },
        seasonInfo,
      ),
    [resort, seasonInfo],
  );
  // The pill already says "Opens ~Nov 22 · in 61 days" off-season; the
  // countdown adds value only for the in-season "N days left" reading.
  const showCountdown = seasonInfo.status === "in-season" && seasonInfo.nextCloseDate != null;
  const tiles = useMemo(() => buildStatTiles(resort, weather, status), [resort, weather, status]);
  const keyStat = pickKeyStat(resort);

  // Sheet height → parent (map padding + bottom stack). Only settled snaps
  // are forwarded; the in-flight drag would otherwise re-pad the map on
  // every frame.
  const lastSettledRef = useRef<number | null>(null);
  function handleHeightChange(height: number, settled: boolean) {
    if (!settled || !onSheetHeightChange) return;
    if (lastSettledRef.current === height) return;
    lastSettledRef.current = height;
    onSheetHeightChange(height);
  }
  useEffect(() => {
    return () => onSheetHeightChange?.(null);
    // Fire once on unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const driveLine = drive ? (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden="true">{drive.fly ? "✈️" : "🚗"}</span>
      <span>
        {drive.estimate ? "≈ " : ""}
        {drive.value} {drive.label}
      </span>
    </span>
  ) : null;

  const body = (
    <div className="space-y-3 px-4 py-3">
      <StatRow tiles={tiles} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-wn-charcoal/65">
        <span>
          {drive
            ? drive.estimate
              ? "Drive time estimated from straight-line distance"
              : "Drive time from cached road routing"
            : "Drive time unavailable"}
        </span>
        <Link
          href={`/resort/${resort.slug}`}
          className="whitespace-nowrap font-semibold text-wn-navy underline-offset-2 hover:underline"
        >
          Full resort page →
        </Link>
      </div>
      {activeAirport && airportDriveText && (
        <p className="text-[11px] font-medium text-wn-charcoal/65">
          <span aria-hidden="true">✈ </span>
          ≈ {airportDriveText} from {activeAirport.label} ({activeAirport.iata}) · estimated
        </p>
      )}
      <PassChips resort={resort} />
      {showCountdown && (
        <StatusRow status={status} countdown={<SeasonCountdown info={seasonInfo} variant="badge" />} />
      )}
      <NearbyInPanel key={resort.id} resortId={resort.id} slug={resort.slug} />
    </div>
  );

  const actionBar = (
    <ActionBar
      resort={resort}
      lat={lat}
      lng={lng}
      onPlanTrip={onPlanTrip}
      safeArea={mobile}
      // The rail has CompareToggle in its hero (RailControls); the phone
      // sheet's hero has no room for it, so it joins the action bar.
      showCompare={mobile}
    />
  );

  if (mobile) {
    return (
      <ResortSheet
        entryId={resort.id}
        snap={snap}
        onSnapChange={onSnapChange}
        onClose={onClose}
        onHeightChange={handleHeightChange}
        ariaLabel={`${resort.name} details`}
        resetScrollKey={resort.id}
        footer={actionBar}
        renderHero={({ heroHeight, collapsed }) => {
          // Past the midpoint the photo has faded and the strip reads as a
          // white title bar, so the text flips to navy.
          const bar = collapsed > 0.5;
          const fade = 1 - collapsed;
          return (
            <>
              <HeroBackdrop
                resort={resort}
                passHex={heroBg}
                sizes="100vw"
                opacity={fade}
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className={[
                  "absolute right-2 top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full transition",
                  bar ? "text-wn-navy hover:bg-wn-navy/5" : "bg-white/90 text-wn-navy shadow-md backdrop-blur-sm",
                ].join(" ")}
              >
                <span aria-hidden="true" className="text-xl leading-none">×</span>
              </button>
              <div
                className="absolute inset-x-4 bottom-0 flex flex-col justify-end pb-3"
                style={{ height: `${heroHeight}px` }}
              >
                <h2
                  className={[
                    "truncate pr-12 font-extrabold leading-tight tracking-tight transition-colors",
                    bar ? "text-base text-wn-navy" : "text-[22px] text-white drop-shadow-md",
                  ].join(" ")}
                >
                  {resort.name}
                </h2>
                <div style={{ opacity: fade, height: collapsed >= 0.98 ? 0 : undefined, overflow: "hidden" }}>
                  <p className="mt-0.5 truncate text-[11px] text-white/90 drop-shadow">
                    {resort.state}
                    {resort.region ? ` · ${resort.region}` : ""}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 overflow-hidden text-[12px] font-semibold text-white drop-shadow">
                    <HeroStatusPill status={status} />
                    {driveLine}
                    <span className="inline-flex items-center gap-1 whitespace-nowrap">
                      <span aria-hidden="true">{keyStat.emoji}</span>
                      <span>{keyStat.text}</span>
                    </span>
                  </div>
                </div>
              </div>
            </>
          );
        }}
      >
        {body}
      </ResortSheet>
    );
  }

  // Desktop rail. Starts below the header (MapPage publishes its measured
  // height as --wn-header-h) so Sign in / Deals / Guides / Lists stay
  // reachable while a resort is open.
  return (
    <aside
      role="complementary"
      aria-label={`${resort.name} details`}
      className="fixed bottom-0 right-0 z-40 flex w-[380px] flex-col bg-white shadow-2xl animate-[slideLeft_220ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none"
      style={{ top: "var(--wn-header-h, 64px)" }}
    >
      <div className="relative h-40 shrink-0">
        <HeroBackdrop resort={resort} passHex={heroBg} sizes="380px" />
        <RailControls resortId={resort.id} onClose={onClose} />
        <div className="absolute inset-x-4 bottom-3">
          <h2 className="text-2xl font-extrabold leading-tight text-white drop-shadow-md">{resort.name}</h2>
          <p className="mt-0.5 text-xs text-white/90 drop-shadow">
            {resort.state}
            {resort.region ? ` · ${resort.region}` : ""}
          </p>
          <div className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold text-white drop-shadow">
            <HeroStatusPill status={status} />
            {driveLine}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{body}</div>
      {actionBar}
    </aside>
  );
}

/** Height (px) the map should keep clear for a settled sheet height. */
export function sheetMapPadding(height: number, viewportH: number): number {
  return mapBottomPadding(height, snapHeights(viewportH));
}
