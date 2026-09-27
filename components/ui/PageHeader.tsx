// PageHeader — the top of every non-map page. Two tones:
//
//   plain  off-white, navy title (legal, deals, account-style pages)
//   navy   the brand hero: navy -> navy-deep gradient with the soft
//          radial highlight, white title (editorial, directories, detail)
//
// One H1 scale for the whole app (design-system-4 found six): 28 px on
// phones, 40 px from sm up; `size="lg"` bumps directories to 48 px on
// desktop. Back links are NOT rendered here — the AppShell top bar owns
// "back", so pages stop hand-rolling eight different arrows
// (design-system-30). The `back` prop exists for nested pages whose
// parent is not what the shell would guess (rare; prefer lib/nav.ts).

import Link from "next/link";
import type { ReactNode } from "react";
import Icon from "@/components/icons/Icon";
import { accentOnNavy } from "@/lib/contrast";
import { cx } from "./cx";

export type PageHeaderProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Small line under the description (timestamps, counts). */
  meta?: ReactNode;
  tone?: "plain" | "navy";
  size?: "md" | "lg";
  /**
   * Tints the gradient start (list accent, pass colour). Hex accents are
   * mixed toward navy until the white title and description clear 4.5:1
   * on them (lib/contrast.ts accentOnNavy), so any colour is safe here.
   */
  accent?: string;
  back?: { href: string; label: string };
  /** Right-aligned actions (buttons, toggles). */
  actions?: ReactNode;
  /** Slot under the text, inside the header (chips, stat rows). */
  children?: ReactNode;
  /** Max content width class; defaults to max-w-5xl. */
  width?: "max-w-2xl" | "max-w-3xl" | "max-w-4xl" | "max-w-5xl" | "max-w-6xl";
  className?: string;
};

export default function PageHeader({
  title,
  eyebrow,
  description,
  meta,
  tone = "plain",
  size = "md",
  accent,
  back,
  actions,
  children,
  width = "max-w-5xl",
  className,
}: PageHeaderProps) {
  const navy = tone === "navy";
  return (
    <header
      className={cx("relative w-full overflow-hidden", navy && "on-dark text-white", className)}
      style={
        navy
          ? { background: `linear-gradient(135deg, ${accent ? accentOnNavy(accent) : "var(--color-wn-navy)"} 0%, var(--color-wn-navy) 55%, var(--color-wn-navy-deep) 100%)` }
          : undefined
      }
    >
      {navy && (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
          }}
        />
      )}
      <div className={cx("relative z-10 mx-auto px-4 sm:px-6", width, navy ? "pb-8 pt-6 sm:pb-10 sm:pt-8" : "pb-2 pt-6 sm:pt-8")}>
        {back && (
          <Link
            href={back.href}
            className={cx(
              "mb-4 inline-flex min-h-9 items-center gap-1 text-sm font-semibold",
              navy ? "text-white/80 hover:text-white" : "text-wn-muted hover:text-wn-navy",
            )}
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            {back.label}
          </Link>
        )}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <p className={cx("mb-2 text-eyebrow font-semibold uppercase", navy ? "text-white/70" : "text-wn-muted")}>{eyebrow}</p>
            )}
            <h1
              className={cx(
                "font-extrabold tracking-tight text-balance",
                navy ? "text-white" : "text-wn-navy",
                size === "lg" ? "text-wn-2xl sm:text-wn-4xl lg:text-wn-5xl" : "text-wn-2xl sm:text-wn-4xl",
              )}
            >
              {title}
            </h1>
            {description && (
              <p className={cx("mt-3 max-w-2xl text-base sm:text-lg", navy ? "text-white/85" : "text-wn-muted")}>{description}</p>
            )}
            {meta && <p className={cx("mt-2 text-sm", navy ? "text-white/70" : "text-wn-muted")}>{meta}</p>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </header>
  );
}
