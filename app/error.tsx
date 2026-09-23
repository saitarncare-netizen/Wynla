"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";

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
    console.error("[Wynla] route error:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-wn-offwhite px-6 py-12">
      <div className="w-full max-w-md">
        <EmptyState
          tone="bare"
          icon="alert"
          title={<h1 className="text-wn-2xl font-extrabold text-wn-navy sm:text-wn-3xl">Something went sideways.</h1>}
          body={
            <>
              We hit a bump loading this page. It&apos;s usually a flaky network or a temporary glitch — give it a
              moment and try again.
              {error.digest && (
                <span className="mt-2 block font-mono text-xs text-wn-muted">ref: {error.digest}</span>
              )}
            </>
          }
          action={
            <>
              <Button onClick={reset}>Try again</Button>
              <Button href="/" variant="secondary">
                Back to map
              </Button>
            </>
          }
        />
      </div>
    </main>
  );
}
