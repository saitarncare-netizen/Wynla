"use client";

// Stage 35 — Floating Pro benefits card. Sits at the top-right of the
// map (under the header pills) and surfaces what Pro actually unlocks
// so users see the value beyond the small header badge.
//
// Two states:
//   • Free / anon  →  "✨ Wynla Pro" headline + 3 benefit bullets +
//                     "Try free for 7 days" CTA. Dismissable via the X.
//                     Re-appears after 14 days if dismissed (so it's a
//                     gentle nudge, not nagware).
//   • Pro          →  "💎 You're a Pro" confirmation with 3 unlocked
//                     features as bullets. Dismissable. Stays dismissed
//                     forever once tapped — they got the confirmation,
//                     no need to re-show.
//
// Hidden when the search picker, trip planner, or onboarding card is
// open so it never competes with the active flow. Hidden on phones in
// landscape if it would push the map below the fold.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProStatus } from "@/lib/proClient";

const DISMISS_KEY = "wynla_pro_card_dismissed_v1";
const REAPPEAR_DAYS = 14;

type DismissEntry = { at: number; tier: "free" | "pro" };

function isStillDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as DismissEntry;
    if (!parsed || typeof parsed.at !== "number") return false;
    // Pro-tier dismissal sticks; free-tier dismissal re-shows after the
    // re-appear window so we keep gently nudging.
    if (parsed.tier === "pro") return true;
    const ageDays = (Date.now() - parsed.at) / (1000 * 60 * 60 * 24);
    return ageDays < REAPPEAR_DAYS;
  } catch {
    return false;
  }
}

function persistDismissal(tier: "free" | "pro") {
  if (typeof window === "undefined") return;
  try {
    const payload: DismissEntry = { at: Date.now(), tier };
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(payload));
  } catch {
    // localStorage can throw in private browsing — swallow.
  }
}

export default function ProBenefitsCard({
  hidden = false,
}: {
  /** Caller can hide the card while a drawer / picker is open. */
  hidden?: boolean;
}) {
  const { isPro, isLoading } = useProStatus();
  const [dismissed, setDismissed] = useState(true);

  // Initial dismissal check runs on the client only — the server can't
  // know per-browser localStorage state. Defaults to dismissed so we
  // never flash the card on SSR.
  useEffect(() => {
    setDismissed(isStillDismissed());
  }, []);

  if (hidden || dismissed || isLoading) return null;

  const handleClose = () => {
    persistDismissal(isPro ? "pro" : "free");
    setDismissed(true);
  };

  if (isPro) {
    return (
      <aside
        aria-label="Pro features unlocked"
        className="pointer-events-auto absolute right-3 top-[68px] z-30 w-[280px] rounded-xl border border-wn-gold/60 bg-white p-3 shadow-lg sm:right-4 sm:top-[72px]"
      >
        <div className="flex items-start gap-2">
          <span aria-hidden="true" className="text-xl">💎</span>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-wn-gold">
              Wynla Pro
            </div>
            <div className="text-sm font-extrabold text-wn-navy">
              You&apos;re a Pro
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Dismiss"
            className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-wn-charcoal/55 transition hover:bg-wn-charcoal/5 hover:text-wn-navy"
          >
            <span aria-hidden="true" className="text-base leading-none">×</span>
          </button>
        </div>
        <ul className="mt-2 space-y-1 text-[11px] text-wn-charcoal/80">
          <li>✓ Powder Day Score on every resort</li>
          <li>✓ Unlimited saved trips + alerts</li>
          <li>✓ Multi-pass optimizer (coming soon)</li>
        </ul>
        <Link
          href="/account/pro"
          onClick={handleClose}
          className="mt-2 inline-flex h-8 items-center justify-center text-[11px] font-semibold text-wn-navy underline-offset-2 hover:underline"
        >
          Manage subscription →
        </Link>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Try Wynla Pro free for 7 days"
      className="pointer-events-auto absolute right-3 top-[68px] z-30 w-[300px] rounded-xl border border-wn-gold/60 bg-gradient-to-br from-wn-gold/15 via-white to-white p-3 shadow-lg sm:right-4 sm:top-[72px]"
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="text-xl">✨</span>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-wn-gold">
            Wynla Pro · 7 days free
          </div>
          <div className="text-sm font-extrabold text-wn-navy">
            Plan deeper. Chase storms.
          </div>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full text-wn-charcoal/55 transition hover:bg-wn-charcoal/5 hover:text-wn-navy"
        >
          <span aria-hidden="true" className="text-base leading-none">×</span>
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-[11px] text-wn-charcoal/80">
        <li>🌨️ Powder Day Score 0-100 per resort</li>
        <li>🗺️ Unlimited saved trips + favorites</li>
        <li>❄️ Snow alerts on every favorite</li>
      </ul>
      <Link
        href="/pro?from=header"
        onClick={handleClose}
        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md bg-wn-navy px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-wn-navy/90"
      >
        Try Pro free for 7 days →
      </Link>
      <p className="mt-1.5 text-[10px] text-wn-charcoal/55">
        Cancel anytime. $7/mo or $59/year.
      </p>
    </aside>
  );
}
