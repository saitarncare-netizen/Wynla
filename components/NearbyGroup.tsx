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
  prettifyDescription,
} from "@/lib/nearbyCategories";
import Icon from "@/components/icons/Icon";
import { HIT_AREA_44 } from "@/lib/hitArea";

// Shared look for the two small card actions: 36 px tall, grown to a
// 44 px tap box by HIT_AREA_44 (the li padding keeps it inside the
// horizontal scroller, which would otherwise clip it).
const ACTION = `${HIT_AREA_44} inline-flex min-h-9 items-center gap-1 rounded-wn-sm px-2 text-xs font-semibold transition`;

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
  // ⭐ Recommended picks float to the front of each strip, then nearest first.
  const sorted = [...rows].sort(
    (a, b) =>
      Number(!!b.is_recommended) - Number(!!a.is_recommended) ||
      (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9),
  );

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
          <span className="text-xs text-wn-muted">— {blurb}</span>
        )}
      </header>
      <ul
        // Horizontal scroll on mobile so a long category doesn't push
        // the whole detail page into a giant vertical list. Snap to
        // each card for finger-flick browsing.
        className="-mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 pb-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {sorted.slice(0, isCompact ? 8 : 12).map((r) => {
          const dist = distanceLabel(r.distance_km);
          const drive = driveLabel(r.drive_minutes);
          const meta = [dist, drive].filter(Boolean).join(" · ");
          const placeUrl = mapsPlaceUrl(r.name, r.latitude, r.longitude);
          const dirUrl = mapsDirectionsUrl(r.name, r.latitude, r.longitude);
          const rec = !!r.is_recommended;
          // Raw OSM tags ("Steak_house", "donut;coffee_shop") and the
          // importer's street-address fallback are normalised at render
          // time; an address comes back as "" and the line is hidden.
          const description = prettifyDescription(r.description);
          const base = isCompact
            ? "flex w-[180px] shrink-0 snap-start flex-col rounded-wn-sm border bg-white p-2"
            : "flex w-[220px] shrink-0 snap-start flex-col rounded-wn-sm border bg-white p-3 shadow-wn-sm";
          const cardClass = `${base} ${rec ? "border-wn-gold-halo/60 bg-wn-warning-bg/60 ring-1 ring-wn-gold/40" : "border-wn-line"}`;
          return (
            <li key={r.id} className={cardClass}>
              {rec && (
                <div className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-wn-warning-bg px-2 py-0.5 text-eyebrow font-bold uppercase text-wn-warning">
                  <Icon name="star" className="h-3 w-3" /> Recommended
                </div>
              )}
              {/* Body — tap to open the place (+ its Google reviews) in Maps. */}
              <a
                href={placeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block flex-1"
                title={`${r.name} — open in Google Maps (ratings + reviews)`}
              >
                <div className={isCompact ? "truncate text-sm font-semibold text-wn-navy group-hover:underline" : "truncate text-sm font-bold text-wn-navy group-hover:underline"}>
                  {r.name}
                </div>
                {description && (
                  <div className="mt-0.5 truncate text-xs text-wn-muted">
                    {description}
                  </div>
                )}
                {meta && (
                  <div className="mt-1 text-xs font-medium text-wn-muted">
                    {meta}
                  </div>
                )}
              </a>
              {/* Action row — always-present Directions + optional Website. */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <a
                  href={dirUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${ACTION} bg-wn-navy text-white hover:bg-wn-navy/90`}
                  title={`Directions to ${r.name}`}
                >
                  <Icon name="pin" className="h-3.5 w-3.5" /> Directions
                </a>
                {r.website_url && (
                  <a
                    href={r.website_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className={`${ACTION} border border-wn-line text-wn-navy hover:border-wn-navy`}
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
