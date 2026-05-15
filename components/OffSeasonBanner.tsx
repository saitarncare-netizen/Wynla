"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

// Off-season banner — a small, dismissable pill that appears under the
// brand row on the homepage between May 1 and Oct 31 (when most US
// resorts are closed). Drives users to the /deals page so the off-season
// visit still returns value.
//
// Dismissal is persisted in localStorage. We bump the version suffix
// (`_v1`) when the messaging changes so old dismissals don't suppress
// new copy.

const STORAGE_KEY = "wynla_offseason_banner_dismissed_v1";

/** May 1 (month 4) through Oct 31 (month 9) inclusive. */
function isOffSeasonNow(now: Date = new Date()): boolean {
  const m = now.getMonth();
  return m >= 4 && m <= 9;
}

// useSyncExternalStore plumbing — matches the codebase's pattern for
// reading localStorage flags during render without tripping React 19's
// "no setState in useEffect" lint rule. subscribe is a no-op because we
// don't sync across tabs; the snapshot just reads truth from storage.
function bannerSubscribe(): () => void {
  return () => {};
}
function readDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // private-mode Safari, etc — assume not dismissed.
    return false;
  }
}
function bannerGetSnapshot(): boolean | null {
  return readDismissed();
}
function bannerGetServerSnapshot(): boolean | null {
  // Returning null defers the gating decision until the client commits,
  // so SSR markup matches the first client paint and we avoid hydration
  // mismatches.
  return null;
}

export default function OffSeasonBanner() {
  // Hidden in 3 cases: not yet hydrated (null), dismissed in storage (true),
  // or click-dismissed this session (sessionDismissed flag below).
  const dismissedFromStorage = useSyncExternalStore(
    bannerSubscribe,
    bannerGetSnapshot,
    bannerGetServerSnapshot,
  );
  const [sessionDismissed, setSessionDismissed] = useState(false);

  if (dismissedFromStorage === null) return null;
  if (dismissedFromStorage || sessionDismissed) return null;
  if (!isOffSeasonNow()) return null;

  function handleDismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // No-op; sessionDismissed below still hides for this session.
    }
    setSessionDismissed(true);
  }

  // Stage 33 — stop touch propagation at both layers so taps on the
  // banner / dismiss button don't reach Mapbox's drag listener (which
  // sits at window/document level).
  const stopTouchBubble = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };
  return (
    <div
      className="flex justify-center px-3 pb-2 pt-1 sm:px-6"
      onTouchStart={stopTouchBubble}
      onTouchMove={stopTouchBubble}
      onTouchEnd={stopTouchBubble}
    >
      <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-wn-navy/95 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-sm sm:text-xs">
        <span aria-hidden="true">❄️</span>
        <span className="truncate">
          Off-season — most US resorts open in Nov.{" "}
          <Link
            href="/deals"
            className="underline decoration-white/40 underline-offset-2 hover:decoration-white"
          >
            See pass deals →
          </Link>
        </span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss off-season banner"
          className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white"
        >
          <span aria-hidden="true" className="text-sm leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
