// GuestIntroCard — what a signed-out visitor sees on a personal tab
// (/trips, /today) instead of a bounce to /login. Those tabs sit in the
// phone tab bar next to the map, so a redirect read as a wall behind a
// tab the person had just tapped, before they knew what was behind it.
// The card says what the tab does in three short steps, then offers the
// one thing a guest can do right now (gold, the navy-surface CTA) and
// sign-in as the quieter second choice.
//
// Navy surface on purpose: the design guide allows gold only as the one
// primary CTA on navy (gold on white is 1.6:1), and the same gradient as
// PageHeader tone="navy" keeps it in the brand family. Hook-free, so it
// renders in server components; the heading id comes from the caller.

import Link from "next/link";
import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

export type GuestIntroStep = { icon: IconName; text: ReactNode };

export type GuestIntroCardProps = {
  /** id for the heading; the section is labelled by it. */
  headingId: string;
  icon: IconName;
  title: ReactNode;
  body?: ReactNode;
  steps?: readonly GuestIntroStep[];
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  /** Small print under the buttons (what needs an account, what does not). */
  note?: ReactNode;
  className?: string;
};

export default function GuestIntroCard({
  headingId,
  icon,
  title,
  body,
  steps,
  primary,
  secondary,
  note,
  className,
}: GuestIntroCardProps) {
  return (
    <section
      aria-labelledby={headingId}
      className={cx("on-dark relative overflow-hidden rounded-wn-lg p-5 text-white shadow-wn-md sm:p-6", className)}
      style={{
        background: "linear-gradient(135deg, var(--color-wn-navy) 0%, var(--color-wn-navy) 55%, var(--color-wn-navy-deep) 100%)",
      }}
    >
      {/* Same soft highlight as the navy PageHeader. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.45) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)",
        }}
      />
      <div className="relative">
        <span
          className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-wn-sky ring-1 ring-white/15"
          aria-hidden="true"
        >
          <Icon name={icon} className="h-6 w-6" />
        </span>
        <h2 id={headingId} className="text-wn-xl font-extrabold tracking-tight text-balance">
          {title}
        </h2>
        {body && <p className="mt-2 max-w-xl text-sm text-white/85">{body}</p>}

        {steps && steps.length > 0 && (
          <ol className="mt-4 flex flex-col gap-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-wn-sky ring-1 ring-white/15"
                  aria-hidden="true"
                >
                  <Icon name={step.icon} className="h-4 w-4" />
                </span>
                <span className="min-w-0 pt-2 text-sm leading-snug text-white/90">{step.text}</span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-5 flex flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="gold" href={primary.href} iconRight={<Icon name="arrow-right" />} block className="sm:w-auto">
            {primary.label}
          </Button>
          {secondary && (
            <Link
              href={secondary.href}
              className="inline-flex min-h-11 items-center justify-center rounded-wn-sm px-2 text-sm font-semibold text-white/90 underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white"
            >
              {secondary.label}
            </Link>
          )}
        </div>
        {note && <p className="mt-2 text-xs text-white/70 sm:mt-3">{note}</p>}
      </div>
    </section>
  );
}
