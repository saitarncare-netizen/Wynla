"use client";

// Modal search-and-pick for swapping a resort on a day card. Lists ALL
// active resorts (no pass / size / drive-cap filter) so a user willing
// to drive 8h on day 1 isn't blocked by the planner's 6h cap. Sorts by
// drive time from the previous stop by default; toggle for alphabetical.

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

export default function ResortPicker({
  open,
  title,
  fromPoint,
  allResorts,
  alreadyPicked,
  passFilter,
  onPassFilterChange,
  onSelect,
  onClose,
  onHover,
}: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"distance" | "name">("distance");
  // Track the most recent `open` value we've seen so we can clear the
  // query whenever the picker opens. React's recommended way to derive
  // state from a prop change without a setState-in-effect cascade.
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (open) setQuery("");
  }
  // Memoize so downstream useMemo deps see a stable identity (the
  // ?? would otherwise return a fresh empty array on every render
  // and invalidate the visible-list memo for nothing).
  const activePasses = useMemo(() => passFilter ?? [], [passFilter]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
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
    const q = query.trim().toLowerCase();
    let list = enriched;
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.state.toLowerCase().includes(q),
      );
    }
    if (activePasses.length > 0) {
      const filterSet = new Set(activePasses);
      list = list.filter((r) => r.passes.some((p) => filterSet.has(p)));
    }
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.driveSeconds - b.driveSeconds;
    });
    // No cap — show every match so the count label is honest. The list
    // is plain DOM rows under an overflow-y-auto container, so browser
    // virtualization handles the ~450 max comfortably (one repaint on
    // open, then scroll-only).
    return list;
  }, [enriched, query, sortBy, activePasses]);

  function togglePassChip(key: string) {
    const next = activePasses.includes(key)
      ? activePasses.filter((p) => p !== key)
      : [...activePasses, key];
    onPassFilterChange?.(next);
  }

  if (!open) return null;

  return (
    <>
      {/* Light scrim — no blur. We deliberately keep the map fully
          visible behind the picker so users can see the gold dashed
          preview line drawn from origin/last-stop to whatever resort
          they're hovering, plus their existing trip line. The 12%
          tint is just enough to signal "modal is in front" without
          hiding the map. Click outside to close (existing behavior). */}
      <button
        type="button"
        aria-label="Close picker"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-wn-charcoal/15"
      />
      {/* Picker container — on mobile renders as a top-docked card
          (max-w-md, near the top of the viewport). On desktop docks
          to the LEFT side as a 360px sidebar so the trip planner
          (right) + map (middle) + picker (left) don't overlap. The
          map middle stays visible the whole time. */}
      <div
        role="dialog"
        aria-label={title}
        className={[
          "fixed z-[61] flex flex-col overflow-hidden rounded-xl border border-wn-charcoal/15 bg-white shadow-2xl",
          // Mobile: top-docked, centered, max-w-md
          "inset-x-2 top-8 mx-auto max-h-[80vh] max-w-md",
          // Desktop (md+): left-docked sidebar. Cancel mobile centering
          // and switch to a fixed left rail.
          "md:inset-x-auto md:left-4 md:top-28 md:bottom-4 md:right-auto md:mx-0 md:max-h-none md:w-[360px] md:max-w-none",
        ].join(" ")}
      >
        <header className="shrink-0 border-b border-wn-charcoal/10 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-wn-navy">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="text-lg leading-none text-wn-charcoal/55 hover:text-wn-navy"
            >
              ×
            </button>
          </div>
          <p className="mt-0.5 text-[11px] text-wn-charcoal/55">
            From {fromPoint.label} · sorted by drive time
          </p>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search resorts… (e.g. loveland, MT, jackson)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-2 w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
          />
          {/* Pass-filter chip row. Multi-pass owners frequently want
              "Ikon + Epic" — clicking a chip toggles inclusion (OR
              semantics). Only chips with at least one matching resort
              in the current list are shown so we don't render dead
              chips for passes nobody in the picker has. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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

          <div className="mt-2 flex gap-1 text-[10px]">
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
            <span className="ml-auto text-wn-charcoal/45">
              {visible.length} resort{visible.length === 1 ? "" : "s"}
            </span>
          </div>
        </header>

        <ul className="flex-1 overflow-y-auto">
          {visible.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-wn-charcoal/55">
              No resorts match your search.
            </li>
          )}
          {visible.map((r) => (
            <li key={r.slug} className="border-b border-wn-charcoal/5 last:border-b-0">
              <button
                type="button"
                onClick={() => onSelect(r.slug)}
                onMouseEnter={() => onHover?.(r.slug)}
                onFocus={() => onHover?.(r.slug)}
                onMouseLeave={() => onHover?.(null)}
                onBlur={() => onHover?.(null)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-wn-offwhite"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="truncate text-sm font-semibold text-wn-navy">
                      {r.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-wn-charcoal/55">{r.state}</span>
                    {r.alreadyInTrip && (
                      <span className="ml-auto shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800">
                        in trip
                      </span>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-wn-offwhite px-2 py-0.5 text-[11px] font-semibold text-wn-navy">
                  ≈ {formatDriveTime(r.driveSeconds)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
