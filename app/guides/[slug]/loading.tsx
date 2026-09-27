// Skeleton for /guides/[slug], an article: narrow navy hero (PageHeader
// width max-w-3xl) and a single prose column with a section heading
// every few paragraphs. Without this file the route would inherit the
// /guides index skeleton, a card grid that jumps to a text column when
// the article streams in.

import Skeleton, { SkeletonHero, SkeletonPage, SkeletonText } from "@/components/ui/Skeleton";

export default function GuideArticleLoading() {
  return (
    <SkeletonPage label="Loading guide">
      <SkeletonHero width="max-w-3xl" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14" aria-hidden="true">
        <SkeletonText lines={4} />
        <Skeleton className="mt-10 h-7 w-1/2" />
        <SkeletonText lines={5} className="mt-4" />
        <Skeleton className="mt-10 h-7 w-2/5" />
        <SkeletonText lines={3} className="mt-4" />
      </div>
    </SkeletonPage>
  );
}
