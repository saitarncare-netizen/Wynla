"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

// Inaugural Season banner — under the header rows on the homepage between
// May 1 and Oct 31 (the US ski off-season window). Map shell 2026-09-23:
// a 32 px full-width strip (not a floating pill), the whole strip links
// to /early and a 44 px × on the right dismisses without navigating.
//
// Storage key bumped to _v3 because the tap-target redesign changes
// what the banner does; anyone who dismissed _v2 should see this once.

const STORAGE_KEY = "wynla_offseason_banner_dismissed_v3";

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

  function handleDismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // No-op; sessionDismissed below still hides for this session.
    }
    setSessionDismissed(true);
  }

  // Stop touch propagation at both layers so taps on the banner /
  // dismiss button don't reach Mapbox's drag listener (which sits at
  // window/document level).
  const stopTouchBubble = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };
  return (
    <div
      className="flex h-8 items-stretch px-2 sm:px-6"
      onTouchStart={stopTouchBubble}
      onTouchMove={stopTouchBubble}
      onTouchEnd={stopTouchBubble}
    >
      {/* The dismiss button sits outside the rounded, overflow-hidden
          strip so its 44 x 44 hit area can overhang the 32 px strip
          (6 px above and below) without being clipped. */}
      <div className="relative flex min-w-0 flex-1 sm:mx-auto sm:max-w-2xl">
        <div className="flex min-w-0 flex-1 items-stretch overflow-hidden rounded-lg bg-wn-navy/95 shadow-sm backdrop-blur-sm">
          <Link
            href="/early"
            className="flex min-w-0 flex-1 items-center gap-2 pl-3 pr-11 text-[11px] font-medium text-white sm:text-xs"
            aria-label="Learn about the inaugural season and Founder pricing"
          >
            <span aria-hidden="true" className="shrink-0">⛷️</span>
            {/* Phones: short single-line copy that fits 320-390 px. */}
            <span className="truncate sm:hidden">
              Free Founder Season ·{" "}
              <span className="font-semibold underline decoration-wn-gold/70 underline-offset-2">
                Lock founder pricing →
              </span>
            </span>
            {/* Desktop: full sentence. */}
            <span className="hidden truncate sm:inline">
              Wynla opens Nov 2026 — free for the inaugural season.{" "}
              <span className="font-semibold underline decoration-wn-gold/70 underline-offset-2">
                Lock founder pricing →
              </span>
            </span>
          </Link>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss founder banner"
          className="group absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center text-white/85 transition hover:text-white"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-11 items-center justify-center rounded-r-lg text-base leading-none transition group-hover:bg-white/10"
          >
            ×
          </span>
        </button>
      </div>
    </div>
  );
}
