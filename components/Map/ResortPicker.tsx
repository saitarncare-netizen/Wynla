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
import { formatDriveTime } from "@/lib/origins";
import { PASS_COLORS, PASS_KEYS, PASS_LABELS } from "@/lib/passColors";
import type { Resort } from "./MapPage";

type Props = {
  open: boolean;
  title: string;
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
      "Confirm [Resort]" sticky footer that appears when a candidate
      is selected but not yet confirmed. */
  pendingResortName?: string | null;
  /** Fires when the user taps the sticky "Confirm [Resort]" footer.
      Parent advances the wizard from `pick` to `confirm-days`. */
  onConfirmPending?: () => void;
  /** Current global pass filter. The picker's chip row IS this set —
      toggling a chip in the picker calls onPassFilterChange which
      updates the URL, which feeds back here, which re-renders the
      chips AND re-filters the map behind. Single source of truth, so
      a multi-pass owner ticking "Ikon + Epic" inside the picker also
      sees the map narrow to those passes. */
  passFilter?: string[];
  onPassFilterChange?: (passes: string[]) => void;
  onSelect: (slug: string) => void;
  onClose: () => void;
  /** Live hover preview — fires when the user mouseenters a row so the
      map can draw an ephemeral leg from fromPoint to that resort. */
  onHover?: (slug: string | null) => void;
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
  fromPoint,
  allResorts,
  alreadyPicked,
  pendingSlug,
  pendingResortName,
  onConfirmPending,
  passFilter,
  onPassFilterChange,
  onSelect,
  onClose,
  onHover,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "name">("distance");
  // Stage 33 — local fresh-snow toggle. Doesn't write to URL since the
  // picker is a transient view; users can flip it on inside the search
  // sheet to surface powder candidates without changing the map filter
  // behind. Resets to false every time the picker opens.
  const [freshSnowFilter, setFreshSnowFilter] = useState(false);
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
      setFreshSnowFilter(false);
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

  // Memoize so downstream useMemo deps see a stable identity (the
  // ?? would otherwise return a fresh empty array on every render
  // and invalidate the visible-list memo for nothing).
  const activePasses = useMemo(() => passFilter ?? [], [passFilter]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    // Skip autofocus on mobile — focusing the search input pops the
    // iOS keyboard, which immediately occludes half the picker. The
    // user can tap the input themselves when they want to type.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // ESC to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const enriched = useMemo(() => {
    const pickedSet = new Set(alreadyPicked);
    return allResorts
      .filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)))
      .map((r) => {
        const lat = Number(r.latitude);
        const lng = Number(r.longitude);
        const meters = haversineMeters(fromPoint.lat, fromPoint.lng, lat, lng);
        return {
          slug: r.slug,
          name: r.name,
          state: r.state,
          passes: r.passes ?? [],
          driveSeconds: estimateDriveSeconds(meters),
          alreadyInTrip: pickedSet.has(r.slug),
          // Stage 33 — surface live snow data on the row so the user
          // can spot powder destinations without opening each resort.
          snowNew24h: r.snow_new_24h_in,
          snowReportStatus: r.snow_report_status,
        };
      });
  }, [allResorts, fromPoint, alreadyPicked]);

  // Pass counts inside the picker — used for chip badges so the user
  // can see "12 Ikon · 18 Epic" before clicking. Counts respect the
  // pre-pass filtering (whatever the parent passed in `allResorts`),
  // so they line up with what's actually pickable.
  const passCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of enriched) {
      for (const p of r.passes) {
        counts[p] = (counts[p] ?? 0) + 1;
      }
    }
    return counts;
  }, [enriched]);

  const visible = useMemo(() => {
    // Stage 33 — typo-tolerant search.
    // Strip non-alphanumerics from BOTH sides so "Blue wood" matches
    // "Bluewood", "park-city" matches "Park City", and apostrophes /
    // ampersands don't fail the match. Then split into tokens and
    // require ALL tokens to be substring-present (any order).
    const normalize = (s: string) =>
      s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map((t) => normalize(t))
      .filter((t) => t.length > 0);
    let list = enriched;
    if (tokens.length > 0) {
      list = list.filter((r) => {
        const haystack = normalize(r.name + " " + r.state);
        return tokens.every((t) => haystack.includes(t));
      });
    }
    if (activePasses.length > 0) {
      const filterSet = new Set(activePasses);
      list = list.filter((r) => r.passes.some((p) => filterSet.has(p)));
    }
    if (freshSnowFilter) {
      list = list.filter(
        (r) => r.snowNew24h != null && r.snowNew24h > 0,
      );
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.driveSeconds - b.driveSeconds;
    });
    return list;
  }, [enriched, query, sortBy, activePasses, freshSnowFilter]);

  function togglePassChip(key: string) {
    const next = activePasses.includes(key)
      ? activePasses.filter((p) => p !== key)
      : [...activePasses, key];
    onPassFilterChange?.(next);
  }

  // Stage 33 — count of resorts (within the current pool, before any
  // pass / fresh-snow filter is applied) that have fresh snow. Powers
  // the chip's badge ("Fresh snow · 2") so users know if it's worth
  // toggling.
  const freshSnowCount = useMemo(
    () =>
      enriched.filter((r) => r.snowNew24h != null && r.snowNew24h > 0)
        .length,
    [enriched],
  );

  function handleRowClick(slug: string) {
    onSelect(slug);
    // Stage 21.1 — both call sites (header-search MapPage + trip
    // planner wizard) close the picker on row tap now, so we no
    // longer auto-collapse here. The bottom sheet exits cleanly.
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

  const sheetHeight = isMobile ? (dragHeight ?? snapToPx(snap, vh)) : undefined;

  return (
    <div
      role="dialog"
      aria-label={title}
      className={[
        "fixed z-[61] flex flex-col overflow-hidden bg-white shadow-2xl",
        // Mobile: bottom sheet — full width, top corners rounded, sits
        // on the bottom edge with no left/right gap so it doesn't look
        // like a floating card.
        "inset-x-0 bottom-0 rounded-t-2xl border-t border-wn-charcoal/15",
        // Desktop (md+): left-docked sidebar. Cancel mobile bottom-sheet
        // styling and switch to a fixed left rail.
        "md:inset-x-auto md:bottom-4 md:left-4 md:top-28 md:w-[360px] md:rounded-xl md:border md:border-wn-charcoal/15",
      ].join(" ")}
      style={{
        // Mobile only — desktop height is driven by md:top-28 / md:bottom-4.
        height: sheetHeight != null ? `${sheetHeight}px` : undefined,
        // No transition while actively dragging — the user expects the
        // sheet to track their finger 1:1, then animate to the snap
        // when they release.
        transition: dragHeight !== null ? "none" : "height 220ms cubic-bezier(0.16,1,0.3,1)",
      }}
    >
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

      <header className="shrink-0 border-b border-wn-charcoal/10 px-3 pb-2 pt-1.5 md:pt-3">
        {/* Stage 33 — header slimmed: title + count + close all on one
            row (subtitle "From X · sorted by drive time" dropped — the
            same info now lives next to the sort toggles below). */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2 truncate">
            <h3 className="truncate text-sm font-bold text-wn-navy">{title}</h3>
            <span className="shrink-0 text-[10px] font-medium text-wn-charcoal/50">
              {visible.length} of {enriched.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-lg leading-none text-wn-charcoal/55 hover:text-wn-navy"
          >
            ×
          </button>
        </div>
        <input
          ref={inputRef}
          type="search"
          placeholder="Search resorts…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (isMobile && snap === "collapsed") setSnap("half");
          }}
          className="mt-1.5 w-full rounded-md border border-wn-charcoal/20 bg-white px-2.5 py-1.5 text-sm font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
        />
        {/* Pass-filter chip row + Stage 33 fresh-snow chip. Multi-pass
            owners frequently want "Ikon + Epic" — clicking a chip
            toggles inclusion (OR semantics). Only chips with at least
            one matching resort in the current list are shown so we
            don't render dead chips for passes nobody in the picker
            has. The Fresh snow chip leads the row because it's the
            most actionable filter when powder is falling. */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {freshSnowCount > 0 && (
            <button
              type="button"
              onClick={() => setFreshSnowFilter((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                freshSnowFilter
                  ? "border-wn-sky bg-wn-sky/10 text-wn-navy"
                  : "border-wn-sky/40 bg-white text-wn-navy hover:border-wn-sky"
              }`}
              aria-pressed={freshSnowFilter}
              title={`Fresh snow (${freshSnowCount})`}
            >
              <span aria-hidden="true">❄️</span>
              <span>Fresh snow</span>
              <span className="text-wn-charcoal/55">{freshSnowCount}</span>
            </button>
          )}
          {PASS_KEYS.filter((k) => (passCounts[k] ?? 0) > 0).map((k) => {
            const isActive = activePasses.includes(k);
            const count = passCounts[k] ?? 0;
            return (
              <button
                key={k}
                type="button"
                onClick={() => togglePassChip(k)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition ${
                  isActive
                    ? "border-wn-navy bg-wn-navy text-white"
                    : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                }`}
                aria-pressed={isActive}
                title={`${PASS_LABELS[k]} (${count})`}
              >
                <span
                  className="block h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PASS_COLORS[k] }}
                  aria-hidden="true"
                />
                <span>{PASS_LABELS[k]}</span>
                <span className={isActive ? "text-white/70" : "text-wn-charcoal/55"}>
                  {count}
                </span>
              </button>
            );
          })}
          {activePasses.length > 0 && (
            <button
              type="button"
              onClick={() => onPassFilterChange?.([])}
              className="text-[10px] font-semibold text-wn-charcoal/55 underline-offset-2 hover:text-wn-navy hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => setSortBy("distance")}
            className={`rounded px-2 py-0.5 font-semibold transition ${
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
            className={`rounded px-2 py-0.5 font-semibold transition ${
              sortBy === "name"
                ? "bg-wn-navy text-white"
                : "bg-wn-charcoal/5 text-wn-charcoal/70 hover:bg-wn-charcoal/10"
            }`}
          >
            A–Z
          </button>
          <span className="ml-auto truncate text-wn-charcoal/45">
            from {fromPoint.label}
          </span>
        </div>
      </header>

      <ul
        // Stage 21.4 — touch-action + overscroll-contain stop scrolls
        // from chaining to the map behind. Without these, reaching the
        // top/bottom of the list let the touchmove escape to the map
        // canvas and pan it instead.
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ touchAction: "pan-y" }}
        onTouchMove={(e) => {
          // Belt-and-suspenders: stop the scroll touchmove from
          // bubbling to Mapbox's document-level listeners.
          e.stopPropagation();
        }}
      >
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-xs text-wn-charcoal/55">
            No resorts match your search.
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
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
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
                    <span className="shrink-0 text-[10px] text-wn-charcoal/55">{r.state}</span>
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
                  </div>
                  {/* Stage 33 — live snow indicator. Shows ❄️ amount when
                      a resort has fresh snow > 0; otherwise a small open
                      🟢 / off-season 🌸 / closed 🔴 dot when status is
                      set. Resorts with no scrape data render nothing. */}
                  {(r.snowNew24h != null && r.snowNew24h > 0) ||
                  r.snowReportStatus ? (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-wn-charcoal/65">
                      {r.snowNew24h != null && r.snowNew24h > 0 ? (
                        <span className="font-semibold text-wn-sky">
                          ❄️ {r.snowNew24h}&quot; new
                        </span>
                      ) : r.snowReportStatus === "open" ? (
                        <span className="text-emerald-700">🟢 Open today</span>
                      ) : r.snowReportStatus === "closed" ? (
                        <span className="text-red-700">🔴 Closed</span>
                      ) : r.snowReportStatus === "limited" ? (
                        <span className="text-amber-700">🟡 Limited</span>
                      ) : r.snowReportStatus === "off-season" ? (
                        <span className="text-wn-charcoal/50">🌸 Off-season</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <span className="shrink-0 rounded bg-wn-offwhite px-2 py-0.5 text-[11px] font-semibold text-wn-navy">
                  ≈ {formatDriveTime(r.driveSeconds)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Stage 21.3 preview-confirm bar — appears the moment the user
          taps a row. The map shows the dashed leg + pinned candidate
          behind. User can keep tapping different rows above to swap
          the candidate (pendingSlug updates, ring border moves), or
          tap this footer to lock it in and move to the days step.
          Only renders when both pendingSlug and onConfirmPending are
          present, so the header-search picker (no preview-confirm
          flow) is unaffected. */}
      {pendingSlug && onConfirmPending && (
        <div className="shrink-0 border-t border-wn-navy/15 bg-wn-navy/[0.04] px-3 py-2.5">
          <button
            type="button"
            onClick={onConfirmPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
          >
            <span aria-hidden="true">✓</span>
            <span className="truncate">
              Confirm {pendingResortName ?? pendingSlug}
            </span>
          </button>
          <p className="mt-1 text-center text-[10px] text-wn-charcoal/55">
            Or tap a different resort above to swap.
          </p>
        </div>
      )}
    </div>
  );
}
