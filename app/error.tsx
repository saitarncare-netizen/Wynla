"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary. Catches uncaught render errors inside any
 * page under app/ and renders a branded fallback instead of a blank
 * screen. Logs to console + (optionally) Sentry/Posthog when wired.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[Wynla] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-wn-offwhite px-6 py-12 text-center">
      <div className="max-w-md">
        <div className="text-5xl">🏔️</div>
        <h1 className="mt-4 text-2xl font-extrabold text-wn-navy sm:text-3xl">
          Something went sideways.
        </h1>
        <p className="mt-3 text-sm text-wn-charcoal/75">
          We hit a bump loading this page. It&apos;s usually a flaky network
          or a temporary glitch — give it a moment and try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] text-wn-charcoal/40">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-wn-navy px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-wn-navy/90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-wn-navy/20 bg-white px-5 text-sm font-semibold text-wn-navy transition hover:bg-white/80"
          >
            Back to map
          </Link>
        </div>
      </div>
    </main>
  );
}
