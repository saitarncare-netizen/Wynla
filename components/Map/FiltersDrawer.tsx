"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Origin } from "@/lib/origins";
import { PASS_COLORS, PASS_KEYS, PASS_LABELS } from "@/lib/passColors";
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/sizeTier";

type Props = {
  open: boolean;
  passFilter: string[];
  origin: Origin;
  withinHours: number;
  sizeFilter: SizeTier | null;
  nightOnly: boolean;
  airportFilter: string | null;
  passCounts: Record<string, number>;
  filteredCount: number;
  totalCount: number;
  onPassChange: (passes: string[]) => void;
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
// Desktop still uses FilterBar inline — its pills work fine with the
// extra horizontal space and the dropdown menus.

const DRIVE_TIME_PRESETS = [0, 3, 5, 8, 12];

export default function FiltersDrawer({
  open,
  passFilter,
  origin,
  withinHours,
  sizeFilter,
  nightOnly,
  airportFilter,
  passCounts,
  filteredCount,
  totalCount,
  onPassChange,
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

  function togglePass(key: string) {
    const next = passFilter.includes(key)
      ? passFilter.filter((p) => p !== key)
      : [...passFilter, key];
    onPassChange(next);
  }

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

  return (
    <>
      {/* Backdrop — tap to close. Faint so map behind stays readable. */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="fixed inset-0 z-[55] cursor-default bg-wn-charcoal/35 backdrop-blur-[1px]"
      />

      <aside
        role="dialog"
        aria-label="Filters"
        className={[
          "fixed z-[60] flex flex-col overflow-hidden bg-white shadow-2xl",
          // Mobile: bottom sheet at 85vh
          "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl",
          "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          // Desktop: centered modal at fixed width
          "md:inset-auto md:left-1/2 md:top-12 md:bottom-12 md:max-h-none md:w-[440px] md:-translate-x-1/2 md:rounded-2xl",
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

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3" style={{ touchAction: "pan-y" }}>
          {/* PASS */}
          <Section title="Pass">
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
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M2 6.5L5 9.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
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

          {/* FROM */}
          <Section title="From">
            <button
              type="button"
              onClick={handleUseHere}
              disabled={requestingGeo}
              className={`mb-2 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition disabled:opacity-60 ${
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

          {/* DRIVE TIME */}
          <Section title="Drive time (day 1)">
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

          {/* SIZE */}
          <Section title="Size">
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

          {/* NIGHT SKIING */}
          <Section title="Night skiing">
            <button
              type="button"
              onClick={() => onNightChange(!nightOnly)}
              aria-pressed={nightOnly}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                nightOnly
                  ? "border-wn-navy bg-wn-navy text-white"
                  : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border ${
                  nightOnly
                    ? "border-white bg-white text-wn-navy"
                    : "border-wn-charcoal/30 bg-white"
                }`}
                aria-hidden="true"
              >
                {nightOnly && (
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 6.5L5 9.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span aria-hidden="true">🌙</span>
              <span>Show only night-skiing resorts</span>
            </button>
          </Section>

          {/* AIRPORT — Stage 8. Filters resorts where
              closest_airport_iata matches AND distance ≤ 120 mi (shuttle
              range). Horizontal-scroll chip row to keep the drawer
              compact while exposing all 15 top US ski airports. */}
          <Section title="Closest airport">
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

          {/* Mobile-only entry point for Deals + Stage 8 Guides + Lists.
              Desktop surfaces these in the header; on mobile the header
              is too tight so we surface them here in the FiltersDrawer
              footer area instead. */}
          <Section title="More">
            <div className="grid grid-cols-1 gap-1.5">
              <Link
                href="/deals"
                onClick={onClose}
                className="flex items-center justify-between rounded-lg border border-wn-charcoal/15 bg-white px-3 py-2.5 text-sm font-semibold text-wn-navy transition hover:border-wn-navy"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">🎟️</span>
                  <span>Pass deals</span>
                </span>
                <span aria-hidden="true" className="text-wn-charcoal/40">
                  →
                </span>
              </Link>
              <Link
                href="/guides"
                onClick={onClose}
                className="flex items-center justify-between rounded-lg border border-wn-charcoal/15 bg-white px-3 py-2.5 text-sm font-semibold text-wn-navy transition hover:border-wn-navy"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true">📖</span>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
        {title}
      </h3>
      {children}
    </section>
  );
}
