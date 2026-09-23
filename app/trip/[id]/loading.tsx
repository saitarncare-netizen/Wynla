// Skeleton for /trip/[id]: navy hero, three summary tiles, the day list.

import { SkeletonCard, SkeletonHero, SkeletonPage, SkeletonStats } from "@/components/ui/Skeleton";

export default function TripLoading() {
  return (
    <SkeletonPage label="Loading trip">
      <SkeletonHero width="max-w-3xl" />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <SkeletonStats count={3} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
      </div>
    </SkeletonPage>
  );
}
