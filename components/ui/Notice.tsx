// Notice — inline status box (success / error / warning / info). One
// component for the red-50/emerald-50 boxes that every form hand-rolled.
//
//   tone     picks the semantic colour pair from app/globals.css
//   role     "alert" for errors (announced immediately) and "status" for
//            the rest (announced politely) — set automatically.

import type { ReactNode } from "react";
import Icon, { type IconName } from "@/components/icons/Icon";
import { cx } from "./cx";

export type NoticeTone = "success" | "danger" | "warning" | "info";

const TONE: Record<NoticeTone, { box: string; icon: IconName }> = {
  success: { box: "border-wn-success/30 bg-wn-success-bg text-wn-success", icon: "check" },
  danger: { box: "border-wn-danger/30 bg-wn-danger-bg text-wn-danger", icon: "alert" },
  warning: { box: "border-wn-warning/30 bg-wn-warning-bg text-wn-warning", icon: "alert" },
  info: { box: "border-wn-info/30 bg-wn-info-bg text-wn-info", icon: "info" },
};

export default function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-2.5 rounded-wn-sm border px-3 py-2.5 text-sm", t.box, className)}>
      <Icon name={t.icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title ? "mt-0.5" : undefined)}>{children}</div>}
      </div>
    </div>
  );
}
