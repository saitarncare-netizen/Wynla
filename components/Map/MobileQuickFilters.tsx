"use client";

// Phone chip strip with ONE job: quick pass toggle + map pin colour
// legend. Every other filter lives in the FiltersDrawer, so the same
// filter never exists in three places.
//
// Map shell 2026-09-23: a fixed 40 px row (36 px chips) that scrolls with
// no visible scrollbar, chips inset from the screen edge, ordered by how
// many riders hold the pass (Ikon / Epic first — audit fresh-eyes-
// newbie-43), and the no-pass chip reads "No pass" so "Independent" is
// not mistaken for a pass product (fresh-eyes-newbie-44).

import { PASS_COLORS, PASS_LABELS, type Pass } from "@/lib/passColors";
import { HIT_AREA_44 } from "@/lib/hitArea";

type Props = {
  passFilter: string[];
  passCounts: Record<string, number>;
  onPassChange: (passes: string[]) => void;
};

// Display order + chip copy. The map's PASS_KEYS order is the pin
// priority (Mountain Collective first, because a resort on it and Ikon
// gets the rarer colour); riders read the row by familiarity instead.
const CHIP_ORDER: ReadonlyArray<{ key: Pass; label: string; aria: string }> = [
  { key: "ikon", label: PASS_LABELS.ikon, aria: "Ikon Pass resorts" },
  { key: "epic", label: PASS_LABELS.epic, aria: "Epic Pass resorts" },
  { key: "indy", label: PASS_LABELS.indy, aria: "Indy Pass resorts" },
  { key: "mountain_collective", label: "Mtn Collective", aria: "Mountain Collective resorts" },
  { key: "independent", label: "No pass", aria: "Independent resorts, not on a multi-resort pass" },
];

export default function MobileQuickFilters({ passFilter, passCounts, onPassChange }: Props) {
  function toggle(p: Pass) {
    const cur = new Set(passFilter);
    if (cur.has(p)) cur.delete(p);
    else cur.add(p);
    onPassChange(Array.from(cur));
  }

  // Stop touch events at both React + native DOM layers so the chip
  // strip doesn't leak swipes through to Mapbox underneath.
  const stopTouchBubble = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  // The scroller inherits pointer-events-none from the transparent header
  // and only the chip strip (sized to its content) opts back in: a touch
  // right of the last chip pans the map, a touch on a chip scrolls the
  // strip because scrolling walks up to the nearest scrollable ancestor.
  //
  // The scroller is 44 px tall with -2 px margins: an overflow scroller
  // clips hit-testing at its own box, so this is what lets each 36 px
  // chip keep a full 44 px hit area while the row still adds only 40 px
  // to the header (MOBILE_CHROME.chipRow).
  return (
    <div
      className="-my-0.5 flex h-11 items-center overflow-x-auto px-2 md:hidden"
      style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      aria-label="Quick pass filters"
      role="region"
      onTouchStart={stopTouchBubble}
      onTouchMove={stopTouchBubble}
      onTouchEnd={stopTouchBubble}
    >
      <div className="pointer-events-auto flex w-max items-center gap-1.5">
        {CHIP_ORDER.map(({ key, label, aria }) => {
          const active = passFilter.includes(key);
          const count = passCounts[key] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={[
                HIT_AREA_44,
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold shadow-sm backdrop-blur-sm transition active:scale-95",
                active
                  ? "border-2 border-wn-navy bg-white text-wn-navy"
                  : "border border-wn-charcoal/15 bg-white/95 text-wn-charcoal/80",
              ].join(" ")}
              aria-pressed={active}
              aria-label={`${aria} (${count})`}
            >
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PASS_COLORS[key] }}
              />
              <span>{label}</span>
              <span className="text-[11px] font-normal tabular-nums text-wn-charcoal/75">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
