import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  description: "We couldn't find that page on Wynla. Try the map or browse every US ski resort.",
};

/**
 * 404 fallback — branded, links back to the map. Hit when notFound() is
 * called (e.g. a /resort/[slug] that doesn't exist) or any unknown route.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-wn-offwhite px-6 py-12 text-center">
      <div className="max-w-md">
        <div className="text-5xl">⛷️</div>
        <h1 className="mt-4 text-2xl font-extrabold text-wn-navy sm:text-3xl">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-3 text-sm text-wn-charcoal/75">
          The link might be old, mistyped, or the resort may have a
          different slug now. Try the map — every US resort lives there.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-wn-navy px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-wn-navy/90"
          >
            Open the map
          </Link>
          <Link
            href="/deals"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-wn-navy/20 bg-white px-5 text-sm font-semibold text-wn-navy transition hover:bg-white/80"
          >
            Pass deals
          </Link>
        </div>
      </div>
    </main>
  );
}
