"use client";

// Stage 34 — Upsell modal shown when a free user hits a tier limit
// (compare slots full, 6th favorite, 2nd snow alert, 3rd saved trip,
// 2nd custom origin). Single shared component, parameterised per gate
// so we keep one Tailwind footprint + one a11y pattern.
//
// UX: lightweight bottom-sheet on mobile, centered card on desktop.
// Includes "Maybe later" + "See Pro" routes to /pro?from=<gate>.

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import { LIMIT_LABELS, UPSELL_TAGLINES, type TierLimitKey } from "@/lib/tierLimits";
import Icon from "@/components/icons/Icon";
import Button, { buttonClasses } from "@/components/ui/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  gate: TierLimitKey;
  /** Optional override for the modal headline. Defaults to UPSELL_TAGLINES[gate]. */
  title?: string;
  /** Optional extra body copy under the standard "Free: X / Pro: Y" line. */
  detail?: string;
};

export default function UpsellModal({ open, onClose, gate, title, detail }: Props) {
  // Refs for focus management: save the trigger so we can restore focus
  // when the modal closes; ctaRef receives initial focus on open so the
  // user can press Enter to go straight to /pro (mirrors common modal UX).
  const triggerRef = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const headlineId = useId();
  const detailId = useId();

  // Body-scroll lock + Escape-to-close. Mounted only when `open` so we
  // don't pay the listener cost otherwise. `prevOverflow` is captured per
  // mount, so if a parent (e.g. OnboardingCard) already locked the body
  // we restore to "hidden" on close and let the parent's own cleanup
  // unlock it later — no double-unlock.
  useEffect(() => {
    if (!open) return;
    triggerRef.current = (document.activeElement as HTMLElement | null) ?? null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Defer focus to next frame so the CTA is mounted + visible.
    const focusTimer = window.setTimeout(() => {
      ctaRef.current?.focus();
    }, 0);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      // Return focus to whatever opened the modal so keyboard users
      // don't get dumped at the top of the page.
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const labels = LIMIT_LABELS[gate];
  const headline = title ?? UPSELL_TAGLINES[gate];
  const proHref = `/pro?from=${gate}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headlineId}
      aria-describedby={detail ? detailId : undefined}
      className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close upsell"
        onClick={onClose}
        className="absolute inset-0 bg-wn-charcoal/40 backdrop-blur-[1px]"
      />

      {/* Card / sheet */}
      <div
        className="relative w-full max-w-md rounded-t-wn-lg bg-white p-5 shadow-2xl sm:rounded-wn-lg"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)",
        }}
      >
        <div className="flex items-start gap-3">
          <Icon name="sparkle" className="h-8 w-8 shrink-0 text-wn-gold-halo" />
          <div className="flex-1">
            <div className="text-eyebrow font-bold uppercase text-wn-muted">
              Wynla Pro
            </div>
            <h2
              id={headlineId}
              className="mt-0.5 text-lg font-extrabold text-wn-navy sm:text-wn-xl"
            >
              {headline}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2.5 -mt-2.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-wn-muted transition hover:bg-wn-charcoal/5 hover:text-wn-navy"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-wn-sm border border-wn-line bg-wn-offwhite p-3">
          <div>
            <dt className="text-eyebrow font-bold uppercase text-wn-muted">
              Free
            </dt>
            <dd className="mt-1 text-sm font-semibold text-wn-charcoal">
              {labels.free}
            </dd>
          </div>
          <div>
            <dt className="text-eyebrow font-bold uppercase text-wn-navy">
              Pro
            </dt>
            <dd className="mt-1 text-sm font-semibold text-wn-navy">
              {labels.pro}
            </dd>
          </div>
        </dl>

        {detail && (
          <p id={detailId} className="mt-3 text-xs text-wn-muted">
            {detail}
          </p>
        )}

        <p className="mt-3 text-xs text-wn-muted">
          7-day free trial. Cancel anytime. $7/mo or $59/year (save 30%).
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <Link
            href={proHref}
            ref={ctaRef}
            onClick={onClose}
            className={buttonClasses({ className: "flex-1" })}
          >
            Try Pro free for 7 days
          </Link>
          <Button variant="secondary" onClick={onClose}>
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
