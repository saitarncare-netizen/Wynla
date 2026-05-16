"use client";

// Stage 35 — Pro indicator in the global header. Designed to be
// obvious + benefit-led, not a hidden tiny pill. Three visual states:
//
//   • Pro user      → "💎 You're a Pro" — solid wn-gold pill, links to
//                     /account/pro so they can manage the subscription.
//                     Closes the feedback loop ("I paid; the app says
//                     thanks").
//   • Free / anon   → "✨ Try Pro · 7 days free" — outlined wn-gold pill
//                     with subtle pulse on hover. Routes to /pro with
//                     the badge as the upsell source.
//   • Loading       → renders the free-tier shell so anon users never
//                     see "💎 Pro" flicker on first paint. Pro users
//                     get a brief "Try Pro" flash that flips to "💎
//                     Pro" once /api/me/pro-status resolves.
//
// Visible on mobile (`inline-flex` without `sm:` gate) so subscribers
// see the badge they paid for everywhere, not just desktop.

import Link from "next/link";
import { useProStatus } from "@/lib/proClient";

export default function ProBadge({
  className = "",
}: {
  className?: string;
}) {
  const { isPro } = useProStatus();

  if (!isPro) {
    return (
      <Link
        href="/pro?from=header"
        title="Try Wynla Pro free for 7 days"
        aria-label="Try Wynla Pro free for 7 days"
        className={[
          "inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-wn-gold bg-gradient-to-br from-wn-gold/20 to-wn-gold/10 px-3 text-xs font-bold text-wn-navy shadow-sm transition hover:from-wn-gold/30 hover:to-wn-gold/20 active:scale-95",
          className,
        ].join(" ")}
      >
        <span aria-hidden="true" className="text-sm">✨</span>
        <span className="whitespace-nowrap">Try Pro</span>
        <span className="hidden whitespace-nowrap text-[10px] font-semibold text-wn-charcoal/70 sm:inline">
          · 7 days free
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/account/pro"
      title="You're a Pro — manage subscription"
      aria-label="You're a Pro — manage subscription"
      className={[
        "inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-wn-gold px-3 text-xs font-extrabold text-wn-navy shadow-sm transition hover:bg-wn-gold/90 active:scale-95",
        className,
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-sm">💎</span>
      <span className="whitespace-nowrap">You&apos;re a Pro</span>
    </Link>
  );
}
