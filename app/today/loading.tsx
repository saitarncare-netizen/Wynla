// Skeleton for /today: plain header, the verdict card, then the list.

import { SkeletonCard, SkeletonPage, SkeletonPlainHeader } from "@/components/ui/Skeleton";

export default function TodayLoading() {
  return (
    <SkeletonPage label="Loading today">
      <div className="mx-auto max-w-2xl px-4 pb-10 sm:px-6">
        <SkeletonPlainHeader />
        <div className="mt-5 space-y-4">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </SkeletonPage>
  );
}
