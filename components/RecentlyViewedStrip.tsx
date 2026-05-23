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
// until there's at least one entry — empty state would be visual noise
// on a fresh visit.
//
// Stage 5 round 4 — single inline variant for all viewport sizes.
// Previously had a desktop "fixed bottom-20 right-6" floating pill
// variant, but the parent header uses `backdrop-blur-sm` which creates
// a containing block for `position: fixed` (CSS spec — any element with
// `filter` / `backdrop-filter` / `transform` etc traps fixed-positioned
// descendants). The desktop pill rendered at TOP of the header instead
// of bottom of viewport, overlapping the header pill row. Solution:
// drop the desktop fixed variant and let the inline mobile variant
// render at every size. Header already has room for it.
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
    window.dispatchEvent(
      new CustomEvent<OpenResortDetail>(OPEN_RESORT_EVENT, { detail }),
    );
  }

  // Stage 33 — stop touch propagation at both React + DOM layers.
  // Mapbox listens at window level so React's stopPropagation alone
  // doesn't prevent its drag handler from firing.
  const stopTouchBubble = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    // Single inline strip — stacks cleanly with the header brand row,
    // quick-filter chips, and off-season banner on every breakpoint.
    <div
      className="px-3 pb-2 sm:px-6"
      onTouchStart={stopTouchBubble}
      onTouchMove={stopTouchBubble}
      onTouchEnd={stopTouchBubble}
    >
      <Strip list={list} onChipClick={onChipClick} />
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
      className="pointer-events-auto rounded-full border border-wn-charcoal/10 bg-white/95 px-2 py-1 shadow-sm backdrop-blur-sm"
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
          className="shrink-0 px-1 text-[9px] font-bold uppercase tracking-wider text-wn-charcoal/45"
          aria-hidden="true"
        >
          🕐
        </span>
        {list.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onChipClick(r)}
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-wn-charcoal/15 bg-white px-2 font-medium text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy active:scale-95",
              compact ? "h-6 text-[10px]" : "h-6 text-[10px]",
            ].join(" ")}
            title={r.name}
            aria-label={`Open ${r.name}`}
          >
            <span
              aria-hidden="true"
              className="block h-1.5 w-1.5 rounded-full"
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
