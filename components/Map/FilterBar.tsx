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
  onClearAll: () => void;
  onOpenDrawer: () => void;
};

// Trip-type presets — pure trip length. The drive cap is now its own
// independent filter ("≤ Xh") so a Weekend trip with willingness to
// drive 10h on day 1 is expressible. Anytime = no trip-length filter
// at all (single day, no cap). Day/Weekend/Big differ only in days.
type TripKind = "anytime" | "day" | "weekend" | "big";
const TRIP_PRESETS: { kind: TripKind; emoji: string; label: string; defaultDays: number }[] = [
  { kind: "anytime", emoji: "",   label: "Anytime",  defaultDays: 1 },
  { kind: "day",     emoji: "🚗", label: "Day trip", defaultDays: 1 },
  { kind: "weekend", emoji: "🏕️", label: "Weekend",  defaultDays: 2 },
  { kind: "big",     emoji: "🎿", label: "Big trip", defaultDays: 5 },
];

function tripKindFor(days: number, hasDayTripFlag: boolean): TripKind {
  if (days >= 4) return "big";
  if (days >= 2) return "weekend";
  if (hasDayTripFlag) return "day";
  return "anytime";
}

// Drive-time presets for the new standalone Drive-time dropdown.
const DRIVE_TIME_PRESETS = [0, 3, 5, 8, 12];

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
  onClearAll,
  onOpenDrawer,
}: Props) {
  const totalPass = Object.values(passCounts).reduce((a, b) => a + b, 0);

  // Build active-chip strip from current filter state. Chips render in a
  // stable order so the strip doesn't shuffle as users add/remove.
  const driveActive = withinHours > 0;
  const tripKind = tripKindFor(days, false);
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
  if (driveActive) {
    const fromShort = origin.kind === "geo" ? "here" : origin.short;
    activeChips.push({
      key: "drive",
      label: `≤ ${withinHours}h drive from ${fromShort}`,
      onRemove: () => onWithinChange(null),
    });
  }
  if (tripActive) {
    const dayPart = isMultiDay ? ` · ${days} days` : "";
    activeChips.push({
      key: "trip",
      label: `${tripPreset.label}${dayPart}`,
      onRemove: () => onDaysChange(1),
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

  // Trip dropdown label = From + trip-length preset. Drive cap is
  // surfaced through its own dropdown.
  const fromLabel = origin.kind === "geo" ? "📍 From here" : `From ${origin.short}`;
  const tripLabelTail = tripActive
    ? `${tripPreset.label}${isMultiDay ? ` ${days}d` : ""}`
    : "Anytime";
  const tripLabel = `${fromLabel} · ${tripLabelTail}`;
  const driveLabel = driveActive ? `≤ ${withinHours}h drive` : "Any drive";

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
          <FromDropdown
            origin={origin}
            onFromCity={onFromCity}
            onFromGeo={onFromGeo}
          />
          <DriveTimeDropdown
            withinHours={withinHours}
            label={driveLabel}
            active={driveActive}
            onWithinChange={onWithinChange}
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
/* From dropdown — geolocation primary, 4-city fallback                       */
/* -------------------------------------------------------------------------- */

function FromDropdown({
  origin,
  onFromCity,
  onFromGeo,
}: {
  origin: Origin;
  onFromCity: (code: string) => void;
  onFromGeo: (lat: number, lng: number) => void;
}) {
  const { open, setOpen, ref } = useDropdown();
  const [requestingGeo, setRequestingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const isGeo = origin.kind === "geo";
  const buttonLabel = isGeo ? "📍 From here" : `From ${origin.short}`;

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
          isGeo
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{buttonLabel}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-3 shadow-lg z-30"
        >
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
            <span>{requestingGeo ? "Locating…" : isGeo ? "Using your location" : "Use my location"}</span>
            {isGeo && <span className="ml-auto text-[10px] text-white/75">live</span>}
          </button>
          {geoError && (
            <p className="mb-2 text-[10px] leading-tight text-wn-charcoal/60">{geoError}</p>
          )}
          <div className="mb-1 mt-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            Or pick a city
          </div>
          <select
            value={origin.kind === "city" ? origin.code : ""}
            onChange={(e) => {
              onFromCity(e.target.value);
              setOpen(false);
            }}
            className="w-full rounded-md border border-wn-charcoal/20 bg-white px-2 py-1.5 text-xs font-medium text-wn-charcoal hover:border-wn-charcoal/40 focus:outline-none focus:ring-2 focus:ring-wn-sky"
            aria-label="From city"
          >
            {origin.kind === "geo" && (
              <option value="" disabled>— pick a city —</option>
            )}
            {ORIGINS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
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

/* -------------------------------------------------------------------------- */
/* Drive-time dropdown — independent filter capping single-leg drive          */
/* -------------------------------------------------------------------------- */

function DriveTimeDropdown({
  withinHours,
  label,
  active,
  onWithinChange,
}: {
  withinHours: number;
  label: string;
  active: boolean;
  onWithinChange: (w: string | null) => void;
}) {
  const { open, setOpen, ref } = useDropdown();
  const [customHours, setCustomHours] = useState<string>(
    withinHours > 0 ? String(withinHours) : "",
  );
  const [lastSeenWithin, setLastSeenWithin] = useState(withinHours);
  if (lastSeenWithin !== withinHours) {
    setLastSeenWithin(withinHours);
    setCustomHours(withinHours > 0 ? String(withinHours) : "");
  }

  function commitCustom() {
    const n = Number(customHours);
    if (Number.isFinite(n) && n > 0 && n <= 24) {
      onWithinChange(String(Math.round(n)));
      setOpen(false);
    } else if (customHours.trim() === "") {
      onWithinChange(null);
      setOpen(false);
    }
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          active
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden="true">⏱️</span>
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-3 shadow-lg z-30"
        >
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            Max drive on day 1
          </div>
          <div className="grid grid-cols-3 gap-1">
            {DRIVE_TIME_PRESETS.map((h) => {
              const presetActive = withinHours === h && !(h === 0 && !active);
              const isAny = h === 0;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    onWithinChange(isAny ? null : String(h));
                    setOpen(false);
                  }}
                  className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    presetActive || (isAny && !active)
                      ? "border-wn-navy bg-wn-navy text-white"
                      : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                  }`}
                >
                  {isAny ? "Any" : `≤ ${h}h`}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
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
                  commitCustom();
                }
              }}
              className="w-16 rounded-md border border-wn-charcoal/20 bg-white px-2 py-1 text-xs font-medium text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
              aria-label="Custom max drive hours"
            />
            <span className="text-[10px] text-wn-charcoal/55">hrs</span>
            <button
              type="button"
              onClick={commitCustom}
              className="ml-auto rounded-md bg-wn-navy px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-wn-navy/90 active:scale-95"
            >
              Apply
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-tight text-wn-charcoal/55">
            Hides resorts the drive time can&apos;t reach within this cap. Doesn&apos;t affect manual picks in the trip planner.
          </p>
        </div>
      )}
    </div>
  );
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
