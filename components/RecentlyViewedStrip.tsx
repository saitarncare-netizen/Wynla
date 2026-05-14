"use client";

import { useEffect, useState } from "react";
import {
  RECENT_CHANGE_EVENT,
  getRecent,
  type RecentResort,
} from "@/lib/recentlyViewed";
import { passColor } from "@/lib/passColors";

// Custom event the strip emits when a chip is tapped. MapPage listens
// for this and re-uses its existing setSelectedId + setCameraTarget
// path so we don't have to thread a callback through props.
export const OPEN_RESORT_EVENT = "wynla:open-resort";

export type OpenResortDetail = {
  id: number;
  slug: string;
  lat: number;
  lng: number;
};

// Horizontal-scroll strip of the user's last 8 viewed resorts. Hidden
// until there's at least one entry — empty state would be visual
// noise on a fresh visit. Placement is delegated to the parent (the
// component fixed-positions itself relative to the viewport).
export default function RecentlyViewedStrip() {
  const [list, setList] = useState<RecentResort[]>([]);

  useEffect(() => {
    function sync() {
      setList(getRecent());
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(RECENT_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(RECENT_CHANGE_EVENT, sync);
    };
  }, []);

  if (list.length === 0) return null;

  function onChipClick(r: RecentResort) {
    const detail: OpenResortDetail = {
      id: r.id,
      slug: r.slug,
      lat: r.lat,
      lng: r.lng,
    };
    window.dispatchEvent(new CustomEvent<OpenResortDetail>(OPEN_RESORT_EVENT, { detail }));
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-10 px-3 sm:px-6"
      // Position: mobile sits under the header pill row (~64px down);
      // desktop floats just above the pass legend (bottom-right).
      style={{
        top: "calc(env(safe-area-inset-top, 0px) + 64px)",
      }}
    >
      <div className="md:hidden">
        <Strip list={list} onChipClick={onChipClick} />
      </div>
      {/* Desktop: absolute-position above the pass legend at bottom-right */}
      <div
        className="pointer-events-none fixed bottom-20 right-6 z-10 hidden md:block"
        style={{ maxWidth: "calc(100vw - 3rem)" }}
      >
        <Strip list={list} onChipClick={onChipClick} compact />
      </div>
    </div>
  );
}

function Strip({
  list,
  onChipClick,
  compact = false,
}: {
  list: RecentResort[];
  onChipClick: (r: RecentResort) => void;
  compact?: boolean;
}) {
  return (
    <div
      className="pointer-events-auto rounded-full border border-wn-charcoal/10 bg-white/95 px-2 py-1.5 shadow-md backdrop-blur-sm"
      role="region"
      aria-label="Recently viewed resorts"
    >
      <div
        className="flex items-center gap-1.5 overflow-x-auto"
        style={{
          touchAction: "pan-x",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <span
          className="shrink-0 px-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55"
          aria-hidden="true"
        >
          Recent
        </span>
        {list.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onChipClick(r)}
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-wn-charcoal/15 bg-white px-2.5 font-medium text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy active:scale-95",
              compact ? "h-7 text-[11px]" : "h-7 text-[11px]",
            ].join(" ")}
            title={r.name}
            aria-label={`Open ${r.name}`}
          >
            <span
              aria-hidden="true"
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: passColor(r.primary_pass) }}
            />
            <span className="max-w-[7rem] truncate">{truncate(r.name, 14)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
