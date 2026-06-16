// Round 9 (2026-06): shared presentation primitive for the
// nearby_restaurants + nearby_activities sections. Renders one
// "category strip" — emoji + label + a horizontally-scrollable row
// of POI cards. Used on both the /resort/[slug] page and (a
// compacted version of it) the ResortPanel modal.
//
// The data shape (NearbyRow) is fully captured in lib/nearbyCategories;
// this component is a dumb renderer with two layout modes — `full`
// (resort detail page) and `compact` (panel).

import type { NearbyRow } from "@/lib/nearbyCategories";
import { distanceLabel, driveLabel } from "@/lib/nearbyCategories";

type Props = {
  /** Emoji + label for the section header. */
  emoji: string;
  label: string;
  blurb?: string;
  rows: NearbyRow[];
  /** Compact = tighter spacing for the ResortPanel modal. */
  variant?: "full" | "compact";
};

export default function NearbyGroup({ emoji, label, blurb, rows, variant = "full" }: Props) {
  if (!rows || rows.length === 0) return null;

  const isCompact = variant === "compact";

  return (
    <section className={isCompact ? "mt-3" : "mt-6"}>
      <header className={isCompact ? "mb-1.5 flex items-baseline gap-2" : "mb-2 flex items-baseline gap-2"}>
        <span aria-hidden="true" className={isCompact ? "text-base" : "text-lg"}>
          {emoji}
        </span>
        <h3 className={isCompact ? "text-sm font-bold text-wn-navy" : "text-base font-extrabold text-wn-navy"}>
          {label}
        </h3>
        {blurb && !isCompact && (
          <span className="text-[11px] text-wn-charcoal/55">— {blurb}</span>
        )}
      </header>
      <ul
        // Horizontal scroll on mobile so a long category doesn't push
        // the whole detail page into a giant vertical list. Snap to
        // each card for finger-flick browsing.
        className="-mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 pb-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {rows.map((r) => {
          const dist = distanceLabel(r.distance_km);
          const drive = driveLabel(r.drive_minutes);
          const meta = [dist, drive].filter(Boolean).join(" · ");
          const cardClass = isCompact
            ? "flex w-[180px] shrink-0 snap-start flex-col rounded-lg border border-wn-charcoal/10 bg-white p-2"
            : "flex w-[220px] shrink-0 snap-start flex-col rounded-lg border border-wn-charcoal/10 bg-white p-3 shadow-sm";
          const inner = (
            <>
              <div className={isCompact ? "truncate text-[13px] font-semibold text-wn-navy" : "truncate text-sm font-bold text-wn-navy"}>
                {r.name}
              </div>
              {r.description && (
                <div className="mt-0.5 truncate text-[11px] capitalize text-wn-charcoal/55">
                  {r.description}
                </div>
              )}
              {meta && (
                <div className="mt-1 text-[11px] font-medium text-wn-charcoal/65">
                  {meta}
                </div>
              )}
            </>
          );
          if (r.website_url) {
            return (
              <li key={r.id} className="contents">
                <a
                  href={r.website_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={`${cardClass} transition hover:border-wn-navy hover:shadow-md`}
                  title={`${r.name} — opens in a new tab`}
                >
                  {inner}
                </a>
              </li>
            );
          }
          return (
            <li key={r.id} className={cardClass}>
              {inner}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
