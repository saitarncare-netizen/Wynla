"use client";

import { useEffect, useRef, useState } from "react";
// useEffect/useState used by the matrix-driven drive-time refinement;
// useRef + the snap state below drive the mobile bottom-sheet drag.
import Link from "next/link";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { fetchMatrixDriveTime, type MatrixResult } from "@/lib/mapboxMatrix";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import type { Resort, DriveTime, WeatherSnapshot } from "./MapPage";

type Props = {
  resort: Resort;
  driveTime: DriveTime | undefined;
  origin: Origin;
  weather: WeatherSnapshot | null;
  onClose: () => void;
};

export default function ResortPanel({
  resort,
  driveTime,
  origin,
  weather,
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

  return (
    <>
      {/* No mobile scrim — Stage 21. Map stays fully pannable behind
          the resort detail card so the user can keep exploring while
          reading. Tap the X (top-right of card) or flick the sheet
          down to close. */}
      <aside
        role="complementary"
        aria-label={`${resort.name} details`}
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

        {/* Hero — gradient only for now. Stage 25 collected verified
            winter photo URLs but coverage was 23%, so the inconsistent
            "some have photos, some don't" UX was worse than uniform
            gradient. Data stays in DB (hero_image_url column) for a
            future re-enable when coverage > 70%. */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${heroBg} 0%, #1E2952 100%)`,
          }}
        >
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
            {/* Top-right: Favorite + Close */}
            <div className="absolute right-3 top-3 flex items-center gap-2 z-10">
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

        {/* Compact body — 3-stat preview only. The full panel
            (weather, mountain stats, amenities, airport, ticket,
            lodging) lives at /resort/[slug] now. */}
        <div className="flex-1 overflow-hidden px-4 py-3" style={{ touchAction: "manipulation" }}>
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

          {/* 3-stat compact card: weather / drive / trails */}
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
            <CompactStat
              emoji="⛷️"
              label="Trails"
              value={
                resort.total_trails != null ? String(resort.total_trails) : "—"
              }
            />
          </div>

          {/* Snow report mini-banner if data exists — small chip so users
              know fresh-snow numbers without scrolling. */}
          {(resort.snow_new_24h_in != null && resort.snow_new_24h_in > 0) && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-wn-sky/15 px-2.5 py-1 text-[11px] font-semibold text-wn-navy">
              <span aria-hidden="true">❄️</span>
              <span>{resort.snow_new_24h_in}&quot; new in last 24h</span>
            </div>
          )}
        </div>

        {/* Sticky footer CTA */}
        <div className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
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

