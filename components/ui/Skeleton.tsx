// Skeleton — loading placeholders that match the shape of what is coming
// (design-system-32: no route-level loading states anywhere). Compose
// the small pieces in a route's loading.tsx so the layout does not jump
// when the real page streams in.
//
//   <Skeleton className="h-4 w-40" />            one bar
//   <SkeletonText lines={3} />                    paragraph
//   <SkeletonCard lines={2} />                    card with title + lines
//   <SkeletonHero />                              navy PageHeader stand-in
//
// The pulse is the Tailwind animate-pulse keyframe; app/globals.css
// disables it under prefers-reduced-motion. `aria-hidden` on each piece
// and role="status" + a visually hidden label on the page-level wrapper
// (see SkeletonPage) so screen readers get "Loading" once, not a wall of
// empty boxes.

import type { ReactNode } from "react";
import { cx } from "./cx";

export default function Skeleton({ className, dark = false }: { className?: string; dark?: boolean }) {
  return <div aria-hidden="true" className={cx("rounded-wn-sm motion-safe:animate-pulse", dark ? "bg-white/15" : "bg-wn-charcoal/10", className)} />;
}

export function SkeletonText({ lines = 3, className, dark = false }: { lines?: number; className?: string; dark?: boolean }) {
  return (
    <div className={cx("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} dark={dark} className={cx("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 2, className, accent = false }: { lines?: number; className?: string; accent?: boolean }) {
  return (
    <div className={cx("overflow-hidden rounded-wn-md border border-wn-line bg-white", className)} aria-hidden="true">
      {accent && <div className="h-1.5 w-full bg-wn-charcoal/10" />}
      <div className="p-4 sm:p-5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-5 w-3/4" />
        <SkeletonText lines={lines} className="mt-3" />
      </div>
    </div>
  );
}

/** Stand-in for a `tone="navy"` PageHeader (same paddings, so no jump). */
export function SkeletonHero({ width = "max-w-5xl", tall = false }: { width?: string; tall?: boolean }) {
  return (
    <div className="w-full bg-wn-navy" aria-hidden="true">
      <div className={cx("mx-auto px-4 sm:px-6", width, tall ? "pb-12 pt-8 sm:pb-16 sm:pt-12" : "pb-8 pt-6 sm:pb-10 sm:pt-8")}>
        <Skeleton dark className="h-3 w-24" />
        <Skeleton dark className="mt-3 h-8 w-2/3 sm:h-11" />
        <Skeleton dark className="mt-3 h-4 w-1/2" />
      </div>
    </div>
  );
}

/** Stand-in for a `tone="plain"` PageHeader. */
export function SkeletonPlainHeader() {
  return (
    <div aria-hidden="true" className="pb-2 pt-6 sm:pt-8">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-8 w-2/3 sm:h-11" />
      <Skeleton className="mt-3 h-4 w-1/2" />
    </div>
  );
}

/** Row of stat tiles (state page, trip summary, resort quick stats). */
export function SkeletonStats({ count = 3 }: { count?: number }) {
  return (
    <div className={cx("grid gap-2 sm:gap-3", count === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3")} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-wn-md border border-wn-line bg-white px-3 py-3">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-2 h-6 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Page-level wrapper: announces one "Loading" to assistive tech. */
export function SkeletonPage({ label = "Loading", className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <main role="status" aria-live="polite" className={cx("min-h-dvh bg-wn-offwhite", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </main>
  );
}
