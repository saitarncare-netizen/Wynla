// Skeleton for /compare: plain header + the comparison table (column
// headers then rows).

import Skeleton, { SkeletonPage, SkeletonPlainHeader } from "@/components/ui/Skeleton";

export default function CompareLoading() {
  return (
    <SkeletonPage label="Loading comparison">
      <div className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <SkeletonPlainHeader />
        <div className="mt-6 overflow-hidden rounded-wn-md border border-wn-line bg-white">
          <div className="grid grid-cols-3 gap-3 border-b border-wn-line p-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid grid-cols-3 gap-3 border-b border-wn-line p-4 last:border-b-0">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
