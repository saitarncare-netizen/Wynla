// Skeleton for /lists/[slug]: navy hero, the intro paragraph (max-w-3xl)
// and the ranked resort grid (1 / 2 / 3 columns, pass-coloured accent
// bar on each card), so nothing shifts when the list streams in. The
// /lists index keeps its own grid-only skeleton.

import { SkeletonCard, SkeletonHero, SkeletonPage, SkeletonText } from "@/components/ui/Skeleton";

export default function ListLoading() {
  return (
    <SkeletonPage label="Loading list">
      <SkeletonHero />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12" aria-hidden="true">
        <SkeletonText lines={3} className="max-w-3xl" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} lines={2} accent />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
