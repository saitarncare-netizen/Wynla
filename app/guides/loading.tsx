// Skeleton for the /guides index: navy hero + a two-column card grid.
// Articles (/guides/[slug]) have their own prose-column skeleton.

import { SkeletonCard, SkeletonHero, SkeletonPage } from "@/components/ui/Skeleton";

export default function GuidesLoading() {
  return (
    <SkeletonPage label="Loading guides">
      <SkeletonHero />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SkeletonCard lines={3} accent />
          <SkeletonCard lines={3} accent />
          <SkeletonCard lines={3} accent />
          <SkeletonCard lines={3} accent />
        </div>
      </div>
    </SkeletonPage>
  );
}
