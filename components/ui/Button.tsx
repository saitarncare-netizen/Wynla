// Button — the one button. Replaces the 52 hand-rolled primary-button
// class strings the 2026-09-17 audit counted (design-system-6/7/8).
//
//   variant  primary   navy fill, white text (default action)
//            secondary white fill, line border, navy text
//            ghost     no fill, navy text (inline / toolbar actions)
//            danger    danger fill, white text (destructive, confirm first)
//            gold      gold fill, navy text — ONLY on a navy surface, one
//                      per screen (the "primary CTA on hero" pattern)
//   size     md 44 px (phone default) · sm 36 px (dense rows, desktop)
//   loading  disables the button, keeps its width, swaps in a spinner and
//            announces via aria-busy; the label stays for context.
//   href     renders a next/link with identical styling ("asChild" style),
//            so navigation and actions look the same without wrapping.
//
// No hooks, so it works in server and client components alike.

import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import Icon from "@/components/icons/Icon";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-wn-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 motion-safe:active:scale-[0.98]";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-wn-navy text-white hover:bg-wn-navy/90 shadow-wn-sm",
  secondary:
    "border border-wn-line bg-white text-wn-navy hover:border-wn-navy hover:bg-wn-offwhite",
  ghost: "bg-transparent text-wn-navy hover:bg-wn-navy/5",
  danger: "bg-wn-danger text-white hover:bg-wn-danger/90 shadow-wn-sm",
  gold: "bg-wn-gold text-wn-navy hover:bg-wn-gold/90 shadow-wn-sm",
};

const SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 text-sm",
  sm: "min-h-9 px-3 text-sm",
};

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width (stacked forms on phones). */
  block?: boolean;
  loading?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  children: ReactNode;
};

type AsButton = StyleProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof StyleProps>;
type AsLink = StyleProps & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof StyleProps | "href">;

export type ButtonProps = AsButton | AsLink;

export function buttonClasses({
  variant = "primary",
  size = "md",
  block = false,
  className,
}: Pick<StyleProps, "variant" | "size" | "block" | "className">): string {
  return cx(BASE, VARIANT[variant], SIZE[size], block && "w-full", className);
}

function Content({ loading, iconLeft, iconRight, children }: Pick<StyleProps, "loading" | "iconLeft" | "iconRight" | "children">) {
  return (
    <>
      {loading ? (
        <Icon name="spinner" className="h-4 w-4 shrink-0 motion-safe:animate-spin" />
      ) : (
        iconLeft && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{iconLeft}</span>
      )}
      <span>{children}</span>
      {iconRight && !loading && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{iconRight}</span>}
    </>
  );
}

export default function Button(props: ButtonProps) {
  // Styling props are pulled off first so only real DOM attributes reach
  // the element.
  const { variant, size, block, loading = false, iconLeft, iconRight, className, children, ...rest } = props;
  const classes = buttonClasses({ variant, size, block, className });
  const content = (
    <Content loading={loading} iconLeft={iconLeft} iconRight={iconRight}>
      {children}
    </Content>
  );

  if (typeof rest.href === "string") {
    const { href, ...anchor } = rest as AsLink;
    const external = /^https?:\/\//.test(href) || href.startsWith("mailto:");
    if (external) {
      return (
        <a href={href} className={classes} aria-busy={loading || undefined} {...anchor}>
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} aria-busy={loading || undefined} {...anchor}>
        {content}
      </Link>
    );
  }

  const { type, disabled, ...button } = rest as AsButton;
  // `href` is undefined on this branch; drop the key so it never reaches
  // the <button> element's props.
  delete button.href;
  return (
    <button type={type ?? "button"} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...button}>
      {content}
    </button>
  );
}
