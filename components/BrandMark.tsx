// BrandMark — the designer's logo, finally in the app (audit
// design-system-18: public/brand/ was never rendered; the header used a
// text span).
//
//   variant  "mark"   the sky-dome + mountains + gold trail alone
//            "lockup" mark + WYNLA wordmark (the horizontal logo)
//   onDark   the wordmark is navy, so on a navy surface the lockup
//            renders mark + a white text wordmark instead
//   href     wrap in a link (default "/"); pass null for a static mark
//
// Sources are the trimmed PNGs from scripts/gen-brand-shell-assets.mjs
// (2x-ready, ~12 KB / ~19 KB). Width and height are explicit on every
// <Image> so the bar never shifts while the file loads (no CLS).
//
// Drop-in for the map header (components/Map/MapPage.tsx, sheet
// package): replace the "Wynla" <span> with
//   <BrandMark variant="lockup" size="sm" />
// on the white pill, or <BrandMark variant="mark" /> where only the
// glyph fits.

import Image from "next/image";
import Link from "next/link";
import { cx } from "@/components/ui/cx";

type Size = "sm" | "md";

// Trimmed asset ratios: mark 2:1, lockup 5.4:1.
const MARK: Record<Size, { w: number; h: number }> = { sm: { w: 44, h: 22 }, md: { w: 56, h: 28 } };
const LOCKUP: Record<Size, { w: number; h: number }> = { sm: { w: 108, h: 20 }, md: { w: 130, h: 24 } };

export type BrandMarkProps = {
  variant?: "mark" | "lockup";
  size?: Size;
  onDark?: boolean;
  href?: string | null;
  /** Load eagerly (above the fold in the shell). */
  priority?: boolean;
  className?: string;
};

export default function BrandMark({ variant = "lockup", size = "md", onDark = false, href = "/", priority = false, className }: BrandMarkProps) {
  const markDims = MARK[size];
  const lockupDims = LOCKUP[size];

  let inner: React.ReactNode;
  if (variant === "mark") {
    inner = (
      <Image src="/brand/mark-trim.png" alt="Wynla" width={markDims.w} height={markDims.h} priority={priority} className="block h-auto" style={{ width: markDims.w }} />
    );
  } else if (onDark) {
    inner = (
      <span className="inline-flex items-center gap-2">
        <Image src="/brand/mark-trim.png" alt="" width={markDims.w} height={markDims.h} priority={priority} className="block h-auto" style={{ width: markDims.w }} />
        <span className={cx("font-extrabold tracking-[0.12em] text-white", size === "sm" ? "text-base" : "text-lg")}>WYNLA</span>
      </span>
    );
  } else {
    inner = (
      <Image src="/brand/logo-horizontal-trim.png" alt="Wynla" width={lockupDims.w} height={lockupDims.h} priority={priority} className="block h-auto" style={{ width: lockupDims.w }} />
    );
  }

  const label = variant === "lockup" && onDark ? "Wynla" : undefined;
  if (href === null) {
    return <span className={cx("inline-flex shrink-0 items-center", className)}>{inner}</span>;
  }
  return (
    <Link href={href} aria-label={label ?? "Wynla home"} className={cx("inline-flex shrink-0 items-center rounded-wn-sm", className)}>
      {inner}
    </Link>
  );
}
