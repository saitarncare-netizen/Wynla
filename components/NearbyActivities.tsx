// Round 9 (2026-06): Non-ski activities near a given resort.
//
// Sister component to NearbyRestaurants — same shape, different
// canonical list of categories. Renders nothing when no rows are
// available so the section stays out of the way on resort pages that
// don't have curated nearby data yet.

import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_ORDER,
  type ActivityCategory,
  type NearbyRow,
} from "@/lib/nearbyCategories";
import NearbyGroup from "./NearbyGroup";

type Props = {
  rows: NearbyRow[];
  variant?: "full" | "compact";
};

function isActivityCategory(c: string): c is ActivityCategory {
  return c in ACTIVITY_CATEGORIES;
}

export default function NearbyActivities({ rows, variant = "full" }: Props) {
  if (!rows || rows.length === 0) return null;

  const byCategory = new Map<ActivityCategory, NearbyRow[]>();
  for (const r of rows) {
    if (!isActivityCategory(r.category)) continue;
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }
  if (byCategory.size === 0) return null;

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
          🎟 Off-mountain
        </h2>
        {!isCompact && (
          <p className="text-xs text-wn-charcoal/60">
            Things to do near the resort beyond skiing — sourced from
            OpenStreetMap.
          </p>
        )}
      </header>
      {ACTIVITY_ORDER.filter((c) => byCategory.has(c)).map((cat) => {
        const meta = ACTIVITY_CATEGORIES[cat];
        return (
          <NearbyGroup
            key={cat}
            emoji={meta.emoji}
            label={meta.label}
            rows={byCategory.get(cat)!}
            variant={variant}
          />
        );
      })}
    </div>
  );
}
