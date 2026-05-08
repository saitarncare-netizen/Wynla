"use client";

// Modal search-and-pick for swapping a resort on a day card. Lists ALL
// active resorts (no pass / size / drive-cap filter) so a user willing
// to drive 8h on day 1 isn't blocked by the planner's 6h cap. Sorts by
// drive time from the previous stop by default; toggle for alphabetical.

import { useEffect, useMemo, useRef, useState } from "react";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { formatDriveTime } from "@/lib/origins";
import type { Resort } from "./MapPage";

type Props = {
  open: boolean;
  title: string;
  fromPoint: { lat: number; lng: number; label: string };
  allResorts: Resort[];
  /** Slugs already in the trip — shown as "in trip" tags but still clickable. */
  alreadyPicked: string[];
  onSelect: (slug: string) => void;
  onClose: () => void;
};

export default function ResortPicker({
  open,
  title,
  fromPoint,
  allResorts,
  alreadyPicked,
  onSelect,
  onClose,
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
          driveSeconds: estimateDriveSeconds(meters),
          alreadyInTrip: pickedSet.has(r.slug),
        };
      });
  }, [allResorts, fromPoint, alreadyPicked]);

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
    list = [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return a.driveSeconds - b.driveSeconds;
    });
    // Cap to 100 hits — the list virtualizes naturally with browser scrolling
    // but keeping it bounded avoids a 451-row paint when the user opens it
    // without typing.
    return list.slice(0, 200);
  }, [enriched, query, sortBy]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close picker"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-wn-charcoal/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-label={title}
        className="fixed inset-x-2 top-8 z-[61] mx-auto flex max-h-[80vh] max-w-md flex-col overflow-hidden rounded-xl border border-wn-charcoal/15 bg-white shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
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
              {visible.length === 200 ? "200+" : visible.length} resorts
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
