// Card — the one content surface (design-system-9 found four radii, three
// border alphas and two shadows for the same thing).
//
//   padding  md 16 px (phone) / 20 px (sm+)  · lg 20 / 24 (marketing copy)
//            none — caller lays out its own inner padding (image tops)
//   interactive  adds the hover lift used by link cards; pair with
//            `as="a"`/Link by wrapping, or pass href to render a Link.
//   accent   optional 6 px colour bar along the top (pass colour, list
//            accent). Pass a CSS colour; it is decorative (aria-hidden).

import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Padding = "none" | "md" | "lg";

const PAD: Record<Padding, string> = {
  none: "",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-6",
};

export type CardProps = {
  padding?: Padding;
  interactive?: boolean;
  /** Render as a next/link. `interactive` is implied. */
  href?: string;
  accent?: string;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "children">;

export default function Card({ padding = "md", interactive = false, href, accent, className, children, ...rest }: CardProps) {
  const lift = interactive || href !== undefined;
  const classes = cx(
    "block overflow-hidden rounded-wn-md border border-wn-line bg-white shadow-wn-sm",
    lift && "transition-[box-shadow,border-color] hover:border-wn-navy/40 hover:shadow-wn-md",
    className,
  );
  const inner = (
    <>
      {accent && <div className="h-1.5 w-full" style={{ backgroundColor: accent }} aria-hidden="true" />}
      <div className={cx(PAD[padding], "h-full")}>{children}</div>
    </>
  );
  if (href !== undefined) {
    return (
      <Link href={href} className={cx(classes, "group")} {...(rest as HTMLAttributes<HTMLAnchorElement>)}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={classes} {...(rest as HTMLAttributes<HTMLDivElement>)}>
      {inner}
    </div>
  );
}
