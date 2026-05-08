"use client";

import { useEffect, useRef, useState } from "react";
import { ORIGINS, type Origin } from "@/lib/origins";
import { PASS_COLORS, PASS_KEYS, PASS_LABELS } from "@/lib/passColors";
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/sizeTier";

type Props = {
  passFilter: string | null;
  origin: Origin;
  withinHours: number;
  days: number;
  sizeFilter: SizeTier | null;
  nightOnly: boolean;
  passCounts: Record<string, number>;
  hiddenByNullSize: number;
  filteredCount: number;
  totalCount: number;
  onPassChange: (p: string | null) => void;
  onFromCity: (code: string) => void;
  onFromGeo: (lat: number, lng: number) => void;
  onWithinChange: (w: string | null) => void;
  onDaysChange: (d: number) => void;
  onSizeChange: (s: SizeTier | null) => void;
  onNightChange: (v: boolean) => void;
  onOpenPlanner: () => void;
  onClearAll: () => void;
  onOpenDrawer: () => void;
};

// Trip-type presets. "Day trip" caps single-leg drive at 3h and runs
// the same day. "Weekend" / "Big trip" enable the multi-day planner
// where the user picks how many days. The maximum drive cap rises with
// trip length: at 5h for weekend, 6h for big trips, since the user is
// willing to spend more of day 1 driving when there are more days.
type TripKind = "anytime" | "day" | "weekend" | "big";
const TRIP_PRESETS: { kind: TripKind; emoji: string; label: string; within: number; defaultDays: number }[] = [
  { kind: "anytime", emoji: "",   label: "Anytime",  within: 0, defaultDays: 1 },
  { kind: "day",     emoji: "🚗", label: "Day trip", within: 3, defaultDays: 1 },
  { kind: "weekend", emoji: "🏕️", label: "Weekend",  within: 5, defaultDays: 2 },
  { kind: "big",     emoji: "🎿", label: "Big trip", within: 6, defaultDays: 5 },
];

function tripKindFor(within: number, days: number): TripKind {
  if (days >= 4) return "big";
  if (days >= 2) return "weekend";
  if (within > 0) return "day";
  return "anytime";
}

type ActiveChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

export default function FilterBar({
  passFilter,
  origin,
  withinHours,
  days,
  sizeFilter,
  nightOnly,
  passCounts,
  hiddenByNullSize,
  filteredCount,
  totalCount,
  onPassChange,
  onFromCity,
  onFromGeo,
  onWithinChange,
  onDaysChange,
  onSizeChange,
  onNightChange,
  onOpenPlanner,
  onClearAll,
  onOpenDrawer,
}: Props) {
  const totalPass = Object.values(passCounts).reduce((a, b) => a + b, 0);

  // Build active-chip strip from current filter state. Chips render in a
  // stable order so the strip doesn't shuffle as users add/remove.
  const tripKind = tripKindFor(withinHours, days);
  const tripPreset = TRIP_PRESETS.find((p) => p.kind === tripKind) ?? TRIP_PRESETS[0];
  const tripActive = tripKind !== "anytime";
  const isMultiDay = days >= 2;

  const activeChips: ActiveChip[] = [];
  if (passFilter) {
    activeChips.push({
      key: "pass",
      label: `Pass: ${PASS_LABELS[passFilter as keyof typeof PASS_LABELS] ?? passFilter}`,
      onRemove: () => onPassChange(null),
    });
  }
  if (tripActive) {
    const fromShort = origin.kind === "geo" ? "here" : origin.short;
    const dayPart = isMultiDay ? ` · ${days} days` : "";
    activeChips.push({
      key: "trip",
      label: `${tripPreset.label}${dayPart} from ${fromShort}`,
      onRemove: () => {
        onWithinChange(null);
        onDaysChange(1);
      },
    });
  }
  if (sizeFilter) {
    activeChips.push({
      key: "size",
      label: `Size: ${SIZE_TIER_LABELS[sizeFilter]}`,
      onRemove: () => onSizeChange(null),
    });
  }
  if (nightOnly) {
    activeChips.push({
      key: "night",
      label: "🌙 Night skiing",
      onRemove: () => onNightChange(false),
    });
  }

  const moreCount = (sizeFilter ? 1 : 0) + (nightOnly ? 1 : 0);

  // Trip dropdown label collapses From + preset into one line. The geo
  // origin gets a distinctive 📍 prefix so it's instantly recognizable.
  const fromLabel = origin.kind === "geo" ? "📍 From here" : `From ${origin.short}`;
  const tripLabelTail = tripActive
    ? `${tripPreset.label}${isMultiDay ? ` ${days}d` : ""}`
    : "Anytime";
  const tripLabel = `${fromLabel} · ${tripLabelTail}`;

  // Pass dropdown label shows the active pass + colored dot when one is set.
  const passLabel = passFilter
    ? PASS_LABELS[passFilter as keyof typeof PASS_LABELS] ?? "All passes"
    : "All passes";

  return (
    <div className="flex flex-col gap-2 px-4 pb-3 sm:px-6">
      {/* Top row — three dropdown buttons + count on the right.
          Mobile: horizontal scroll keeps the row compact; desktop: inline. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* No overflow-x-auto here. CSS spec: any non-visible overflow on
            either axis makes the OTHER axis "auto" too, which clips the
            absolute-positioned dropdown menus this row contains. We use
            flex-wrap on mobile so a long button label (e.g. "From here · 5d")
            stacks rather than scrolls; on desktop everything fits one row. */}
        <div className="flex shrink-0 flex-wrap gap-2 pb-1 sm:flex-nowrap sm:pb-0">
          <PassDropdown
            passFilter={passFilter}
            passCounts={passCounts}
            totalPass={totalPass}
            label={passLabel}
            onPassChange={onPassChange}
          />
          <TripDropdown
            origin={origin}
            withinHours={withinHours}
            days={days}
            label={tripLabel}
            onFromCity={onFromCity}
            onFromGeo={onFromGeo}
            onWithinChange={onWithinChange}
            onDaysChange={onDaysChange}
            onOpenPlanner={onOpenPlanner}
          />
          <button
            type="button"
            onClick={onOpenDrawer}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal transition-colors duration-200 hover:border-wn-charcoal/40 min-h-[36px]"
            aria-label="More filters"
          >
            <span aria-hidden="true">≡</span>
            <span>More filters</span>
            {moreCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wn-navy px-1 text-[10px] font-bold text-white">
                {moreCount}
              </span>
            )}
          </button>
        </div>

        <div className="shrink-0 text-xs font-medium text-wn-charcoal/70 sm:text-right">
          {filteredCount} / {totalCount}
          {sizeFilter !== null && hiddenByNullSize > 0 && (
            <span className="ml-1 italic text-wn-charcoal/55">
              · {hiddenByNullSize} unknown size hidden
            </span>
          )}
        </div>
      </div>

      {/* Active-filter chips strip — only renders when something is active.
          Each chip has × to remove individually; "Clear all" appears on 2+. */}
      {activeChips.length > 0 && (
        <div className="-mx-4 flex flex-wrap items-center gap-1.5 px-4 sm:mx-0 sm:px-0">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-wn-navy bg-wn-navy px-2.5 py-1 text-[11px] font-semibold text-white transition-all duration-150 hover:bg-wn-navy/85 active:scale-95"
              aria-label={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span aria-hidden="true" className="text-white/80">×</span>
            </button>
          ))}
          {activeChips.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto shrink-0 text-[11px] font-semibold text-wn-charcoal/60 underline-offset-2 transition-colors hover:text-wn-navy hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass dropdown                                                              */
/* -------------------------------------------------------------------------- */

function PassDropdown({
  passFilter,
  passCounts,
  totalPass,
  label,
  onPassChange,
}: {
  passFilter: string | null;
  passCounts: Record<string, number>;
  totalPass: number;
  label: string;
  onPassChange: (p: string | null) => void;
}) {
  const { open, setOpen, ref } = useDropdown();
  const activeColor = passFilter
    ? PASS_COLORS[passFilter as keyof typeof PASS_COLORS]
    : null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          passFilter
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {activeColor && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: activeColor }}
            aria-hidden="true"
          />
        )}
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-2 shadow-lg z-30"
        >
          <DropdownRow
            active={passFilter === null}
            onClick={() => {
              onPassChange(null);
              setOpen(false);
            }}
          >
            <span className="font-semibold">All passes</span>
            <span className="ml-auto text-wn-charcoal/55">{totalPass}</span>
          </DropdownRow>
          <div className="my-1 h-px bg-wn-charcoal/10" />
          {PASS_KEYS.map((key) => {
            const count = passCounts[key] ?? 0;
            const isActive = passFilter === key;
            return (
              <DropdownRow
                key={key}
                active={isActive}
                onClick={() => {
                  onPassChange(isActive ? null : key);
                  setOpen(false);
                }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PASS_COLORS[key] }}
                  aria-hidden="true"
                />
                <span>{PASS_LABELS[key]}</span>
                <span className="ml-auto text-wn-charcoal/55">{count}</span>
              </DropdownRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Trip dropdown (origin + length)                                            */
/* -------------------------------------------------------------------------- */

function TripDropdown({
  origin,
  withinHours,
  days,
  label,
  onFromCity,
  onFromGeo,
  onWithinChange,
  onDaysChange,
  onOpenPlanner,
}: {
  origin: Origin;
  withinHours: number;
  days: number;
  label: string;
  onFromCity: (code: string) => void;
  onFromGeo: (lat: number, lng: number) => void;
  onWithinChange: (w: string | null) => void;
  onDaysChange: (d: number) => void;
  onOpenPlanner: () => void;
}) {
  const { open, setOpen, ref } = useDropdown();
  const [requestingGeo, setRequestingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // Local visual-only mirror of `days` for the Big-trip slider so dragging
  // is responsive even though committing the value to the URL triggers a
  // full server-side re-fetch. Render-phase sync: when the parent's `days`
  // prop changes (e.g. via URL update or a different preset), we adopt it
  // as the new draft. This is React's recommended pattern for derived
  // state from props (no setState-in-effect cascade).
  const [draftDays, setDraftDays] = useState(days);
  const [lastSeenDays, setLastSeenDays] = useState(days);
  if (lastSeenDays !== days) {
    setLastSeenDays(days);
    setDraftDays(days);
  }
  const currentKind = tripKindFor(withinHours, days);
  const tripActive = currentKind !== "anytime";
  const isGeo = origin.kind === "geo";

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
        setOpen(false);
      },
      (err) => {
        setRequestingGeo(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permission denied. Allow location in your browser settings."
            : "Couldn't get your location.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          tripActive || isGeo
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-3 shadow-lg z-30"
        >
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            From
          </div>

          <button
            type="button"
            onClick={handleUseHere}
            disabled={requestingGeo}
            className={`mb-2 flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60 ${
              isGeo
                ? "border-wn-navy bg-wn-navy text-white"
                : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
            }`}
          >
            <span aria-hidden="true">📍</span>
            <span>{requestingGeo ? "Locating…" : isGeo ? "Using your location" : "From here"}</span>
            {isGeo && <span className="ml-auto text-[10px] text-white/75">live</span>}
          </button>
          {geoError && (
            <p className="mb-2 text-[10px] leading-tight text-wn-charcoal/60">{geoError}</p>
          )}

          <select
            value={origin.kind === "city" ? origin.code : ""}
            onChange={(e) => onFromCity(e.target.value)}
            className="mb-3 w-full rounded-md border border-wn-charcoal/20 bg-white px-2 py-1.5 text-xs font-medium text-wn-charcoal hover:border-wn-charcoal/40 focus:outline-none focus:ring-2 focus:ring-wn-sky"
            aria-label="From city"
          >
            {origin.kind === "geo" && (
              <option value="" disabled>
                — pick a city —
              </option>
            )}
            {ORIGINS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            Trip type
          </div>
          <div className="flex flex-col gap-1">
            {TRIP_PRESETS.map((opt) => {
              const active = currentKind === opt.kind;
              return (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => {
                    if (opt.kind === "anytime") {
                      onWithinChange(null);
                      onDaysChange(1);
                    } else {
                      onWithinChange(String(opt.within));
                      onDaysChange(opt.defaultDays);
                    }
                    if (opt.kind === "day" || opt.kind === "anytime") setOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-wn-navy bg-wn-navy text-white"
                      : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                  }`}
                >
                  {opt.emoji && <span aria-hidden="true">{opt.emoji}</span>}
                  <span>{opt.label}</span>
                  {opt.kind === "day" && (
                    <span className={`ml-auto text-[10px] ${active ? "text-white/75" : "text-wn-charcoal/55"}`}>
                      ≤ 3h
                    </span>
                  )}
                  {(opt.kind === "weekend" || opt.kind === "big") && (
                    <span className={`ml-auto text-[10px] ${active ? "text-white/75" : "text-wn-charcoal/55"}`}>
                      multi-day
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Day-count picker — appears only for multi-day trips. Weekend
              has 2/3 quick buttons; Big trip has a 3-10 slider. */}
          {(currentKind === "weekend" || currentKind === "big") && (
            <div className="mt-3 rounded-md border border-wn-charcoal/10 bg-wn-offwhite p-2">
              <div className="mb-1.5 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
                <span>How many days?</span>
                <span className="text-wn-navy">{draftDays}d</span>
              </div>
              {currentKind === "weekend" ? (
                <div className="flex gap-1">
                  {[2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onDaysChange(d)}
                      className={`flex-1 rounded-md border px-2 py-1 text-xs font-semibold transition-colors ${
                        days === d
                          ? "border-wn-navy bg-wn-navy text-white"
                          : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
                </div>
              ) : (
                <input
                  type="range"
                  min={3}
                  max={10}
                  step={1}
                  value={draftDays}
                  // Live drag updates only the local visual; the URL +
                  // server re-fetch waits until the user lets go (or
                  // releases an arrow key). Without this the slider felt
                  // stuck because every tick triggered a full RSC fetch.
                  onChange={(e) => setDraftDays(Number(e.target.value))}
                  onMouseUp={(e) => onDaysChange(Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => onDaysChange(Number((e.target as HTMLInputElement).value))}
                  onKeyUp={(e) => onDaysChange(Number((e.target as HTMLInputElement).value))}
                  className="w-full accent-wn-navy"
                  aria-label="Trip length in days"
                />
              )}

              <button
                type="button"
                onClick={() => {
                  // Make sure the latest dragged value lands in the URL
                  // before opening the planner — otherwise the panel
                  // could open with a stale day count.
                  if (draftDays !== days) onDaysChange(draftDays);
                  onOpenPlanner();
                  setOpen(false);
                }}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-wn-navy px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-wn-navy/90 active:scale-95"
              >
                <span aria-hidden="true">🗺️</span>
                <span>Plan my {draftDays}-day trip</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared dropdown helpers                                                    */
/* -------------------------------------------------------------------------- */

// Minimal click-outside + ESC-to-close hook. No library dep — the state is
// owned by the parent dropdown component. Reused by both pass + trip menus.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

function DropdownRow({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitemradio"
      aria-checked={active}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        active
          ? "bg-wn-navy/10 font-semibold text-wn-navy"
          : "font-medium text-wn-charcoal hover:bg-wn-charcoal/5"
      }`}
    >
      {children}
    </button>
  );
}
