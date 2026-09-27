// Skeleton for /state/[code]: navy hero, three stat tiles, resort grid.

import { SkeletonCard, SkeletonHero, SkeletonPage, SkeletonStats } from "@/components/ui/Skeleton";

export default function StateLoading() {
  return (
    <SkeletonPage label="Loading state">
      <SkeletonHero />
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        <SkeletonStats count={3} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} lines={2} accent />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
