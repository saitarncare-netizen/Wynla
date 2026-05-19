"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

// Inaugural Season banner — sits under the brand row on the homepage
// between May 1 and Oct 31 (the US ski off-season window). The whole
// pill is a tappable link to /early; a small × on the right dismisses
// without navigating.
//
// Mobile gets a SHORT copy ("Free for the inaugural season → Lock
// founder pricing") so the CTA stays visible inside a 320-390px viewport.
// Desktop reveals the full sentence.
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
      className="flex justify-center px-3 pb-2 pt-1 sm:px-6"
      onTouchStart={stopTouchBubble}
      onTouchMove={stopTouchBubble}
      onTouchEnd={stopTouchBubble}
    >
      {/* Wrapper sits relative so the dismiss × can absolute-position
          on top of the link without breaking its tap target. */}
      <div className="relative inline-flex max-w-full items-center rounded-full bg-wn-navy/95 shadow-sm backdrop-blur-sm">
        <Link
          href="/early"
          className="flex max-w-full items-center gap-2 rounded-full px-3 py-2 pr-9 text-[11px] font-medium text-white sm:py-1.5 sm:text-xs"
          aria-label="Learn about the inaugural season and Founder pricing"
        >
          <span aria-hidden="true" className="shrink-0">⛷️</span>
          {/* Mobile: short single-line copy that fits ~340px. */}
          <span className="truncate sm:hidden">
            Free Founder Season{" "}
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
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss founder banner"
          className="absolute right-1 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white/85 transition hover:bg-white/20 hover:text-white"
        >
          <span aria-hidden="true" className="text-sm leading-none">×</span>
        </button>
      </div>
    </div>
  );
}
