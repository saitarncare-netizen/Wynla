"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  driveFilterLabel,
  originOptionLabel,
  originsForPicker,
  type Origin,
} from "@/lib/origins";
import { PASS_COLORS, PASS_KEYS, PASS_LABELS } from "@/lib/passColors";
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/sizeTier";

/** One removable chip in the active-filter strip. MapPage builds the
 *  list (it owns every filter's URL state) and this bar only renders
 *  it, so the strip and the ☰ badge can never disagree. */
export type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

type Props = {
  passFilter: string[];
  origin: Origin;
  /** True when drive times from this origin are Haversine estimates
   *  (geo origin, or a city without drive_time_cache rows). */
  originIsEstimate: boolean;
  withinHours: number;
  sizeFilter: SizeTier | null;
  nightOnly: boolean;
  passCounts: Record<string, number>;
  hiddenByNullSize: number;
  filteredCount: number;
  totalCount: number;
  activeChips: ActiveFilterChip[];
  onPassChange: (passes: string[]) => void;
  onFromCity: (code: string) => void;
  onFromGeo: (lat: number, lng: number) => void;
  onWithinChange: (w: string | null) => void;
  onSizeChange: (s: SizeTier | null) => void;
  onNightChange: (v: boolean) => void;
  onClearAll: () => void;
};

// Drive-time presets for the new standalone Drive-time dropdown.
const DRIVE_TIME_PRESETS = [0, 3, 5, 8, 12];

export default function FilterBar({
  passFilter,
  origin,
  originIsEstimate,
  withinHours,
  sizeFilter,
  nightOnly,
  passCounts,
  hiddenByNullSize,
  filteredCount,
  totalCount,
  activeChips,
  onPassChange,
  onFromCity,
  onFromGeo,
  onWithinChange,
  onSizeChange,
  onNightChange,
  onClearAll,
}: Props) {
  const totalPass = Object.values(passCounts).reduce((a, b) => a + b, 0);
  const driveActive = withinHours > 0;

  // Always include the from-city in the drive chip label — Saitarn
  // 2026-05-23 feedback: bare "Any drive" / "≤ 5h drive" read ambiguously
  // (drive from where?). Including "from NYC" / "from Boston" makes the
  // reference point explicit at a glance. driveFilterLabel adds the "≈"
  // for origins whose drive times are estimates rather than cached road
  // routes; the active-filter chip in MapPage uses the same formatter.
  const driveLabel = driveFilterLabel(withinHours, origin, originIsEstimate);

  // Pass dropdown label — multi-select aware. "All passes" when empty,
  // single label when one selected, "Ikon + Epic" when multiple.
  const passLabel =
    passFilter.length === 0
      ? "All passes"
      : passFilter.length === 1
        ? PASS_LABELS[passFilter[0] as keyof typeof PASS_LABELS] ?? passFilter[0]
        : passFilter
            .map((p) => PASS_LABELS[p as keyof typeof PASS_LABELS] ?? p)
            .join(" + ");

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
            originIsEstimate={originIsEstimate}
            onFromCity={onFromCity}
            onFromGeo={onFromGeo}
          />
          <DriveTimeDropdown
            withinHours={withinHours}
            label={driveLabel}
            active={driveActive}
            onWithinChange={onWithinChange}
          />
          <SizeDropdown
            sizeFilter={sizeFilter}
            onSizeChange={onSizeChange}
          />
          <button
            type="button"
            onClick={() => onNightChange(!nightOnly)}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 min-h-[36px] ${
              nightOnly
                ? "border-wn-navy bg-wn-navy text-white"
                : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
            }`}
            aria-pressed={nightOnly}
            title="Show only resorts with night skiing"
          >
            <span aria-hidden="true">🌙</span>
            <span>Night</span>
          </button>
        </div>

        {/* Not a live region on purpose: MapView already announces the
            count once per change, and two announcers would double up. */}
        <div className="shrink-0 text-xs font-medium text-wn-charcoal/70 sm:text-right">
          <span className="sr-only">Showing </span>
          {filteredCount} / {totalCount}
          <span className="sr-only"> resorts</span>
          {sizeFilter !== null && hiddenByNullSize > 0 && (
            <span className="ml-1 italic text-wn-charcoal/65">
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
  passFilter: string[];
  passCounts: Record<string, number>;
  totalPass: number;
  label: string;
  onPassChange: (passes: string[]) => void;
}) {
  const { open, setOpen, close, ref, triggerRef, panelId } = useDropdown("menu");
  const hintId = `${panelId}-hint`;
  // For the button-color dot, show the first selected pass's color
  // when exactly one is active. With multi-select we drop the dot
  // entirely — the label "Ikon + Epic" already conveys the state.
  const activeColor =
    passFilter.length === 1
      ? PASS_COLORS[passFilter[0] as keyof typeof PASS_COLORS]
      : null;

  function togglePass(key: string) {
    const next = passFilter.includes(key)
      ? passFilter.filter((p) => p !== key)
      : [...passFilter, key];
    onPassChange(next);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          passFilter.length > 0
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        {activeColor && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: activeColor }}
            aria-hidden="true"
          />
        )}
        {/* The visible text stays the accessible name's tail (WCAG 2.5.3);
            the sr-only prefix says which filter this is. */}
        <span className="sr-only">Pass: </span>
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-2 shadow-lg z-30">
          {/* The hint sits outside the menu element: a menu may only
              contain menu items, groups and separators, so a paragraph
              inside it would be read as a stray item. The menu points at
              it with aria-describedby instead. */}
          <p id={hintId} className="mb-1 px-2 text-[11px] text-wn-charcoal/65">
            Pick more than one if you own more than one pass.
          </p>
          <div id={panelId} role="menu" aria-label="Pass" aria-describedby={hintId}>
          <DropdownRow
            role="menuitemradio"
            active={passFilter.length === 0}
            onClick={() => {
              onPassChange([]);
              close();
            }}
          >
            <span className="font-semibold">All passes</span>
            <span className="ml-auto text-wn-charcoal/65">{totalPass}</span>
          </DropdownRow>
          <div role="separator" className="my-1 h-px bg-wn-charcoal/10" />
          {PASS_KEYS.map((key) => {
            const count = passCounts[key] ?? 0;
            const isActive = passFilter.includes(key);
            return (
              <DropdownRow
                key={key}
                role="menuitemcheckbox"
                active={isActive}
                onClick={() => togglePass(key)}
              >
                {/* Checkbox indicator — square, fills navy on active */}
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 ${
                    isActive
                      ? "border-wn-navy bg-wn-navy text-white"
                      : "border-wn-charcoal/60 bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {isActive && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6.5L5 9.5L10 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PASS_COLORS[key] }}
                  aria-hidden="true"
                />
                <span>{PASS_LABELS[key]}</span>
                <span className="ml-auto text-wn-charcoal/65">{count}</span>
              </DropdownRow>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* From dropdown — geolocation, ZIP, or any city in lib/origins            */
/* -------------------------------------------------------------------------- */

function FromDropdown({
  origin,
  originIsEstimate,
  onFromCity,
  onFromGeo,
}: {
  origin: Origin;
  originIsEstimate: boolean;
  onFromCity: (code: string) => void;
  onFromGeo: (lat: number, lng: number) => void;
}) {
  const { open, setOpen, close, ref, triggerRef, panelId } = useDropdown("dialog");
  const zipErrorId = `${panelId}-zip-error`;
  const zipHintId = `${panelId}-zip-hint`;
  const [requestingGeo, setRequestingGeo] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  // ZIP-code fallback. Browser geolocation on desktop is IP-based and
  // can be off by 50+ km (especially on a VPN), so users get a precise
  // alternative: type a US ZIP, we resolve it via zippopotam.us (free,
  // no key) and feed the centroid into the same onFromGeo handler the
  // browser-geo path uses.
  const [zipInput, setZipInput] = useState("");
  const [resolvingZip, setResolvingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const isGeo = origin.kind === "geo";
  const buttonLabel = isGeo ? "📍 From here" : `From ${origin.short}`;

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
      close();
    } catch {
      setResolvingZip(false);
      setZipError("Network error — try again.");
    }
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
        close();
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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          isGeo
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <span className="sr-only">Drive origin: </span>
        <span>{buttonLabel}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        // A dialog, not a menu: it holds a text input and a select,
        // which are not valid menu children (audit a11y-5).
        <div
          id={panelId}
          role="dialog"
          aria-label="Where you drive from"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-3 shadow-lg z-30"
        >
          <button
            type="button"
            onClick={handleUseHere}
            disabled={requestingGeo}
            aria-pressed={isGeo}
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
            <p role="alert" className="mb-2 text-[11px] leading-tight text-wn-charcoal/75">{geoError}</p>
          )}
          <label
            htmlFor={`${panelId}-zip`}
            className="mb-1 mt-1 block text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/65"
          >
            Or use a US ZIP code
          </label>
          <div className="mb-1 flex gap-1">
            <input
              id={`${panelId}-zip`}
              type="text"
              inputMode="numeric"
              pattern="\d{5}"
              maxLength={5}
              enterKeyHint="go"
              autoComplete="postal-code"
              placeholder="e.g. 80424"
              value={zipInput}
              onChange={(e) => {
                // Keep only digits to make iOS numeric keyboard work
                // and prevent accidental letters from country codes.
                setZipInput(e.target.value.replace(/\D/g, "").slice(0, 5));
                if (zipError) setZipError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleZipSubmit();
              }}
              disabled={resolvingZip}
              aria-invalid={zipError ? true : undefined}
              aria-describedby={zipError ? `${zipHintId} ${zipErrorId}` : zipHintId}
              className="min-w-0 flex-1 rounded-md border border-wn-charcoal/20 bg-white px-2 py-1.5 text-xs font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 hover:border-wn-charcoal/40 focus:outline-none focus:ring-2 focus:ring-wn-sky disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleZipSubmit}
              disabled={resolvingZip || zipInput.length !== 5}
              aria-describedby={zipHintId}
              className="rounded-md bg-wn-navy px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-50"
            >
              {resolvingZip ? "…" : "Use"}
            </button>
          </div>
          {/* Says why Use is disabled until five digits are typed. */}
          <p id={zipHintId} className="mb-2 text-[11px] leading-tight text-wn-charcoal/65">
            Five digits, then Use.
          </p>
          {zipError && (
            <p id={zipErrorId} role="alert" className="mb-2 text-[11px] leading-tight text-wn-charcoal/75">{zipError}</p>
          )}

          <label
            htmlFor={`${panelId}-city`}
            className="mb-1 mt-1 block text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/65"
          >
            Or pick a city
          </label>
          <select
            id={`${panelId}-city`}
            value={origin.kind === "city" ? origin.code : ""}
            onChange={(e) => {
              if (!e.target.value) return;
              onFromCity(e.target.value);
              close();
            }}
            className="w-full rounded-md border border-wn-charcoal/20 bg-white px-2 py-1.5 text-xs font-medium text-wn-charcoal hover:border-wn-charcoal/40 focus:outline-none focus:ring-2 focus:ring-wn-sky"
          >
            {origin.kind === "geo" && (
              <option value="" disabled>— pick a city —</option>
            )}
            {originsForPicker().map((o) => (
              <option key={o.code} value={o.code}>
                {originOptionLabel(o)}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] leading-tight text-wn-charcoal/65">
            {originIsEstimate
              ? "Drive times from this origin are estimates (≈). Open a resort for an exact route."
              : "Drive times from this city are cached road routes."}
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared dropdown helpers                                                    */
/* -------------------------------------------------------------------------- */

const FOCUSABLE_IN_PANEL =
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Dropdown state + keyboard behaviour shared by the four desktop pills
// (audit a11y-5 / map-core-39). No library dep.
//
//   - opening moves focus to the first control in the panel
//   - "menu" kind: ArrowUp / ArrowDown / Home / End walk the menu items
//     (the "dialog" kind holds inputs and a select, so arrows are theirs)
//   - Escape closes and puts focus back on the pill
//   - choosing an item calls close(), which also returns focus
//   - clicking outside or tabbing away closes WITHOUT stealing focus
//     back, so the thing the user moved to keeps it
function useDropdown(kind: "menu" | "dialog") {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const restoreOnClose = useRef(false);
  const panelId = useId();

  const close = useCallback(() => {
    restoreOnClose.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    const root = ref.current;
    if (!open) {
      if (restoreOnClose.current) {
        restoreOnClose.current = false;
        triggerRef.current?.focus();
      }
      return;
    }
    if (!root) return;
    const t = window.setTimeout(() => {
      const panel = document.getElementById(panelId);
      panel?.querySelector<HTMLElement>(FOCUSABLE_IN_PANEL)?.focus();
    }, 0);
    function onMouseDown(e: MouseEvent) {
      if (root && !root.contains(e.target as Node)) setOpen(false);
    }
    function onFocusOut(e: FocusEvent) {
      const next = e.relatedTarget as Node | null;
      if (next && root && !root.contains(next)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        return;
      }
      if (kind !== "menu") return;
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const items = Array.from(
        document.getElementById(panelId)?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
      );
      if (items.length === 0) return;
      e.preventDefault();
      const i = items.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? items.length - 1
            : e.key === "ArrowDown"
              ? (i + 1) % items.length
              : (i - 1 + items.length) % items.length;
      items[next].focus();
    }
    window.addEventListener("mousedown", onMouseDown);
    root.addEventListener("focusout", onFocusOut);
    root.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("mousedown", onMouseDown);
      root.removeEventListener("focusout", onFocusOut);
      root.removeEventListener("keydown", onKey);
    };
  }, [open, kind, panelId, close]);

  return { open, setOpen, close, ref, triggerRef, panelId };
}

// Arrow keys move between the radios of the enclosing radiogroup and
// select the one they land on, like native radios. Wraps at both ends.
function onRadioKey(e: React.KeyboardEvent<HTMLButtonElement>) {
  const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
  const backward = e.key === "ArrowLeft" || e.key === "ArrowUp";
  if (!forward && !backward) return;
  const group = e.currentTarget.closest('[role="radiogroup"]');
  if (!group) return;
  const radios = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'));
  const i = radios.indexOf(e.currentTarget);
  if (i < 0) return;
  e.preventDefault();
  const next = radios[(i + (forward ? 1 : -1) + radios.length) % radios.length];
  next.focus();
  next.click();
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
  const { open, setOpen, close, ref, triggerRef, panelId } = useDropdown("dialog");
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
      close();
    } else if (customHours.trim() === "") {
      onWithinChange(null);
      close();
    }
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          active
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <span aria-hidden="true">⏱️</span>
        <span className="sr-only">Drive time: </span>
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Maximum drive time"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-3 shadow-lg z-30"
        >
          <div
            id={`${panelId}-presets-label`}
            className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/65"
          >
            Max drive on day 1
          </div>
          <div
            className="grid grid-cols-3 gap-1"
            role="radiogroup"
            aria-labelledby={`${panelId}-presets-label`}
          >
            {DRIVE_TIME_PRESETS.map((h) => {
              const presetActive = withinHours === h && !(h === 0 && !active);
              const isAny = h === 0;
              const checked = presetActive || (isAny && !active);
              return (
                <button
                  key={h}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  onKeyDown={onRadioKey}
                  onClick={() => {
                    onWithinChange(isAny ? null : String(h));
                    close();
                  }}
                  className={`rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    checked
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
            <label
              htmlFor={`${panelId}-custom`}
              className="text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/65"
            >
              Custom
            </label>
            <input
              id={`${panelId}-custom`}
              type="number"
              inputMode="numeric"
              enterKeyHint="done"
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
              aria-describedby={`${panelId}-custom-unit`}
              className="w-16 rounded-md border border-wn-charcoal/20 bg-white px-2 py-1 text-xs font-medium text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
            />
            <span id={`${panelId}-custom-unit`} className="text-[11px] text-wn-charcoal/65">hours, 1 to 24</span>
            <button
              type="button"
              onClick={commitCustom}
              className="ml-auto rounded-md bg-wn-navy px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-wn-navy/90 active:scale-95"
            >
              Apply
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-tight text-wn-charcoal/65">
            Hides resorts the drive time can&apos;t reach within this cap. Doesn&apos;t affect manual picks in the trip planner.
          </p>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Size dropdown — vertical drop tier filter (Small / Medium / Large)         */
/* -------------------------------------------------------------------------- */

function SizeDropdown({
  sizeFilter,
  onSizeChange,
}: {
  sizeFilter: SizeTier | null;
  onSizeChange: (s: SizeTier | null) => void;
}) {
  const { open, setOpen, close, ref, triggerRef, panelId } = useDropdown("menu");
  const label = sizeFilter ? `Size: ${SIZE_TIER_LABELS[sizeFilter]}` : "Any size";
  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          sizeFilter
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <span aria-hidden="true">⛰️</span>
        <span className="sr-only">Resort size: </span>
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label="Resort size"
          className="absolute left-0 mt-1 w-44 rounded-lg border border-wn-charcoal/15 bg-white p-1 shadow-lg z-30"
        >
          <DropdownRow
            role="menuitemradio"
            active={sizeFilter === null}
            onClick={() => {
              onSizeChange(null);
              close();
            }}
          >
            <span className="font-semibold">Any size</span>
          </DropdownRow>
          {(["small", "medium", "large"] as const).map((tier) => (
            <DropdownRow
              key={tier}
              role="menuitemradio"
              active={sizeFilter === tier}
              onClick={() => {
                onSizeChange(sizeFilter === tier ? null : tier);
                close();
              }}
            >
              <span>{SIZE_TIER_LABELS[tier]}</span>
            </DropdownRow>
          ))}
        </div>
      )}
    </div>
  );
}

function DropdownRow({
  active,
  onClick,
  children,
  role = "menuitemradio",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** menuitemradio for single-select rows, menuitemcheckbox for the
   *  multi-select pass toggles (audit a11y-5). */
  role?: "menuitemradio" | "menuitemcheckbox";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role={role}
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
