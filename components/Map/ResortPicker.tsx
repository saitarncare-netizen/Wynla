"use client";

// Modal search-and-pick for swapping a resort on a day card. Lists ALL
// active resorts (no pass / size / drive-cap filter) so a user willing
// to drive 8h on day 1 isn't blocked by the planner's 6h cap. Sorts by
// drive time from the previous stop by default; toggle for alphabetical.
//
// Stage 20: on mobile this renders as a bottom sheet with three snap
// points (collapsed / half / full) so the user can drag it down to see
// the map without dismissing the picker. Desktop unchanged — left rail.

import { useEffect, useMemo, useRef, useState } from "react";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { formatDriveTimeLabel } from "@/lib/origins";
import { isGlobalOffSeasonNow } from "@/lib/seasonDates";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { US_STATES } from "@/lib/usStates";
import type { Resort } from "./MapPage";

// Sheet slide-in duration (matches the slideUp keyframe used by the
// drawers). Autofocus waits for it so the iOS keyboard does not fight
// the animation and the caret lands in a settled input.
const SHEET_ANIMATION_MS = 240;

// iOS Safari raises the keyboard only for a focus() that runs
// synchronously inside the user's tap. The picker's input does not
// exist yet at that moment (the sheet mounts on the next render), so
// the tap handler focuses this tiny off-screen input instead; once the
// keyboard is up, iOS lets focus move to another input programmatically
// without dropping it. ResortPicker hands focus to the real input after
// the sheet animation and removes the primer. Desktop and Android do
// not need this and skip it (they honour a deferred focus).
const KEYBOARD_PRIMER_ID = "wynla-search-keyboard-primer";

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

/** Call synchronously from the tap that opens the header search. */
export function primeSearchKeyboard(): void {
  if (typeof document === "undefined" || !isMobileViewport()) return;
  let primer = document.getElementById(KEYBOARD_PRIMER_ID) as HTMLInputElement | null;
  if (!primer) {
    primer = document.createElement("input");
    primer.id = KEYBOARD_PRIMER_ID;
    primer.type = "search";
    primer.setAttribute("aria-hidden", "true");
    primer.tabIndex = -1;
    // Visible to the focus system (not display:none) but not to the eye;
    // 16px keeps iOS from zooming the viewport on focus.
    primer.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;pointer-events:none;";
    document.body.appendChild(primer);
  }
  primer.focus({ preventScroll: true });
}

function releaseSearchKeyboardPrimer(): void {
  if (typeof document === "undefined") return;
  document.getElementById(KEYBOARD_PRIMER_ID)?.remove();
}

// Search normaliser: lower-case, strip everything but letters and
// digits, so "Blue wood" matches "Bluewood", "park-city" matches
// "Park City", and apostrophes / ampersands never fail a match.
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

type Props = {
  open: boolean;
  title: string;
  /** Stage 33 — when true, mobile renders as a full-screen sheet
   *  (inset-0) with no map peeking through. Header-search uses this
   *  because users don't need the map while searching by name; trip
   *  planner keeps the bottom-sheet snap behavior so users can see
   *  candidates on the map while picking. */
  fullScreen?: boolean;
  fromPoint: { lat: number; lng: number; label: string };
  allResorts: Resort[];
  /** Slugs already in the trip — shown as "in trip" tags but still clickable. */
  alreadyPicked: string[];
  /** Slug currently being previewed in the right-panel pendingStop
      card. Renders that row with a navy outline so the user can tell
      which one their "How many days?" prompt is asking about, even
      when they've clicked a different one since. */
  pendingSlug?: string | null;
  /** Resort name for the pendingSlug — used as the label inside the
      "Add [Resort]" sticky footer that appears when a candidate is
      selected but not yet added. */
  pendingResortName?: string | null;
  /** Day count for the pending stop, shown as a stepper in the sticky
      footer so the pick and the length are one tap apart. When omitted
      the footer is a plain confirm button. */
  pendingDays?: number;
  /** Upper bound for the stepper — days left in the trip budget. */
  pendingDaysMax?: number;
  /** +1 / −1 on the pending stop's day count. */
  onPendingDaysChange?: (delta: number) => void;
  /** Fires when the user taps the sticky "Add [Resort]" footer. The
      parent commits the stop (and its day count) in one step. */
  onConfirmPending?: () => void;
  onSelect: (slug: string) => void;
  onClose: () => void;
  /** Live hover preview — fires when the user mouseenters a row so the
      map can draw an ephemeral leg from fromPoint to that resort. */
  onHover?: (slug: string | null) => void;
  /** Stage 33 — when set, a "🎛️ More filters" pill appears at the
   *  end of the chip row (next to pass chips). Tapping it opens the
   *  full filter drawer STACKED on top of the picker so users can
   *  refine size / night / drive without leaving search. */
  onOpenFilters?: () => void;
  /** Count of currently-active filters. Rendered as a badge on the
   *  Filters pill so the user can see at a glance what's set without
   *  opening the drawer. */
  activeFilterCount?: number;
  /** Ids of resorts that pass the map's current filters. When given,
   *  `allResorts` is the FULL catalog and rows outside this set are
   *  still searchable but tagged "hidden by filters", with a count in
   *  the header. Omitted by the trip planner, whose list is its own. */
  visibleIds?: Set<number>;
};

type Snap = "collapsed" | "half" | "full";

// Collapsed shows just the search bar + chip row + drag handle. Half
// shows ~6-8 list rows. Full shows everything. Heights below collapsed
// are clamped during drag so the user can't drag the sheet off-screen.
const COLLAPSED_PX = 168;
const MIN_PX = 120;

function snapToPx(s: Snap, vh: number) {
  if (s === "collapsed") return COLLAPSED_PX;
  // Stage 33 — half dropped from 50% → 42% so the map stays the dominant
  // visual on open. Slimmer header (no subtitle line, count merged into
  // title row) keeps ~4-5 list rows visible in the new 42% height.
  if (s === "half") return Math.round(vh * 0.42);
  return Math.round(vh * 0.85);
}

function nearestSnap(px: number, vh: number): Snap {
  const candidates: Array<{ s: Snap; px: number }> = [
    { s: "collapsed", px: snapToPx("collapsed", vh) },
    { s: "half", px: snapToPx("half", vh) },
    { s: "full", px: snapToPx("full", vh) },
  ];
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.abs(c.px - px);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best.s;
}

export default function ResortPicker({
  open,
  title,
  fullScreen = false,
  fromPoint,
  allResorts,
  alreadyPicked,
  pendingSlug,
  pendingResortName,
  pendingDays,
  pendingDaysMax,
  onPendingDaysChange,
  onConfirmPending,
  onSelect,
  onClose,
  onHover,
  onOpenFilters,
  activeFilterCount = 0,
  visibleIds,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "name">("distance");
  // The picker is a single-purpose "search by name" surface: pass and
  // fresh-snow filters live in the FiltersDrawer, reachable from the
  // Filters pill below.
  // Track the most recent `open` value we've seen so we can clear the
  // query whenever the picker opens. React's recommended way to derive
  // state from a prop change without a setState-in-effect cascade.
  const [lastOpen, setLastOpen] = useState(open);
  // Mobile bottom-sheet state. Half snap is the open default — user
  // sees both map and a list preview without dragging.
  const [snap, setSnap] = useState<Snap>("half");
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);
  // Hydrated viewport height — read once on mount to avoid SSR window
  // access. Updates on resize so rotating the device re-snaps cleanly.
  const [vh, setVh] = useState(800);
  // Whether this client is on a mobile viewport (drives whether the
  // inline height + drag handlers actually take effect).
  const [isMobile, setIsMobile] = useState(false);

  if (lastOpen !== open) {
    setLastOpen(open);
    if (open) {
      setQuery("");
      setSnap("half");
      setDragHeight(null);
    }
  }

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

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape closes and focus returns to the opener. The component keeps
  // its own initial-focus logic below (the iOS keyboard primer must not
  // have focus stolen by the trap). Only the full-screen search is a
  // real modal; the trip planner's snap sheet deliberately leaves the
  // map behind it usable, so no inert / scroll lock / Tab wrap there.
  useFocusTrap(dialogRef, open, {
    autoFocus: false,
    onEscape: onClose,
    modal: fullScreen,
  });

  useEffect(() => {
    if (!open) {
      // Closed before the hand-off (or opened without a primer): drop
      // the primer so a stray focused input cannot keep the keyboard up.
      releaseSearchKeyboardPrimer();
      return;
    }
    const mobile = isMobileViewport();
    // Snap-sheet mode (trip planner) keeps the map visible, so popping
    // the keyboard on open would hide the candidates the user wants to
    // see. The full-screen header search has no map behind it: there
    // the user opened it to type, and needing a second tap to start
    // was the first thing mobile testers hit (audit mobile-ergonomics-12).
    if (mobile && !fullScreen) return;
    if (!mobile) {
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    // Mobile: the keyboard is already up if the opener called
    // primeSearchKeyboard() in its tap handler; moving focus here keeps
    // it. The wait lets the slide-in finish so the keyboard animation
    // does not stack on the sheet animation.
    const t = setTimeout(() => {
      inputRef.current?.focus({ preventScroll: true });
      releaseSearchKeyboardPrimer();
    }, SHEET_ANIMATION_MS);
    return () => {
      clearTimeout(t);
      releaseSearchKeyboardPrimer();
    };
  }, [open, fullScreen]);

  const enriched = useMemo(() => {
    const pickedSet = new Set(alreadyPicked);
    return allResorts
      .filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
      .map((r) => {
        const lat = Number(r.latitude);
        const lng = Number(r.longitude);
        const meters = haversineMeters(fromPoint.lat, fromPoint.lng, lat, lng);
        const stateName = US_STATES[r.state] ?? "";
        return {
          id: r.id,
          slug: r.slug,
          name: r.name,
          state: r.state,
          // Name, state code, full state name ("Vermont"), town and
          // region all count as a match (audit map-core-15: name +
          // state code only meant "Stowe VT" worked but "Vermont" and
          // "Ludlow" did not).
          haystack: normalize(
            [r.name, r.state, stateName, r.city ?? "", r.region ?? ""].join(" "),
          ),
          passes: r.passes ?? [],
          driveSeconds: estimateDriveSeconds(meters),
          alreadyInTrip: pickedSet.has(r.slug),
          hiddenByFilters: visibleIds ? !visibleIds.has(r.id) : false,
          // Stage 33 — surface live snow data on the row so the user
          // can spot powder destinations without opening each resort.
          snowNew24h: r.snow_new_24h_in,
          currentlyOpen: r.currently_open,
        };
      });
  }, [allResorts, fromPoint, alreadyPicked, visibleIds]);

  const visible = useMemo(() => {
    // Typo-tolerant search: split the query into tokens and require
    // ALL tokens to be substring-present in the normalised haystack
    // (any order).
    const tokens = query
      .trim()
      .split(/\s+/)
      .map((t) => normalize(t))
      .filter((t) => t.length > 0);
    let list = enriched;
    if (tokens.length > 0) {
      list = list.filter((r) => tokens.every((t) => r.haystack.includes(t)));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.driveSeconds - b.driveSeconds;
    });
    return list;
  }, [enriched, query, sortBy]);

  // How many of the matching rows the map's filters currently hide.
  // Surfaces as a note so "No resorts match" never lies about a resort
  // that exists but is filtered out.
  const hiddenCount = useMemo(
    () => (visibleIds ? visible.filter((r) => r.hiddenByFilters).length : 0),
    [visible, visibleIds],
  );

  function handleRowClick(slug: string) {
    // The parent decides what a tap means: header search closes the
    // picker, the trip planner keeps it open and shows the add-stop
    // footer. No snap change here so the list stays where it was.
    onSelect(slug);
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (!isMobile) return;
    const t = e.touches[0];
    dragRef.current = {
      startY: t.clientY,
      startHeight: dragHeight ?? snapToPx(snap, vh),
    };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    const t = e.touches[0];
    const dy = dragRef.current.startY - t.clientY;
    const proposed = dragRef.current.startHeight + dy;
    const clamped = Math.max(MIN_PX, Math.min(vh * 0.95, proposed));
    setDragHeight(clamped);
  }

  function handleTouchEnd() {
    if (!dragRef.current) return;
    const finalH = dragHeight ?? snapToPx(snap, vh);
    const next = nearestSnap(finalH, vh);
    setSnap(next);
    setDragHeight(null);
    dragRef.current = null;
  }

  if (!open) return null;

  // Bottom-sheet height applies only in snap mode (trip planner). In
  // full-screen mode (header search) the sheet covers the entire
  // viewport so there's no map peeking through to compete for touch.
  const sheetHeight =
    fullScreen ? undefined : isMobile ? (dragHeight ?? snapToPx(snap, vh)) : undefined;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      role="dialog"
      aria-modal={fullScreen ? "true" : undefined}
      aria-label={title}
      className={[
        "fixed z-[61] flex flex-col overflow-hidden bg-white shadow-2xl outline-none",
        fullScreen
          ? // Stage 33 — full-screen mode (header search). No map
            // visible behind = no touch-leak bugs + cleaner search UX.
            "inset-0 md:inset-x-auto md:bottom-4 md:left-4 md:top-28 md:w-[360px] md:rounded-xl md:border md:border-wn-charcoal/15"
          : // Snap-sheet mode (trip planner). User keeps the map
            // visible while picking so they see where candidates are.
            [
              "inset-x-0 bottom-0 rounded-t-2xl border-t border-wn-charcoal/15",
              "md:inset-x-auto md:bottom-4 md:left-4 md:top-28 md:w-[360px] md:rounded-xl md:border md:border-wn-charcoal/15",
            ].join(" "),
      ].join(" ")}
      style={{
        // Mobile only — desktop height is driven by md:top-28 / md:bottom-4.
        height: sheetHeight != null ? `${sheetHeight}px` : undefined,
        // No transition while actively dragging — the user expects the
        // sheet to track their finger 1:1, then animate to the snap
        // when they release.
        transition:
          fullScreen
            ? undefined
            : dragHeight !== null
              ? "none"
              : "height 220ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      {/* Drag handle — mobile only AND only when in snap-sheet mode.
          Full-screen picker has no need to resize. */}
      {!fullScreen && (
      <>
      {/* Drag handle — mobile only. Touch handlers attach here so the
          user can grab anywhere on the handle area to resize the sheet
          without accidentally triggering search input or list scroll. */}
      <div
        className="flex shrink-0 cursor-grab justify-center py-2 active:cursor-grabbing md:hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-hidden="true"
      >
        <div className="h-1 w-10 rounded-full bg-wn-charcoal/25" />
      </div>
      </>
      )}

      <header
        className="shrink-0 border-b border-wn-charcoal/10 px-3 pb-2 pt-1.5 md:pt-3"
        // In fullScreen mode the picker covers the whole viewport
        // (`inset-0`), so without explicit safe-area padding the iOS
        // status bar (clock / battery) sits ON TOP of the title +
        // close button — Saitarn's screenshot from 2026-05-23 showed
        // "21:10" overlapping "Find a resort 425 of 425" and the X
        // tucked up against the Dynamic Island. The status bar is
        // ~44-59px on modern iPhones; env(safe-area-inset-top)
        // resolves to that exact value at runtime. Skip on desktop
        // where the value is 0 anyway, but the inline style is
        // cheaper than another media-query branch.
        style={
          fullScreen
            ? { paddingTop: "calc(env(safe-area-inset-top, 0px) + 6px)" }
            : undefined
        }
      >
        {/* Stage 33 — header slimmed: title + count + close all on one
            row (subtitle "From X · sorted by drive time" dropped — the
            same info now lives next to the sort toggles below). */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2 truncate">
            <h2 className="truncate text-sm font-bold text-wn-navy">{title}</h2>
            {/* Live so a screen reader hears the match count change as
                the query is typed; polite so it never interrupts. */}
            <span
              aria-live="polite"
              aria-atomic="true"
              className="shrink-0 text-[11px] font-medium text-wn-charcoal/65"
            >
              {visible.length} of {enriched.length}
              <span className="sr-only"> resorts match</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            // Bigger touch target (44×44 minimum per WCAG 2.5.5 +
            // Apple HIG). The visible × stays small; the surrounding
            // button captures taps for the whole reachable area so
            // the user doesn't need a pixel-perfect thumb.
            className="-mr-1.5 -mt-1.5 inline-flex h-11 w-11 items-center justify-center text-2xl leading-none text-wn-charcoal/55 hover:text-wn-navy"
          >
            ×
          </button>
        </div>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          aria-label="Search resorts"
          placeholder="Search resorts"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            // The keyboard takes the lower ~40% of the viewport, so a
            // half-height sheet anchored to the bottom ends up almost
            // entirely behind it (audit mobile-ergonomics-13). Go to
            // full while typing; the user can drag it back down.
            if (isMobile && !fullScreen && snap !== "full") setSnap("full");
          }}
          // Stage 33 — explicit 16px font-size so iOS Safari doesn't
          // auto-zoom the viewport when the field is focused. Anything
          // < 16px triggers the zoom-in; visual look stays the same
          // (we drop a half-step of letter-spacing instead).
          style={{ fontSize: "16px" }}
          className="mt-1.5 min-h-[44px] w-full rounded-md border border-wn-charcoal/20 bg-white px-2.5 py-1.5 font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
        />

        {hiddenCount > 0 && (
          <p className="mt-1.5 text-[11px] leading-snug text-wn-charcoal/65">
            {hiddenCount} hidden by filters, still listed below. Tap to open.
          </p>
        )}
        <div className="mt-1 flex items-center gap-1 text-[11px]" role="group" aria-label="Sort">
          <button
            type="button"
            onClick={() => setSortBy("distance")}
            aria-pressed={sortBy === "distance"}
            className={`inline-flex min-h-[44px] touch-manipulation items-center rounded px-2.5 font-semibold transition md:min-h-0 md:py-0.5 ${
              sortBy === "distance"
                ? "bg-wn-navy text-white"
                : "bg-wn-charcoal/5 text-wn-charcoal/70 hover:bg-wn-charcoal/10"
            }`}
          >
            Closest first
          </button>
          <button
            type="button"
            onClick={() => setSortBy("name")}
            aria-pressed={sortBy === "name"}
            className={`inline-flex min-h-[44px] touch-manipulation items-center rounded px-2.5 font-semibold transition md:min-h-0 md:py-0.5 ${
              sortBy === "name"
                ? "bg-wn-navy text-white"
                : "bg-wn-charcoal/5 text-wn-charcoal/70 hover:bg-wn-charcoal/10"
            }`}
          >
            A–Z
          </button>
          <span className="ml-auto truncate text-wn-charcoal/65">
            from {fromPoint.label}
          </span>
          {onOpenFilters && (
            <button
              type="button"
              onClick={onOpenFilters}
              aria-haspopup="dialog"
              className="inline-flex min-h-[44px] touch-manipulation items-center gap-1.5 rounded-full border-2 border-wn-navy bg-wn-navy/5 px-3 text-[11px] font-bold text-wn-navy transition hover:bg-wn-navy/10 md:min-h-0 md:px-2.5 md:py-0.5"
            >
              <svg
                aria-hidden="true"
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 5h18l-7 9v6l-4-2v-4z" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wn-navy px-1 text-[10px] font-bold text-white">
                  {activeFilterCount}
                  <span className="sr-only"> active</span>
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      <ul
        // Stage 21.4 — touch-action + overscroll-contain stop scrolls
        // from chaining to the map behind. Without these, reaching the
        // top/bottom of the list let the touchmove escape to the map
        // canvas and pan it instead.
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          touchAction: "pan-y",
          // Full-screen mode pins the list to the viewport bottom, so
          // the last rows scrolled under the iPhone home indicator.
          paddingBottom: fullScreen
            ? "calc(env(safe-area-inset-bottom, 0px) + 12px)"
            : undefined,
        }}
        onTouchMove={(e) => {
          // Belt-and-suspenders: stop the scroll touchmove from
          // bubbling to Mapbox's document-level listeners.
          e.stopPropagation();
        }}
      >
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-wn-charcoal/65">
            No resorts match your search. Try the town or the state name.
          </li>
        )}
        {visible.map((r) => {
          const isPending = pendingSlug != null && pendingSlug === r.slug;
          return (
            <li key={r.slug} className="border-b border-wn-charcoal/5 last:border-b-0">
              <button
                type="button"
                onClick={() => handleRowClick(r.slug)}
                onMouseEnter={() => onHover?.(r.slug)}
                onFocus={() => onHover?.(r.slug)}
                onMouseLeave={() => onHover?.(null)}
                onBlur={() => onHover?.(null)}
                aria-current={isPending ? "true" : undefined}
                className={`flex min-h-[44px] w-full touch-manipulation items-center gap-3 px-3 py-2.5 text-left transition ${
                  isPending
                    ? "bg-wn-navy/10 ring-1 ring-inset ring-wn-navy/40"
                    : "hover:bg-wn-offwhite"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-semibold text-wn-navy">
                      {r.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-wn-charcoal/65">{r.state}</span>
                    {isPending && (
                      <span className="ml-auto shrink-0 rounded bg-wn-navy px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                        picking
                      </span>
                    )}
                    {r.alreadyInTrip && !isPending && (
                      <span className="ml-auto shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800">
                        in trip
                      </span>
                    )}
                    {r.hiddenByFilters && !isPending && !r.alreadyInTrip && (
                      <span className="ml-auto shrink-0 rounded bg-wn-charcoal/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-wn-charcoal/65">
                        hidden by filters
                        <span className="sr-only">, you can still open it</span>
                      </span>
                    )}
                  </div>
                  {/* Live snow indicator. Shows ❄️ amount when a resort
                      has fresh snow > 0; otherwise a small open / limited
                      dot when the scrape returned a meaningful status.
                      During the global off-season (May-Oct) every US
                      resort is closed; rendering 🌸/🔴 on each row turned
                      the search picker into noise, so the indicator is
                      suppressed entirely in that window. Re-appears in
                      November. */}
                  {!isGlobalOffSeasonNow() &&
                  ((r.snowNew24h != null && r.snowNew24h > 0) ||
                    r.currentlyOpen === true ||
                    r.currentlyOpen === false) ? (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-wn-charcoal/65">
                      {r.snowNew24h != null && r.snowNew24h > 0 ? (
                        <span className="font-semibold text-wn-sky">
                          ❄️ {r.snowNew24h}&quot; new
                        </span>
                      ) : r.currentlyOpen === true ? (
                        <span className="text-emerald-700">🟢 Open today</span>
                      ) : r.currentlyOpen === false ? (
                        <span className="text-red-700">🔴 Closed</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {/* Estimated: straight-line distance through the
                    lib/distance model, never a routed time. */}
                <span className="shrink-0 rounded bg-wn-offwhite px-2 py-0.5 text-[11px] font-semibold text-wn-navy">
                  <span className="sr-only">estimated drive </span>
                  {formatDriveTimeLabel(r.driveSeconds, true)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Preview-then-add bar — appears the moment the user taps a
          row. The map shows the dashed leg + pinned candidate behind.
          The user can keep tapping different rows above to swap the
          candidate (pendingSlug updates, ring border moves), dial the
          day count right here, and tap once to add the stop. Only
          renders when both pendingSlug and onConfirmPending are
          present, so the header-search picker is unaffected. The
          bottom padding keeps the button above the iPhone home
          indicator (the sheet is pinned to the viewport bottom). */}
      {pendingSlug && onConfirmPending && (() => {
        const name = pendingResortName ?? pendingSlug;
        const showStepper = pendingDays != null && onPendingDaysChange != null;
        const dayLabel = pendingDays == null ? "" : ` · ${pendingDays} day${pendingDays === 1 ? "" : "s"}`;
        return (
          <div
            className="shrink-0 border-t border-wn-navy/15 bg-wn-navy/[0.04] px-3 pt-2.5"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.625rem)" }}
          >
            {showStepper && (
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-sm font-bold text-wn-navy">{name}</span>
                <div
                  role="group"
                  aria-label={`Days at ${name}`}
                  className="flex shrink-0 items-center gap-1 rounded-md border border-wn-navy/30 bg-white px-1 py-0.5"
                >
                  <button
                    type="button"
                    onClick={() => onPendingDaysChange(-1)}
                    disabled={pendingDays <= 1}
                    className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded text-lg font-bold text-wn-navy hover:bg-wn-navy/10 disabled:opacity-30"
                    aria-label={`Fewer days at ${name}`}
                  >
                    −
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-[3.5rem] text-center text-[12px] font-bold text-wn-navy"
                  >
                    {pendingDays} day{pendingDays === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onPendingDaysChange(1)}
                    disabled={pendingDaysMax != null && pendingDays >= pendingDaysMax}
                    className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded text-lg font-bold text-wn-navy hover:bg-wn-navy/10 disabled:opacity-30"
                    aria-label={`More days at ${name}`}
                    title={
                      pendingDaysMax != null && pendingDays >= pendingDaysMax
                        ? "That fills the rest of your trip"
                        : "More days at this stop"
                    }
                  >
                    +
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={onConfirmPending}
              className="flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
            >
              <span aria-hidden="true">+</span>
              <span className="truncate">
                Add {name}{dayLabel}
              </span>
            </button>
            <p className="mt-1 text-center text-[11px] text-wn-charcoal/65">
              Or tap a different resort above to swap.
            </p>
          </div>
        );
      })()}
    </div>
  );
}
