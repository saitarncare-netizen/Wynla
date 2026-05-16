"use client";

// Stage 33 final — Mobile chip strip stripped down to its ONE clear job:
// quick pass toggle + map pin color legend. Every other filter
// (Fresh snow, Night, Size, Drive, Airport) lives exclusively in the
// FiltersDrawer now to avoid the "same filter exists in 3 places"
// confusion users hit during testing.

import {
  PASS_COLORS,
  PASS_KEYS,
  PASS_LABELS,
  type Pass,
} from "@/lib/passColors";

type Props = {
  passFilter: string[];
  passCounts: Record<string, number>;
  onPassChange: (passes: string[]) => void;
};

export default function MobileQuickFilters({
  passFilter,
  passCounts,
  onPassChange,
}: Props) {
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

  return (
    <div
      className="md:hidden -mx-3 px-3 pb-1 pt-2 overflow-x-auto"
      style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
      aria-label="Quick pass filters"
      role="region"
      onTouchStart={stopTouchBubble}
      onTouchMove={stopTouchBubble}
      onTouchEnd={stopTouchBubble}
    >
      <div className="flex items-center gap-1.5">
        {PASS_KEYS.map((p) => {
          const active = passFilter.includes(p);
          const count = passCounts[p] ?? 0;
          if (count === 0) return null;
          return (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className={[
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition active:scale-95",
                active
                  ? "border-2 border-wn-navy bg-white text-wn-navy"
                  : "border border-wn-charcoal/15 bg-white/95 text-wn-charcoal/75",
              ].join(" ")}
              aria-pressed={active}
              aria-label={`Toggle ${PASS_LABELS[p]} filter (${count} resorts)`}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: PASS_COLORS[p] }}
              />
              <span>{PASS_LABELS[p]}</span>
              <span className="text-[10px] font-normal text-wn-charcoal/55">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
