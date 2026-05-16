"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Origin } from "@/lib/origins";
// PASS_COLORS / PASS_KEYS / PASS_LABELS dropped along with the Pass
// section. Pass selection now lives only in the map-header chip strip.
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/sizeTier";
import { isGlobalOffSeasonNow } from "@/lib/seasonDates";

type Props = {
  open: boolean;
  origin: Origin;
  withinHours: number;
  sizeFilter: SizeTier | null;
  nightOnly: boolean;
  airportFilter: string | null;
  filteredCount: number;
  totalCount: number;
  // Stage 33 — fresh-snow conditions filter, mirrors MobileQuickFilters.
  freshSnowOnly: boolean;
  freshSnowCount: number;
  onFreshSnowChange: (v: boolean) => void;
  onFromGeo: (lat: number, lng: number) => void;
  onWithinChange: (w: string | null) => void;
  onSizeChange: (s: SizeTier | null) => void;
  onNightChange: (v: boolean) => void;
  onAirportChange: (iata: string | null) => void;
  onClearAll: () => void;
  onClose: () => void;
};

// Stage 8 — most-relevant US ski-trip airports. Chips render as a
// horizontal-scroll row to keep the drawer compact. IATA codes match
// resort.closest_airport_iata values stored on each resort.
export const AIRPORT_OPTIONS: Array<{ iata: string; label: string }> = [
  { iata: "DEN", label: "Denver" },
  { iata: "SLC", label: "Salt Lake City" },
  { iata: "RNO", label: "Reno" },
  { iata: "BTV", label: "Burlington VT" },
  { iata: "MHT", label: "Manchester NH" },
  { iata: "BOS", label: "Boston" },
  { iata: "JFK", label: "NYC (JFK)" },
  { iata: "LGA", label: "NYC (LGA)" },
  { iata: "PHL", label: "Philly" },
  { iata: "ALB", label: "Albany" },
  { iata: "MSP", label: "Minneapolis" },
  { iata: "GEG", label: "Spokane" },
  { iata: "SEA", label: "Seattle" },
  { iata: "MSO", label: "Missoula" },
  { iata: "JAC", label: "Jackson Hole" },
];

// Stage 21.2 — single drawer that replaces the row of FilterBar pills
// on mobile. All filter controls live inside a bottom sheet that the
// user opens via the ☰ Filters button on the map header. Filters
// apply live (URL updates on every toggle) so the map narrows behind
// the drawer; user taps Done / × / backdrop to close.
//
// Stage 22 — redesigned to group filters into clearly-labeled sections
// with horizontal dividers so the long-scroll feels structured. Each
// section maps to a desktop FilterBar pill cluster: Pass, Conditions,
// Origin, Drive time, Resort size, Airport, More.
//
// Desktop still uses FilterBar inline — its pills work fine with the
// extra horizontal space and the dropdown menus.

const DRIVE_TIME_PRESETS = [0, 3, 5, 8, 12];

export default function FiltersDrawer({
  open,
  origin,
  withinHours,
  sizeFilter,
  nightOnly,
  airportFilter,
  filteredCount,
  totalCount,
  freshSnowOnly,
  freshSnowCount,
  onFreshSnowChange,
  onFromGeo,
  onWithinChange,
  onSizeChange,
  onNightChange,
  onAirportChange,
  onClearAll,
  onClose,
}: Props) {
  const [requestingGeo, setRequestingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [zipInput, setZipInput] = useState("");
  const [resolvingZip, setResolvingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState<string>(
    withinHours > 0 && !DRIVE_TIME_PRESETS.includes(withinHours)
      ? String(withinHours)
      : "",
  );

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleUseHere() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Browser doesn't support location.");
      return;
    }
    setRequestingGeo(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onFromGeo(pos.coords.latitude, pos.coords.longitude);
        setRequestingGeo(false);
      },
      (err) => {
        setRequestingGeo(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permission denied — open iOS Settings → Safari → Location."
            : "Couldn't get your location.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  async function handleZipSubmit() {
    const clean = zipInput.trim();
    if (!/^\d{5}$/.test(clean)) {
      setZipError("Enter a 5-digit US ZIP code.");
      return;
    }
    setResolvingZip(true);
    setZipError(null);
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${clean}`);
      if (!res.ok) {
        setZipError(res.status === 404 ? "ZIP not found." : "Lookup failed.");
        setResolvingZip(false);
        return;
      }
      const data = (await res.json()) as {
        places?: { latitude?: string; longitude?: string }[];
      };
      const place = data.places?.[0];
      const lat = place ? Number(place.latitude) : NaN;
      const lng = place ? Number(place.longitude) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        setZipError("ZIP returned no coordinates.");
        setResolvingZip(false);
        return;
      }
      onFromGeo(lat, lng);
      setResolvingZip(false);
      setZipInput("");
    } catch {
      setResolvingZip(false);
      setZipError("Network error — try again.");
    }
  }

  function commitCustomDrive() {
    const n = Number(customHours);
    if (Number.isFinite(n) && n > 0 && n <= 24) {
      onWithinChange(String(Math.round(n)));
    } else if (customHours.trim() === "") {
      onWithinChange(null);
    }
  }

  if (!open) return null;

  const isGeo = origin.kind === "geo";

  // Stage 22 — stop touch events from bubbling to Mapbox underneath.
  // User-reported bug: swiping inside the drawer panned the map.
  // Stage 33 — stop touch propagation at BOTH React + native DOM
  // layers. Mapbox attaches its drag/pan listener at window/document
  // level, so React.stopPropagation alone is not enough — we have to
  // call nativeEvent.stopImmediatePropagation to keep Mapbox from
  // hijacking vertical drawer scrolls. Reusable pattern for any UI
  // floating over the map.
  const stopTouchBubble = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <>
      {/* Backdrop — desktop only. Mobile drawer is full-screen so the
          backdrop would be hidden behind it anyway. Tap to close on
          desktop where the modal is centered + smaller. */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="fixed inset-0 z-[65] hidden cursor-default bg-wn-charcoal/35 backdrop-blur-[1px] md:block"
      />

      <aside
        role="dialog"
        aria-label="Filters"
        onTouchStart={stopTouchBubble}
        onTouchMove={stopTouchBubble}
        onTouchEnd={stopTouchBubble}
        className={[
          // Stage 33 — z-[70] (was 60) so the drawer stacks ON TOP of
          // the search picker (z-[61]) when opened from inside search.
          // Users can refine by size/night/drive without leaving search.
          "fixed z-[70] flex flex-col overflow-hidden bg-white shadow-2xl",
          // Stage 33 — full-screen on mobile (not a bottom sheet). The
          // bottom-sheet pattern left the top ~15-30% of the viewport
          // showing the dimmed map, and users kept perceiving touches
          // in that strip as "map is panning". Going full-screen
          // removes the map from the viewport entirely so the
          // perception bug can't happen.
          "inset-0 animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          // Desktop: centered modal at fixed width (unchanged).
          "md:inset-auto md:left-1/2 md:top-12 md:bottom-12 md:w-[440px] md:-translate-x-1/2 md:rounded-2xl",
        ].join(" ")}
      >
        {/* Drag handle (mobile only — visual cue, taps go to backdrop) */}
        <div className="flex shrink-0 justify-center pt-2 md:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-wn-charcoal/25" />
        </div>

        <header className="relative shrink-0 border-b border-wn-charcoal/10 bg-white px-4 pb-3 pt-3 md:pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-wn-offwhite text-wn-charcoal transition hover:bg-wn-charcoal/10"
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
          <h2 className="text-base font-extrabold tracking-tight text-wn-navy">
            Filters
          </h2>
          <p className="mt-0.5 text-[11px] text-wn-charcoal/60">
            Showing <strong className="text-wn-navy">{filteredCount}</strong> of {totalCount} resorts
          </p>
        </header>

        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4"
          style={{ touchAction: "pan-y" }}
          onTouchStart={stopTouchBubble}
          onTouchMove={stopTouchBubble}
          onTouchEnd={stopTouchBubble}
        >
          {/* Stage 33 — PASS section dropped from the drawer. The pass
              chips on the map header already provide 1-tap pass toggle
              + colored-dot legend, so duplicating them here was just
              clutter. Drawer keeps the rarer filters (conditions,
              origin, drive time, size, airport) + content links. */}

          {/* CONDITIONS — fresh snow + night skiing as inline toggle pills */}
          <Section
            title="Conditions"
            summary={
              [
                freshSnowOnly ? "❄️ Fresh snow" : null,
                nightOnly ? "🌙 Night skiing" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Any conditions"
            }
          >
            <div className="grid grid-cols-2 gap-1.5">
              {/* Stage 33 — fresh-snow chip hidden during May-Oct
                  off-season window; resorts with fresh snow are all
                  closed/off-season anyway so the filter just dead-ends
                  users. Show during real ski season. */}
              {!isGlobalOffSeasonNow() && (
                <button
                  type="button"
                  onClick={() => onFreshSnowChange?.(!freshSnowOnly)}
                  aria-pressed={freshSnowOnly}
                  disabled={!onFreshSnowChange || freshSnowCount === 0}
                  className={[
                    "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                    freshSnowOnly
                      ? "border-wn-sky bg-wn-sky/10 text-wn-navy"
                      : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40",
                  ].join(" ")}
                >
                  <span aria-hidden="true">❄️</span>
                  <span>Fresh snow</span>
                  {freshSnowCount > 0 && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        freshSnowOnly
                          ? "bg-wn-navy text-white"
                          : "bg-wn-charcoal/10 text-wn-charcoal/70"
                      }`}
                    >
                      {freshSnowCount}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => onNightChange(!nightOnly)}
                aria-pressed={nightOnly}
                className={[
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition",
                  nightOnly
                    ? "border-wn-navy bg-wn-navy text-white"
                    : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40",
                ].join(" ")}
              >
                <span aria-hidden="true">🌙</span>
                <span>Night skiing</span>
              </button>
            </div>
          </Section>

          {/* 3. ORIGIN — geolocation + ZIP lookup */}
          <Section
            title="Origin"
            summary={
              origin.kind === "geo" ? "📍 Your location" : origin.short
            }
          >
            <button
              type="button"
              onClick={handleUseHere}
              disabled={requestingGeo}
              className={`mb-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                isGeo
                  ? "border-wn-navy bg-wn-navy text-white"
                  : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
              }`}
            >
              <span aria-hidden="true">📍</span>
              <span>{requestingGeo ? "Locating…" : isGeo ? "Using your location" : "Use my location"}</span>
              {isGeo && <span className="ml-auto text-[10px] text-white/80">live</span>}
            </button>
            {geoError && (
              <p className="mb-2 text-[11px] leading-tight text-red-700">{geoError}</p>
            )}

            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
              Or enter a US ZIP
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                placeholder="e.g. 80424"
                value={zipInput}
                onChange={(e) => {
                  setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5));
                  if (zipError) setZipError(null);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") handleZipSubmit(); }}
                disabled={resolvingZip}
                className="min-w-0 flex-1 rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-medium text-wn-charcoal placeholder:text-wn-charcoal/35 focus:outline-none focus:ring-2 focus:ring-wn-sky disabled:opacity-60"
                aria-label="ZIP code"
              />
              <button
                type="button"
                onClick={handleZipSubmit}
                disabled={resolvingZip || zipInput.length !== 5}
                className="rounded-lg bg-wn-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-50"
              >
                {resolvingZip ? "…" : "Use"}
              </button>
            </div>
            {zipError && (
              <p className="mt-1 text-[11px] leading-tight text-red-700">{zipError}</p>
            )}
          </Section>

          {/* 4. DRIVE TIME (DAY 1) */}
          <Section
            title="Drive time (day 1)"
            summary={withinHours > 0 ? `≤ ${withinHours}h` : "Any"}
          >
            <div className="grid grid-cols-5 gap-1">
              {DRIVE_TIME_PRESETS.map((h) => {
                const isAny = h === 0;
                const active = isAny ? withinHours === 0 : withinHours === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onWithinChange(isAny ? null : String(h))}
                    aria-pressed={active}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-wn-navy bg-wn-navy text-white"
                        : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                    }`}
                  >
                    {isAny ? "Any" : `≤${h}h`}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                Custom
              </span>
              <input
                type="number"
                min={1}
                max={24}
                step={1}
                placeholder="e.g. 10"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCustomDrive();
                  }
                }}
                className="w-20 rounded-md border border-wn-charcoal/20 bg-white px-2 py-1 text-sm font-medium text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
                aria-label="Custom max drive hours"
              />
              <span className="text-[11px] text-wn-charcoal/55">hrs</span>
              <button
                type="button"
                onClick={commitCustomDrive}
                className="ml-auto rounded-md bg-wn-navy px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-wn-navy/90 active:scale-95"
              >
                Apply
              </button>
            </div>
          </Section>

          {/* 5. RESORT SIZE */}
          <Section
            title="Resort size"
            summary={sizeFilter ? SIZE_TIER_LABELS[sizeFilter] : "Any size"}
          >
            <div className="grid grid-cols-4 gap-1">
              {([null, "small", "medium", "large"] as const).map((tier) => {
                const active = sizeFilter === tier;
                const label = tier === null ? "Any" : SIZE_TIER_LABELS[tier];
                return (
                  <button
                    key={String(tier)}
                    type="button"
                    onClick={() => onSizeChange(tier)}
                    aria-pressed={active}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                      active
                        ? "border-wn-navy bg-wn-navy text-white"
                        : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 6. AIRPORT — Stage 8. Filters resorts where
              closest_airport_iata matches AND distance ≤ 120 mi (shuttle
              range). Horizontal-scroll chip row to keep the drawer
              compact while exposing all 15 top US ski airports. */}
          <Section
            title="Airport"
            summary={
              airportFilter
                ? AIRPORT_OPTIONS.find((a) => a.iata === airportFilter)?.label ??
                  airportFilter
                : "Any airport"
            }
          >
            <div
              className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
              style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
            >
              <button
                type="button"
                onClick={() => onAirportChange(null)}
                aria-pressed={airportFilter === null}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  airportFilter === null
                    ? "border-wn-navy bg-wn-navy text-white"
                    : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                }`}
              >
                Any
              </button>
              {AIRPORT_OPTIONS.map((a) => {
                const active = airportFilter === a.iata;
                return (
                  <button
                    key={a.iata}
                    type="button"
                    onClick={() =>
                      onAirportChange(active ? null : a.iata)
                    }
                    aria-pressed={active}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-wn-navy bg-wn-navy text-white"
                        : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                    }`}
                  >
                    <span className="font-mono">{a.iata}</span>
                    <span className="ml-1 font-normal opacity-80">
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* 7. MORE — Mobile-only entry point for Guides, Lists, Deals.
              Desktop surfaces these in the header; on mobile the header
              is too tight so we surface them here in the FiltersDrawer
              footer area instead. */}
          <Section title="More" last>
            <div className="grid grid-cols-1 gap-1.5">
              <Link
                href="/guides"
                onClick={onClose}
                className="flex items-center justify-between rounded-lg border border-wn-charcoal/15 bg-white px-3 py-2.5 text-sm font-semibold text-wn-navy transition hover:border-wn-navy"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">📚</span>
                  <span>Guides</span>
                </span>
                <span aria-hidden="true" className="text-wn-charcoal/40">
                  →
                </span>
              </Link>
              <Link
                href="/lists"
                onClick={onClose}
                className="flex items-center justify-between rounded-lg border border-wn-charcoal/15 bg-white px-3 py-2.5 text-sm font-semibold text-wn-navy transition hover:border-wn-navy"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">⭐</span>
                  <span>Curated lists</span>
                </span>
                <span aria-hidden="true" className="text-wn-charcoal/40">
                  →
                </span>
              </Link>
              <Link
                href="/deals"
                onClick={onClose}
                className="flex items-center justify-between rounded-lg border border-wn-charcoal/15 bg-white px-3 py-2.5 text-sm font-semibold text-wn-navy transition hover:border-wn-navy"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">🎟</span>
                  <span>Pass deals</span>
                </span>
                <span aria-hidden="true" className="text-wn-charcoal/40">
                  →
                </span>
              </Link>
            </div>
          </Section>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-wn-charcoal/10 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => {
              onClearAll();
              setZipInput("");
              setCustomHours("");
            }}
            className="rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-semibold text-wn-charcoal transition hover:border-wn-charcoal/40"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex flex-1 items-center justify-center rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Done · Show {filteredCount} resort{filteredCount === 1 ? "" : "s"}
          </button>
        </footer>
      </aside>
    </>
  );
}

// Stage 22 — section wrapper. Each section gets a clear uppercase
// heading and a top divider (except the very first one), so the
// Stage 33 — accordion behavior. Every section is collapsed by default;
// the user taps the title row to expand. `summary` renders inline next
// to the chevron when collapsed so active filters are still visible.
// Multiple sections can be open at once.
function Section({
  title,
  children,
  summary,
  defaultOpen = false,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  summary?: string | null;
  defaultOpen?: boolean;
  last?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <section
      className={[
        last ? "" : "border-b border-wn-charcoal/10",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left transition active:bg-wn-charcoal/5"
        aria-expanded={isOpen}
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
            {title}
          </h3>
          {summary && !isOpen && (
            <p className="mt-0.5 truncate text-xs font-semibold text-wn-navy">
              {summary}
            </p>
          )}
        </div>
        <span
          aria-hidden="true"
          className={`shrink-0 text-sm text-wn-charcoal/45 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ▾
        </span>
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </section>
  );
}
