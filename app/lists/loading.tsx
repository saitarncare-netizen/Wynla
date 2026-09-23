// Skeleton for the /lists index: navy hero + three-column grid. A list
// page (/lists/[slug]) has its own intro + ranked-grid skeleton.

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
