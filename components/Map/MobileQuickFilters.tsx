"use client";

// Mobile-only quick-filter chip row. Two jobs at once:
//
//   1. Replaces the "no pass legend on mobile" gap — chip color =
//      pass color, so the user learns the color system by tapping.
//   2. Replaces "open the filter drawer just to toggle Ikon" — most
//      users only care about their pass; making it a 1-tap toggle
//      cuts filter-discovery friction massively.
//
// Hidden on desktop because the FilterBar already serves both roles.

import { PASS_COLORS, PASS_KEYS, PASS_LABELS, type Pass } from "@/lib/passColors";
import { isGlobalOffSeasonNow } from "@/lib/seasonDates";

// Stage 33 — "For you" skill filter removed. Mid-size and bigger
// resorts (Vail, Killington, Park City) ALL got hidden from beginners
// even though they have plenty of green terrain — the threshold was
// fooled by big mountains where the %s lean expert. Penalizing
// resorts that legitimately serve all skill levels hurts both users
// and resorts. skillLevel from onboarding still saves to localStorage
// for future use (badges, curated lists, sort order); we just stopped
// using it to HIDE resorts.
type Props = {
  passFilter: string[];
  passCounts: Record<string, number>;
  freshSnowOnly: boolean;
  freshSnowCount: number;
  onPassChange: (passes: string[]) => void;
  onFreshSnowChange: (v: boolean) => void;
};

export default function MobileQuickFilters({
  passFilter,
  passCounts,
  freshSnowOnly,
  freshSnowCount,
  onPassChange,
  onFreshSnowChange,
}: Props) {
  function toggle(p: Pass) {
    const cur = new Set(passFilter);
    if (cur.has(p)) cur.delete(p);
    else cur.add(p);
    onPassChange(Array.from(cur));
  }

  // Stage 33 — touch events stopped at both React + DOM levels. React's
  // stopPropagation alone wasn't enough because Mapbox attaches its
  // drag listeners at window/document level; only stopImmediatePropagation
  // on the native event prevents Mapbox from interpreting our chip
  // taps as a map pan-start gesture.
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
        {(passFilter.length > 0 || freshSnowOnly) && (
          <button
            type="button"
            onClick={() => {
              onPassChange([]);
              onFreshSnowChange(false);
            }}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-wn-charcoal/15 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal/75 shadow-sm backdrop-blur-sm active:scale-95"
            aria-label="Clear filters"
          >
            <span aria-hidden="true">✕</span>
            <span>Clear</span>
          </button>
        )}
        {/* Stage 33 — Fresh snow chip. Hidden during May-Oct off-season
            because any fresh snow is on resorts that aren't actually
            operating (Mt Hood, etc) — surfacing it as a filter just
            lured users into closed-resort dead-ends. Re-appears in
            winter. */}
        {freshSnowCount > 0 && !isGlobalOffSeasonNow() && (
          <button
            type="button"
            onClick={() => onFreshSnowChange(!freshSnowOnly)}
            className={[
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm transition active:scale-95",
              freshSnowOnly
                ? "border-2 border-wn-sky bg-wn-sky/10 text-wn-navy"
                : "border border-wn-sky/40 bg-white/95 text-wn-navy",
            ].join(" ")}
            aria-pressed={freshSnowOnly}
            aria-label={`Toggle fresh snow filter (${freshSnowCount} resorts with snow)`}
          >
            <span aria-hidden="true">❄️</span>
            <span>Fresh snow</span>
            <span className="text-[10px] font-normal text-wn-charcoal/55">
              {freshSnowCount}
            </span>
          </button>
        )}
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
