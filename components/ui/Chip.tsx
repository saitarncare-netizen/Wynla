// Chip — pill for filters, tags and quick links. One shape for every
// "pass" selector (design-system-38 found four).
//
//   selected  filled navy; announced with aria-pressed when it is a
//             toggle button (onClick) and aria-current when it is a link.
//   href      renders a next/link (route chips: other states, more lists)
//   onClick   renders a toggle button
//   neither   static tag (span)
//
// 36 px tall: the Material / Airbnb chip height. Keep at least 8 px
// between chips in a row so the combined touch area reaches 44 px.

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type ChipProps = {
  selected?: boolean;
  /** "dark" for chips sitting on a navy hero (white outline). */
  tone?: "light" | "dark";
  href?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  disabled?: boolean;
  /** Small colour dot before the label (pass colour). */
  dot?: string;
  iconLeft?: ReactNode;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
};

const BASE =
  "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-sm font-medium transition-colors";
const REST = "border-wn-line bg-white text-wn-charcoal hover:border-wn-navy hover:text-wn-navy";
const ON = "border-wn-navy bg-wn-navy text-white";
const REST_DARK = "border-white/30 bg-white/10 text-white hover:border-white";
const ON_DARK = "border-white bg-white text-wn-navy";

export default function Chip({ selected = false, tone = "light", href, onClick, disabled, dot, iconLeft, className, children, ...aria }: ChipProps) {
  const look = tone === "dark" ? (selected ? ON_DARK : REST_DARK) : selected ? ON : REST;
  const classes = cx(BASE, look, disabled && "cursor-not-allowed opacity-60", className);
  const body = (
    <>
      {dot && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />}
      {iconLeft && <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{iconLeft}</span>}
      {children}
    </>
  );
  if (href !== undefined) {
    return (
      <Link href={href} className={classes} aria-current={selected ? "page" : undefined} {...aria}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} aria-pressed={selected} className={classes} {...aria}>
        {body}
      </button>
    );
  }
  return (
    <span className={classes} {...aria}>
      {body}
    </span>
  );
}
