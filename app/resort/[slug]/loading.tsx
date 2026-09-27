// Route-level skeleton for /resort/[slug] (audit resort-panel-detail-32:
// "View full details" gave no feedback until six queries finished on a
// cold ISR entry). Mirrors the page: tall navy hero, the four quick
// stats, then the section cards, so the real page lands without a jump.

import { SkeletonCard, SkeletonHero, SkeletonPage, SkeletonStats } from "@/components/ui/Skeleton";

export default function ResortLoading() {
  return (
    <SkeletonPage label="Loading resort">
      <SkeletonHero tall />
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <SkeletonStats count={4} />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    </SkeletonPage>
  );
}
