// Round 9 (2026-06): shared presentation primitive for the
// nearby_restaurants + nearby_activities sections. Renders one
// "category strip" — emoji + label + a horizontally-scrollable row
// of POI cards. Used on both the /resort/[slug] page and (a
// compacted version of it) the ResortPanel modal.
//
// Every card is tappable even when the place has no website: the card
// body opens the place on Google Maps (where Google's own ratings +
// reviews live) and a "Directions" action drops a pin and starts
// navigation to the exact coordinates. No dead names.

import type { NearbyRow } from "@/lib/nearbyCategories";
import {
  distanceLabel,
  driveLabel,
  mapsPlaceUrl,
  mapsDirectionsUrl,
} from "@/lib/nearbyCategories";

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
          const placeUrl = mapsPlaceUrl(r.name, r.latitude, r.longitude);
          const dirUrl = mapsDirectionsUrl(r.name, r.latitude, r.longitude);
          const cardClass = isCompact
            ? "flex w-[180px] shrink-0 snap-start flex-col rounded-lg border border-wn-charcoal/10 bg-white p-2"
            : "flex w-[220px] shrink-0 snap-start flex-col rounded-lg border border-wn-charcoal/10 bg-white p-3 shadow-sm";
          return (
            <li key={r.id} className={cardClass}>
              {/* Body — tap to open the place (+ its Google reviews) in Maps. */}
              <a
                href={placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block flex-1"
                title={`${r.name} — open in Google Maps (ratings + reviews)`}
              >
                <div className={isCompact ? "truncate text-[13px] font-semibold text-wn-navy group-hover:underline" : "truncate text-sm font-bold text-wn-navy group-hover:underline"}>
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
              </a>
              {/* Action row — always-present Directions + optional Website. */}
              <div className="mt-2 flex items-center gap-1.5">
                <a
                  href={dirUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-wn-navy px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-wn-navy/90"
                  title={`Directions to ${r.name}`}
                >
                  <span aria-hidden="true">📍</span> Directions
                </a>
                {r.website_url && (
                  <a
                    href={r.website_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 rounded-md border border-wn-charcoal/15 px-2 py-1 text-[11px] font-semibold text-wn-navy transition hover:border-wn-navy"
                    title={`${r.name} website`}
                  >
                    Website
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
