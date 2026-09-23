// Skeleton for /guides and /guides/[slug] (nested routes inherit this
// file): navy hero + a two-column card grid.

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
