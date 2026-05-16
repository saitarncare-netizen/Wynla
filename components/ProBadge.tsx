"use client";

// Stage 35 — Pro indicator in the global header. Two visual states:
//
//   • Pro user      → "💎 Pro" — solid wn-gold pill, links to /account/pro
//                     so they can manage the subscription. Communicates
//                     "you got something for your $59" — closes the
//                     feedback loop on the upgrade.
//   • Free / anon   → "✨ Pro · Free trial" — outlined wn-gold pill,
//                     links to /pro. Hints there's a trial without
//                     being pushy. Skipped during the loading window so
//                     anon users don't see "Free trial" briefly flicker
//                     to "💎 Pro" if they actually are subscribed.
//
// Replaces the previous static `<Link href="/pro">✨ Pro</Link>` in
// MapPage's header.

import Link from "next/link";
import { useProStatus } from "@/lib/proClient";

export default function ProBadge({
  className = "",
}: {
  className?: string;
}) {
  const { isPro, isLoading } = useProStatus();

  // Render the free-tier pill during the loading window. Pro users see
  // a brief "Try Pro" flash that flips to "💎 Pro" once status confirms;
  // worse case is a benign visual blink. Anon users never get teased
  // with the wrong state.
  if (!isPro) {
    return (
      <Link
        href="/pro"
        title="Try Wynla Pro free for 7 days"
        aria-label="Wynla Pro — free trial"
        className={[
          "hidden h-11 items-center justify-center gap-1.5 rounded-md border border-wn-gold/60 bg-wn-gold/10 px-2.5 text-xs font-semibold text-wn-navy transition hover:bg-wn-gold/25 active:scale-95 sm:inline-flex",
          isLoading ? "opacity-80" : "",
          className,
        ].join(" ")}
      >
        <span aria-hidden="true">✨</span>
        <span>Pro</span>
        <span className="hidden text-wn-charcoal/60 lg:inline">· Free trial</span>
      </Link>
    );
  }

  // Pro user — solid gold pill, routes to /account/pro for subscription
  // management.
  return (
    <Link
      href="/account/pro"
      title="Manage your Wynla Pro subscription"
      aria-label="You're a Pro — manage subscription"
      className={[
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-wn-gold px-2.5 text-xs font-extrabold text-wn-navy shadow-sm transition hover:bg-wn-gold/90 active:scale-95",
        className,
      ].join(" ")}
    >
      <span aria-hidden="true">💎</span>
      <span>Pro</span>
    </Link>
  );
}
