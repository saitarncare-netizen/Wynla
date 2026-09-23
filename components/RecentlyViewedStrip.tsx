"use client";

import { useEffect, useState } from "react";
import {
  RECENT_CHANGE_EVENT,
  getRecent,
  type RecentResort,
} from "@/lib/recentlyViewed";
import { passColor } from "@/lib/passColors";
import { HIT_AREA_44 } from "@/lib/hitArea";

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

function useRecentList(): RecentResort[] {
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
  return list;
}

function openResort(r: RecentResort) {
  const detail: OpenResortDetail = { id: r.id, slug: r.slug, lat: r.lat, lng: r.lng };
  window.dispatchEvent(new CustomEvent<OpenResortDetail>(OPEN_RESORT_EVENT, { detail }));
}

/**
 * Bare recent-resort chips for the phone header's secondary row
 * (MapPage renders them after the Saturday / Today / trip pills, in the
 * same scroller). Renders nothing until there is at least one entry.
 * 36 px tall to match the row's pills; the row itself is 44 px.
 */
export function RecentChips() {
  const list = useRecentList();
  if (list.length === 0) return null;
  return (
    <>
      <span
        className="shrink-0 pl-1 text-[11px] font-bold uppercase tracking-wider text-wn-charcoal/75"
        aria-hidden="true"
      >
        Recent
      </span>
      {list.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => openResort(r)}
          className={`${HIT_AREA_44} inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-wn-charcoal/15 bg-white/95 px-3 text-[12px] font-medium text-wn-charcoal shadow-sm backdrop-blur-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95`}
          title={r.name}
          aria-label={`Open ${r.name}`}
        >
          <span
            aria-hidden="true"
            className="block h-2 w-2 rounded-full"
            style={{ backgroundColor: passColor(r.primary_pass) }}
          />
          <span className="max-w-[8rem] truncate">{truncate(r.name, 16)}</span>
        </button>
      ))}
    </>
  );
}

// Desktop strip of the last 8 viewed resorts, inline under the header
// rows. Hidden until there's at least one entry. (The earlier fixed
// bottom-right variant broke because the header's backdrop-filter is a
// containing block for position: fixed.)
export default function RecentlyViewedStrip() {
  const list = useRecentList();
  if (list.length === 0) return null;

  return (
    <div className="px-3 pb-2 sm:px-6">
      <div
        className="pointer-events-auto rounded-full border border-wn-charcoal/10 bg-white/95 px-2 py-1 shadow-sm backdrop-blur-sm"
        role="region"
        aria-label="Recently viewed resorts"
      >
        <div
          className="flex items-center gap-1.5 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
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
              onClick={() => openResort(r)}
              className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-wn-charcoal/15 bg-white px-2 text-[10px] font-medium text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy active:scale-95"
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
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
