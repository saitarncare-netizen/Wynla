// Section — heading row with an optional action, then content. Gives
// every page the same h2 style and the same 32 px rhythm between blocks
// (design-system-4 found four section-heading styles).
//
//   <Section title="Sources" action={<Button size="sm" variant="ghost" href="/x">See all</Button>}>
//
//   level    "h2" (default) or "h3" when nested inside another Section
//   eyebrow  optional uppercase label above the title (replaces the
//            uppercase-tracked h2 pattern; the title stays sentence case)
//   card     wrap the content in a Card

import type { ReactNode } from "react";
import Card from "./Card";
import { cx } from "./cx";

export type SectionProps = {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: "h2" | "h3";
  card?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
};

export default function Section({ title, eyebrow, description, action, level = "h2", card = false, id, className, children }: SectionProps) {
  const Heading = level;
  return (
    <section id={id} className={cx("space-y-3", className)} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-eyebrow font-semibold uppercase text-wn-muted">{eyebrow}</p>}
          <Heading id={id ? `${id}-title` : undefined} className={cx("font-bold text-wn-navy", level === "h2" ? "text-lg" : "text-base")}>
            {title}
          </Heading>
          {description && <p className="mt-0.5 text-sm text-wn-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {card ? <Card>{children}</Card> : children}
    </section>
  );
}
