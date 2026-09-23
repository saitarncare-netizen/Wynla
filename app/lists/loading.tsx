// Skeleton for /lists and /lists/[slug]: navy hero + three-column grid.

import { SkeletonCard, SkeletonHero, SkeletonPage } from "@/components/ui/Skeleton";

export default function ListsLoading() {
  return (
    <SkeletonPage label="Loading lists">
      <SkeletonHero />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} lines={2} accent />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
