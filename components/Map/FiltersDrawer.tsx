"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// Origin import dropped Stage 33 along with the Origin section.
import { PASS_COLORS, PASS_KEYS, PASS_LABELS } from "@/lib/passColors";
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/sizeTier";
import { isGlobalOffSeasonNow } from "@/lib/seasonDates";

type Props = {
  open: boolean;
  // Stage 33 final — Pass filter back in the drawer. The drawer is now
  // the single source of truth for every filter (Pass · Conditions ·
  // Drive · Size · Airport). Map chip strip still exists as a 1-tap
  // shortcut for Pass + as the pin color legend, but those chips and
  // these checkboxes share the same URL state.
  passFilter: string[];
  passCounts: Record<string, number>;
  onPassChange: (passes: string[]) => void;
  withinHours: number;
  sizeFilter: SizeTier | null;
  nightOnly: boolean;
  airportFilter: string | null;
  filteredCount: number;
  totalCount: number;
  freshSnowOnly: boolean;
  freshSnowCount: number;
  onFreshSnowChange: (v: boolean) => void;
  // Inaugural Season 2026 — Snow Surface Forecast filter ("Snow today").
  // Multi-select OR over SANY codes (PP / PPC / MG). Section hides
  // entirely when surfaceCount === 0 (off-season — no classifier output).
  surfaceFilter: string[];
  surfaceCount: number;
  onSurfaceChange: (codes: string[]) => void;
  onWithinChange: (w: string | null) => void;
  onSizeChange: (s: SizeTier | null) => void;
  onNightChange: (v: boolean) => void;
  onAirportChange: (iata: string | null) => void;
  // Stage 4 — comprehensive filter expansion. Status / Snow features /
  // Amenities / Lifts / Snow quality. Every URL param exposed here +
  // in MapPage. Booleans are 1/null in the URL; liftReq is a string;
  // snowmakeMin is an integer 0-100.
  openNowOnly: boolean;
  openNowCount: number;
  onOpenNowChange: (v: boolean) => void;
  terrainparkOnly: boolean;
  onTerrainparkChange: (v: boolean) => void;
  tubingOnly: boolean;
  onTubingChange: (v: boolean) => void;
  xcOnly: boolean;
  onXcChange: (v: boolean) => void;
  backcountryOnly: boolean;
  onBackcountryChange: (v: boolean) => void;
  lessonsOnly: boolean;
  onLessonsChange: (v: boolean) => void;
  rentalsOnly: boolean;
  onRentalsChange: (v: boolean) => void;
  lodgingOnly: boolean;
  onLodgingChange: (v: boolean) => void;
  webcamOnly: boolean;
  onWebcamChange: (v: boolean) => void;
  familyOnly: boolean;
  onFamilyChange: (v: boolean) => void;
  // Stage 4 — Best-for expansion. Each composite filter is a single
  // boolean URL param wired up the same way as familyOnly. (Powder
  // mountain removed in Stage 5 round 2 — historical-snowfall filter
  // was misleading vs real-time Snow today PP/PPC.)
  expertOnly: boolean;
  onExpertChange: (v: boolean) => void;
  adaptiveOnly: boolean;
  onAdaptiveChange: (v: boolean) => void;
  liftReq: string | null;
  onLiftReqChange: (v: string | null) => void;
  snowmakeMin: number;
  onSnowmakeMinChange: (n: number) => void;
  onClearAll: () => void;
  onClose: () => void;
};

// Stage 8 — most-relevant US ski-trip airports. IATA codes match
// resort.closest_airport_iata values stored on each resort. Stage 33
// added lat/lng so MapPage can fly the camera to the picked airport.
export const AIRPORT_OPTIONS: Array<{
  iata: string;
  label: string;
  lat: number;
  lng: number;
}> = [
  { iata: "DEN", label: "Denver", lat: 39.8617, lng: -104.6731 },
  { iata: "SLC", label: "Salt Lake City", lat: 40.7884, lng: -111.9778 },
  { iata: "RNO", label: "Reno", lat: 39.4991, lng: -119.7681 },
  { iata: "BTV", label: "Burlington VT", lat: 44.4717, lng: -73.1533 },
  { iata: "MHT", label: "Manchester NH", lat: 42.9326, lng: -71.4357 },
  { iata: "BOS", label: "Boston", lat: 42.3656, lng: -71.0096 },
  { iata: "JFK", label: "NYC (JFK)", lat: 40.6413, lng: -73.7781 },
  { iata: "LGA", label: "NYC (LGA)", lat: 40.7769, lng: -73.874 },
  { iata: "PHL", label: "Philly", lat: 39.8744, lng: -75.2424 },
  { iata: "ALB", label: "Albany", lat: 42.7483, lng: -73.8017 },
  { iata: "MSP", label: "Minneapolis", lat: 44.8848, lng: -93.2223 },
  { iata: "GEG", label: "Spokane", lat: 47.6199, lng: -117.5339 },
  { iata: "SEA", label: "Seattle", lat: 47.4502, lng: -122.3088 },
  { iata: "MSO", label: "Missoula", lat: 46.9163, lng: -114.0908 },
  { iata: "JAC", label: "Jackson Hole", lat: 43.6073, lng: -110.7377 },
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

// Stage 4 — lift-filter options. Maps the four supported ?lift URL
// values (gondola | tram | highspeed | nosurface) plus an "Any" entry
// that clears the param. Ordered most-permissive → most-specific so
// users scan the row top-to-bottom from broad to narrow.
const LIFT_OPTIONS: Array<{
  value: string | null;
  label: string;
  icon: string;
}> = [
  { value: null, label: "Any", icon: "" },
  { value: "gondola", label: "Gondola", icon: "🚡" },
  { value: "tram", label: "Aerial tram", icon: "🚠" },
  { value: "highspeed", label: "High-speed chair", icon: "⚡" },
  { value: "nosurface", label: "No surface-only", icon: "🚫" },
];

function liftLabel(v: string | null): string | null {
  if (!v) return null;
  return LIFT_OPTIONS.find((o) => o.value === v)?.label ?? null;
}

export default function FiltersDrawer({
  open,
  passFilter,
  passCounts,
  onPassChange,
  withinHours,
  sizeFilter,
  nightOnly,
  airportFilter,
  filteredCount,
  totalCount,
  freshSnowOnly,
  freshSnowCount,
  onFreshSnowChange,
  surfaceFilter,
  surfaceCount,
  onSurfaceChange,
  onWithinChange,
  onSizeChange,
  onNightChange,
  onAirportChange,
  openNowOnly,
  openNowCount,
  onOpenNowChange,
  terrainparkOnly,
  onTerrainparkChange,
  tubingOnly,
  onTubingChange,
  xcOnly,
  onXcChange,
  backcountryOnly,
  onBackcountryChange,
  lessonsOnly,
  onLessonsChange,
  rentalsOnly,
  onRentalsChange,
  lodgingOnly,
  onLodgingChange,
  webcamOnly,
  onWebcamChange,
  familyOnly,
  onFamilyChange,
  expertOnly,
  onExpertChange,
  adaptiveOnly,
  onAdaptiveChange,
  liftReq,
  onLiftReqChange,
  snowmakeMin,
  onSnowmakeMinChange,
  onClearAll,
  onClose,
}: Props) {
  function togglePass(key: string) {
    if (passFilter.includes(key)) {
      onPassChange(passFilter.filter((p) => p !== key));
    } else {
      onPassChange([...passFilter, key]);
    }
  }
  const [customHours, setCustomHours] = useState<string>(
    withinHours > 0 && !DRIVE_TIME_PRESETS.includes(withinHours)
      ? String(withinHours)
      : "",
  );
  // Stage 33 — airport search box. Filters the AIRPORT_OPTIONS list as
  // the user types so the section is browsable for non-USA travellers
  // who don't know the IATA codes off-hand.
  const [airportQuery, setAirportQuery] = useState("");

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function commitCustomDrive() {
    const n = Number(customHours);
    if (Number.isFinite(n) && n > 0 && n <= 24) {
      onWithinChange(String(Math.round(n)));
    } else if (customHours.trim() === "") {
      onWithinChange(null);
    }
  }

  if (!open) return null;

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
        aria-modal="true"
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
        {/* Drag handle — mobile only. Still tappable as a secondary
            close path (iOS users instinctively reach for it on bottom-
            sheets), but it's not relied on as the primary affordance
            because PR #34's "hidden ×, drag-handle does it" test
            failed the discoverability bar — Saitarn's 21:46 follow-up
            screenshot showed her hunting for a close and not finding
            one. The labeled "✕ Close" pill in the header below is the
            real visible affordance now. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close filters"
          className="flex shrink-0 cursor-pointer justify-center py-2 md:hidden"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-wn-charcoal/25" />
        </button>

        <header
          className="relative shrink-0 border-b border-wn-charcoal/10 bg-white px-4 pb-3 md:pt-4"
          // User feedback (post-Round-5 install): on iPhone PWA, the
          // drawer header sat too close to the iOS status bar — the
          // close button nearly touched the battery icon. Add safe-area
          // padding + 12px breathing room so the header clears the
          // status bar comfortably on any device. md:pt-4 still applies
          // on desktop where env(safe-area-inset-top) is 0.
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
        >
          {/* Top-right close. Desktop = compact circular ×. Mobile =
              labeled "✕ Close" pill so the affordance is obvious even
              to users who've never seen iOS bottom-sheet drag handles
              (Saitarn's 21:46 PWA screenshot proved the hidden-×
              variant from PR #34 was undiscoverable). The pill is
              44×44 effective hit target — within thumb reach on
              normal phones, a noticeable stretch on Pro Max, BUT
              users now SEE there's a way out, and the footer "Done"
              button is the easy-reach primary close anyway. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="absolute right-2 top-2 inline-flex h-11 items-center gap-1.5 rounded-full bg-wn-offwhite px-3 text-sm font-semibold text-wn-charcoal transition hover:bg-wn-charcoal/10 md:right-2 md:top-2 md:h-11 md:w-11 md:justify-center md:gap-0 md:px-0 md:text-xl"
          >
            <span aria-hidden="true" className="text-lg leading-none md:text-xl">×</span>
            <span className="md:hidden">Close</span>
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
          {/* PASS — Stage 33 final. Drawer is now the single source of
              truth for every filter; map chip strip remains as a
              1-tap shortcut + color legend but state-wise they're the
              same. Pass section sits at the very top because it's
              the most-used filter and matches the top-of-list mental
              model from desktop FilterBar. */}
          {/* Pass section is the single most-used filter — open by
              default so users see chips immediately on drawer open
              instead of a wall of collapsed headers. */}
          <Section
            title="Pass"
            defaultOpen
            summary={
              passFilter.length === 0
                ? "Any pass"
                : passFilter
                    .map(
                      (p) =>
                        PASS_LABELS[p as keyof typeof PASS_LABELS] ?? p,
                    )
                    .join(" · ")
            }
          >
            <div className="grid grid-cols-1 gap-1">
              {PASS_KEYS.map((key) => {
                const isActive = passFilter.includes(key);
                const count = passCounts[key] ?? 0;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePass(key)}
                    aria-pressed={isActive}
                    className={[
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition",
                      isActive
                        ? "border-wn-navy bg-wn-navy/5"
                        : "border-wn-charcoal/15 bg-white hover:border-wn-charcoal/30",
                    ].join(" ")}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                        isActive
                          ? "border-wn-navy bg-wn-navy text-white"
                          : "border-wn-charcoal/30 bg-white"
                      }`}
                      aria-hidden="true"
                    >
                      {isActive && (
                        <svg
                          viewBox="0 0 12 12"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path
                            d="M2 6.5L5 9.5L10 3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: PASS_COLORS[key] }}
                      aria-hidden="true"
                    />
                    <span className="flex-1 font-semibold text-wn-charcoal">
                      {PASS_LABELS[key]}
                    </span>
                    <span className="text-xs text-wn-charcoal/55">{count}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* CONDITIONS TODAY — Stage 5 round 2. Merges the old "Snow
              today" surface forecast (PP / PPC / MG) into this section
              because both answer the same question: "what's the
              mountain doing RIGHT NOW?". Night skiing moved OUT to
              Terrain & snow (it's a permanent feature, not a current
              condition). Order top→bottom matches importance: Open
              gates everything; fresh-snow + surface forecast are
              today-only refinements. */}
          <Section
            title="Conditions today"
            summary={(() => {
              const parts: string[] = [];
              if (openNowOnly) parts.push("🟢 Open");
              if (freshSnowOnly) parts.push("❄️ Fresh snow");
              if (surfaceFilter.includes("PP")) parts.push("🌨 Powder");
              if (surfaceFilter.includes("PPC")) parts.push("🏔 Packed");
              if (surfaceFilter.includes("MG")) parts.push("〰️ Groomed");
              return parts.length > 0 ? parts.join(" · ") : "Any conditions";
            })()}
          >
            <div className="grid grid-cols-1 gap-1.5">
              {/* 1. Currently open this season. Hidden when 0 resorts
                  qualify (deep off-season) so users don't dead-end. */}
              {openNowCount > 0 && (
                <FilterCheckbox
                  icon="🟢"
                  label="Currently open this season"
                  active={openNowOnly}
                  onToggle={() => onOpenNowChange(!openNowOnly)}
                  count={openNowCount}
                />
              )}
              {/* 2. Fresh snow (24h) — hidden during May-Oct off-season
                  window because resorts with fresh snow are all closed
                  then so the filter just dead-ends users. */}
              {!isGlobalOffSeasonNow() && freshSnowCount > 0 && (
                <FilterCheckbox
                  icon="❄️"
                  label="Fresh snow (24h)"
                  active={freshSnowOnly}
                  onToggle={() => onFreshSnowChange?.(!freshSnowOnly)}
                  count={freshSnowCount}
                />
              )}
              {/* 3-5. SANY surface forecast classes — Round 5 polish:
                  these are MUTUALLY EXCLUSIVE radio buttons. A resort's
                  surface class is a single SANY code at any given
                  time, so checkboxes that let users pick "PP AND PPC"
                  were nonsense. Now: tap a chip to set it, tap again
                  to clear ("Any"). The URL param stays ?surface=PP
                  (single value, not a comma list). Icons chosen to
                  NOT collide visually with the ❄️ "fresh snow" above. */}
              {surfaceCount > 0 && (
                <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="Snow surface today">
                  {[
                    { code: "PP",  icon: "🌨️", label: "Fresh powder" },
                    { code: "PPC", icon: "🏔",  label: "Packed powder" },
                    { code: "MG",  icon: "〰️", label: "Groomed" },
                  ].map(({ code, icon, label }) => {
                    const active = surfaceFilter[0] === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() =>
                          onSurfaceChange(active ? [] : [code])
                        }
                        className={[
                          "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition",
                          active
                            ? "border-wn-navy bg-wn-navy text-white"
                            : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40",
                        ].join(" ")}
                      >
                        <span className="text-base leading-none" aria-hidden="true">{icon}</span>
                        <span className="text-center leading-tight">{label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {surfaceCount > 0 && (
              <p className="mt-2 px-1 text-[10.5px] leading-snug text-wn-charcoal/55">
                Pick one surface type — these are mutually exclusive
                (a resort can&apos;t be both fresh powder AND packed at
                the same time). Tap the active chip to clear.
              </p>
            )}
          </Section>

          {/* Stage 33 — ORIGIN section removed from drawer. The
              onboarding wizard already collects origin once (Use my
              location OR a city), and the floating LocationButton at
              the bottom-right of the map lets users opt into geo at
              any time. Surfacing the picker again here was redundant
              and added clutter. ZIP-code entry is dropped along with
              it; if users need to change origin they can either tap
              the floating geo button or clear browser data to
              re-onboard. */}

          {/* DRIVE TIME (DAY 1) */}
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
            {/* Stage 33 — airport picker rebuilt as a searchable
                vertical list. Horizontal chips required the user to
                already know the IATA; the list makes scanning easier
                and the search box covers travellers who type the
                city name. Selecting an airport ALSO flies the map
                camera to it (handled in MapPage via the airport URL
                param). */}
            <input
              type="search"
              placeholder="Search airports… (Denver, DEN, etc.)"
              value={airportQuery}
              onChange={(e) => setAirportQuery(e.target.value)}
              // 16px so iOS doesn't auto-zoom on focus.
              style={{ fontSize: "16px" }}
              className="mb-2 w-full rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
            />
            <div className="max-h-[280px] overflow-y-auto rounded-lg border border-wn-charcoal/10 bg-white">
              <button
                type="button"
                onClick={() => onAirportChange(null)}
                aria-pressed={airportFilter === null}
                className={`flex w-full items-center gap-2 border-b border-wn-charcoal/10 px-3 py-2 text-left text-sm font-semibold transition ${
                  airportFilter === null
                    ? "bg-wn-navy/5 text-wn-navy"
                    : "text-wn-charcoal hover:bg-wn-charcoal/5"
                }`}
              >
                <span aria-hidden="true" className="text-base">✈️</span>
                <span className="flex-1">Any airport</span>
                {airportFilter === null && (
                  <span aria-hidden="true" className="text-wn-navy">✓</span>
                )}
              </button>
              {AIRPORT_OPTIONS.filter((a) => {
                const q = airportQuery.trim().toLowerCase();
                if (!q) return true;
                return (
                  a.iata.toLowerCase().includes(q) ||
                  a.label.toLowerCase().includes(q)
                );
              }).map((a) => {
                const active = airportFilter === a.iata;
                return (
                  <button
                    key={a.iata}
                    type="button"
                    onClick={() =>
                      onAirportChange(active ? null : a.iata)
                    }
                    aria-pressed={active}
                    className={`flex w-full items-center gap-2 border-b border-wn-charcoal/10 px-3 py-2 text-left text-sm font-semibold transition last:border-b-0 ${
                      active
                        ? "bg-wn-navy/5 text-wn-navy"
                        : "text-wn-charcoal hover:bg-wn-charcoal/5"
                    }`}
                  >
                    <span className="font-mono text-xs font-bold text-wn-charcoal/60">{a.iata}</span>
                    <span className="flex-1 truncate">{a.label}</span>
                    {active && (
                      <span aria-hidden="true" className="text-wn-navy">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* STATUS section retired in Stage 5 reorg — Open-now toggle
              now lives at the top of Conditions today so all
              "what's it doing right now" controls live together. */}

          {/* BEST FOR — composite "personality" filters. Each one is a
              shortcut for a multi-attribute check that's tedious to
              dial in by hand. Stage 5 round 2 dropped Powder Mountain
              (historical-snowfall was misleading — a "powder mountain"
              can still be icy today, so real-time Snow today PP/PPC is
              the right filter for powder lovers). Family / Expert /
              Adaptive all consistently answer "this resort is good for
              [user type]". */}
          <Section
            title="Best for"
            summary={(() => {
              const parts: string[] = [];
              if (familyOnly) parts.push("👨‍👩‍👧‍👦 Family");
              if (expertOnly) parts.push("🏔 Expert");
              if (adaptiveOnly) parts.push("♿ Adaptive");
              return parts.length > 0 ? parts.join(" · ") : "Any";
            })()}
          >
            <div className="grid grid-cols-1 gap-1.5">
              <FilterCheckbox
                icon="👨‍👩‍👧‍👦"
                label="Family mountain"
                active={familyOnly}
                onToggle={() => onFamilyChange(!familyOnly)}
              />
              <FilterCheckbox
                icon="🏔"
                label="Expert mountain"
                active={expertOnly}
                onToggle={() => onExpertChange(!expertOnly)}
                title="≥30% expert terrain + ≥2000 ft vertical"
              />
              <FilterCheckbox
                icon="♿"
                label="Adaptive program"
                active={adaptiveOnly}
                onToggle={() => onAdaptiveChange(!adaptiveOnly)}
                title="Has certified adaptive ski school"
              />
            </div>
            <p className="mt-2 px-1 text-[10.5px] leading-snug text-wn-charcoal/55">
              Family = ski school + rentals + ≥25% beginner terrain (or a
              magic carpet). Expert = ≥30% expert terrain &amp; ≥2000 ft
              vertical. Adaptive = has a certified adaptive ski school.
            </p>
          </Section>

          {/* TERRAIN & SNOW — Stage 5 round 2. Holds every "permanent
              feature of the mountain" filter: terrain types (park /
              tubing / XC / backcountry), night skiing (moved here from
              Conditions today since it's an infrastructure feature, not
              a today-thing), and the snowmaking-percent preset row.
              "Allows snowboards" filter was dropped — only 3 US resorts
              ban snowboards, dead weight for 99% of users. */}
          <Section
            title="Terrain & snow"
            summary={
              [
                terrainparkOnly ? "⛷ Terrain park" : null,
                tubingOnly ? "🛷 Tubing" : null,
                xcOnly ? "⛷ XC" : null,
                backcountryOnly ? "🏔 Backcountry" : null,
                nightOnly ? "🌙 Night skiing" : null,
                snowmakeMin > 0 ? `≥ ${snowmakeMin}% snow` : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Any"
            }
          >
            <div className="grid grid-cols-1 gap-1.5">
              <FilterCheckbox
                icon="⛷"
                label="Terrain park"
                active={terrainparkOnly}
                onToggle={() => onTerrainparkChange(!terrainparkOnly)}
                info="Jumps, rails, half-pipes — for freestyle riders"
              />
              <FilterCheckbox
                icon="🛷"
                label="Tubing"
                active={tubingOnly}
                onToggle={() => onTubingChange(!tubingOnly)}
              />
              <FilterCheckbox
                icon="⛷"
                label="XC / Nordic"
                active={xcOnly}
                onToggle={() => onXcChange(!xcOnly)}
                info="Cross-country skiing on flat groomed trails (no chairlifts)"
              />
              <FilterCheckbox
                icon="🏔"
                label="Backcountry"
                active={backcountryOnly}
                onToggle={() => onBackcountryChange(!backcountryOnly)}
                info="Access to ungroomed off-piste terrain"
              />
              <FilterCheckbox
                icon="🌙"
                label="Night skiing"
                active={nightOnly}
                onToggle={() => onNightChange(!nightOnly)}
                info="Lit trails for skiing after dark"
              />
            </div>
            {/* Snowmaking — preset buttons. The 0-100 slider felt too
                granular + slow on touch; 4 fixed thresholds (Any / 25 /
                50 / 75) cover the meaningful decisions (any coverage /
                modest / strong / fully covered). URL param stays
                ?snowmake=N. */}
            <div className="mt-4 rounded-lg border border-wn-charcoal/10 bg-wn-offwhite/40 p-3">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-wn-charcoal/60">
                <span>Minimum snowmaking</span>
                <span className="text-wn-navy">
                  {snowmakeMin > 0 ? `≥ ${snowmakeMin}%` : "Any"}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0, 25, 50, 75].map((threshold) => {
                  const active =
                    threshold === 0 ? snowmakeMin === 0 : snowmakeMin === threshold;
                  return (
                    <button
                      key={threshold}
                      type="button"
                      onClick={() => onSnowmakeMinChange(threshold)}
                      aria-pressed={active}
                      className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                        active
                          ? "border-wn-navy bg-wn-navy text-white"
                          : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                      }`}
                    >
                      {threshold === 0 ? "Any" : `≥ ${threshold}%`}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] leading-tight text-wn-charcoal/55">
                Resorts with higher snowmaking coverage stay open longer
                in lean snow years and have more reliable conditions
                early + late season.
              </p>
            </div>
          </Section>

          {/* AMENITIES — services on the mountain. Distinct from snow
              features because these are services/infrastructure, not
              terrain. */}
          <Section
            title="Amenities"
            summary={
              [
                lessonsOnly ? "🎓 Lessons" : null,
                rentalsOnly ? "🎿 Rentals" : null,
                lodgingOnly ? "🏨 Slopeside" : null,
                webcamOnly ? "📷 Webcam" : null,
              ]
                .filter(Boolean)
                .join(" · ") || "Any"
            }
          >
            <div className="grid grid-cols-2 gap-1.5">
              <FilterCheckbox
                icon="🎓"
                label="Ski / snowboard school"
                active={lessonsOnly}
                onToggle={() => onLessonsChange(!lessonsOnly)}
              />
              <FilterCheckbox
                icon="🎿"
                label="Rentals"
                active={rentalsOnly}
                onToggle={() => onRentalsChange(!rentalsOnly)}
              />
              <FilterCheckbox
                icon="🏨"
                label="Slopeside lodging"
                active={lodgingOnly}
                onToggle={() => onLodgingChange(!lodgingOnly)}
              />
              <FilterCheckbox
                icon="📷"
                label="Live webcam"
                active={webcamOnly}
                onToggle={() => onWebcamChange(!webcamOnly)}
              />
            </div>
          </Section>

          {/* LIFTS — single-select radio matching the existing ?lift
              URL param. "Any" clears the filter; the other four match
              the four supported liftReq values in MapPage. */}
          <Section
            title="Lifts"
            summary={liftLabel(liftReq) ?? "Any"}
          >
            <div className="grid grid-cols-2 gap-1.5">
              {LIFT_OPTIONS.map((opt) => {
                const active =
                  opt.value === null ? liftReq === null : liftReq === opt.value;
                return (
                  <button
                    key={opt.value ?? "any"}
                    type="button"
                    onClick={() => onLiftReqChange(opt.value)}
                    aria-pressed={active}
                    className={[
                      "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition",
                      active
                        ? "border-wn-navy bg-wn-navy text-white"
                        : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40",
                    ].join(" ")}
                  >
                    {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* SNOW QUALITY section retired in Stage 5 reorg — the
              snowmaking-percent slider now lives at the bottom of
              "Terrain & snow" so all snow-related controls cluster
              together. */}

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

        <footer
          className="flex shrink-0 items-center gap-2 border-t border-wn-charcoal/10 bg-white px-4 py-3"
          style={{
            // Clear iPhone home indicator so the navy "Done" button isn't
            // clipped by the gesture area.
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClearAll();
              setCustomHours("");
              setAirportQuery("");
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

// Stage 4 — reusable checkbox-in-a-row for Snow features + Amenities
// sections. Visual matches the Pass section checkboxes (square box,
// emoji icon, label, optional count badge) but more compact. Stage 5
// round 2 added an `info` subtitle below the label — used for filters
// whose name isn't self-explanatory (Terrain park, XC/Nordic, etc).
function FilterCheckbox({
  icon,
  label,
  active,
  onToggle,
  count,
  title,
  info,
}: {
  icon: string;
  label: string;
  active: boolean;
  onToggle: () => void;
  count?: number;
  /** Optional tooltip — used by the Best-for composite filters to
   *  explain the threshold (">350 in/yr", "≥30% expert", etc) without
   *  cluttering the label itself. */
  title?: string;
  /** Optional inline subtitle rendered below the label. Use for
   *  filter names that are jargon-y ("Terrain park", "XC / Nordic")
   *  so first-time users get a one-line gloss. Skip on self-evident
   *  labels (Tubing, Night skiing). */
  info?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      title={title}
      className={[
        "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition",
        active
          ? "border-wn-navy bg-wn-navy/5"
          : "border-wn-charcoal/15 bg-white hover:border-wn-charcoal/30",
      ].join(" ")}
    >
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
          active
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/30 bg-white"
        }`}
        aria-hidden="true"
      >
        {active && (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              d="M2 6.5L5 9.5L10 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span aria-hidden="true" className="mt-0.5 text-sm leading-none">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-wn-charcoal">{label}</span>
        {info && (
          <span className="mt-0.5 block text-[10px] font-normal leading-tight text-wn-charcoal/55">
            {info}
          </span>
        )}
      </span>
      {count != null && count > 0 && (
        <span
          className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active
              ? "bg-wn-navy text-white"
              : "bg-wn-charcoal/10 text-wn-charcoal/70"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
