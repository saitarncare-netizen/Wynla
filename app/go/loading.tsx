// Skeleton for /go (the Saturday pick): navy header, the pass + city
// form card, then three pick cards.

import { SkeletonCard, SkeletonHero, SkeletonPage } from "@/components/ui/Skeleton";

export default function GoLoading() {
  return (
    <SkeletonPage label="Loading Saturday picks">
      <SkeletonHero width="max-w-3xl" />
      <div className="mx-auto -mt-4 max-w-3xl space-y-5 px-4 pb-10 sm:px-6">
        <SkeletonCard lines={2} />
        <SkeletonCard lines={3} accent />
        <SkeletonCard lines={3} accent />
        <SkeletonCard lines={3} accent />
      </div>
    </SkeletonPage>
  );
}
