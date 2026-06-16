// Round 9 (2026-06): Restaurants near a given resort.
//
// Server-friendly component: pass in already-fetched rows from the
// nearby_restaurants table and the component groups by category in
// the canonical RESTAURANT_ORDER, then renders one strip per group.
// Renders nothing when no rows are available (off-season, missing
// data, low-traffic location).

import {
  RESTAURANT_CATEGORIES,
  RESTAURANT_ORDER,
  type NearbyRow,
  type RestaurantCategory,
} from "@/lib/nearbyCategories";
import NearbyGroup from "./NearbyGroup";

type Props = {
  rows: NearbyRow[];
  variant?: "full" | "compact";
};

function isRestaurantCategory(c: string): c is RestaurantCategory {
  return c in RESTAURANT_CATEGORIES;
}

export default function NearbyRestaurants({ rows, variant = "full" }: Props) {
  if (!rows || rows.length === 0) return null;

  // Bucket rows by category (only buckets we know about).
  const byCategory = new Map<RestaurantCategory, NearbyRow[]>();
  for (const r of rows) {
    if (!isRestaurantCategory(r.category)) continue;
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }
  if (byCategory.size === 0) return null;

  // Sort within each bucket by distance ascending (nulls last) so
  // the closest pick is on the left.
  for (const arr of byCategory.values()) {
    arr.sort((a, b) => {
      const da = a.distance_km ?? Infinity;
      const db = b.distance_km ?? Infinity;
      return da - db;
    });
  }

  const isCompact = variant === "compact";
  return (
    <div className={isCompact ? "mt-4" : "mt-8"}>
      <header className={isCompact ? "mb-1" : "mb-3"}>
        <h2 className={isCompact ? "text-base font-extrabold text-wn-navy" : "text-xl font-extrabold text-wn-navy"}>
          🍴 Eat nearby
        </h2>
        {!isCompact && (
          <p className="text-xs text-wn-charcoal/60">
            Restaurants within ~25 km of the resort, sourced from
            OpenStreetMap.
          </p>
        )}
      </header>
      {RESTAURANT_ORDER.filter((c) => byCategory.has(c)).map((cat) => {
        const meta = RESTAURANT_CATEGORIES[cat];
        return (
          <NearbyGroup
            key={cat}
            emoji={meta.emoji}
            label={meta.label}
            blurb={meta.blurb}
            rows={byCategory.get(cat)!}
            variant={variant}
          />
        );
      })}
    </div>
  );
}
