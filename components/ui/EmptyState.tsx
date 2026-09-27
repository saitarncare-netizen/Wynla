// EmptyState — "nothing here yet" and "nothing matched", one look
// (design-system-35 found five illustrations and two card styles).
//
//   icon   an Icon name (monoline, navy on a pale navy disc). Editorial
//          emoji are allowed in the title/body copy, not as the glyph.
//   tone   "card" (default, bordered white surface) or "bare" for
//          full-page states like 404 where the page itself is the card.

import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/icons/Icon";
import { cx } from "./cx";

export type EmptyStateProps = {
  icon?: IconName;
  title: ReactNode;
  body?: ReactNode;
  /** One or two Buttons. */
  action?: ReactNode;
  tone?: "card" | "bare";
  className?: string;
};

export default function EmptyState({ icon = "mountain", title, body, action, tone = "card", className }: EmptyStateProps) {
  return (
    <div
      className={cx(
        "flex flex-col items-center px-6 py-10 text-center",
        tone === "card" && "rounded-wn-md border border-dashed border-wn-line bg-white",
        className,
      )}
    >
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-wn-navy/5 text-wn-navy" aria-hidden="true">
        <Icon name={icon} className="h-7 w-7" />
      </span>
      <p className="text-lg font-bold text-wn-navy text-balance">{title}</p>
      {body && <p className="mt-2 max-w-md text-sm text-wn-muted">{body}</p>}
      {action && <div className="mt-5 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-center">{action}</div>}
    </div>
  );
}
