// Skeleton for /favorites: plain header + resort card grid.

import { SkeletonCard, SkeletonPage, SkeletonPlainHeader } from "@/components/ui/Skeleton";

export default function FavoritesLoading() {
  return (
    <SkeletonPage label="Loading favorites">
      <div className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
        <SkeletonPlainHeader />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} lines={2} accent />
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
