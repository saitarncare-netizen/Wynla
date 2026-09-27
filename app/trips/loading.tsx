// Skeleton for /trips: plain header + a stack of trip cards.

import { SkeletonCard, SkeletonPage, SkeletonPlainHeader } from "@/components/ui/Skeleton";

export default function TripsLoading() {
  return (
    <SkeletonPage label="Loading trips">
      <div className="mx-auto max-w-3xl px-4 pb-10 sm:px-6">
        <SkeletonPlainHeader />
        <div className="mt-6 space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </SkeletonPage>
  );
}
