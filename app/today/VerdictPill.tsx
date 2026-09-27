// Go / Wait / Skip / Unknown pill shared by /today and /favorites. Lives
// in its own file because a page module may only export the page.

import type { Verdict } from "@/lib/goWaitSkip";

const VERDICT_PILL: Record<Verdict["verdict"], { text: string; cls: string; dot: string }> = {
  go: { text: "Go", cls: "bg-wn-success-bg text-wn-success ring-1 ring-wn-success/30", dot: "bg-wn-success" },
  wait: { text: "Wait", cls: "bg-wn-warning-bg text-wn-warning ring-1 ring-wn-warning/30", dot: "bg-wn-warning" },
  skip: { text: "Skip", cls: "bg-wn-danger-bg text-wn-danger ring-1 ring-wn-danger/30", dot: "bg-wn-danger" },
  unknown: { text: "Unknown", cls: "bg-wn-charcoal/5 text-wn-muted ring-1 ring-wn-line", dot: "bg-wn-charcoal/40" },
};

const STATUS_TONE: Record<Verdict["status"]["tone"], { cls: string; dot: string }> = {
  green: { cls: "bg-wn-success-bg text-wn-success ring-1 ring-wn-success/30", dot: "bg-wn-success" },
  amber: { cls: "bg-wn-warning-bg text-wn-warning ring-1 ring-wn-warning/30", dot: "bg-wn-warning" },
  red: { cls: "bg-wn-danger-bg text-wn-danger ring-1 ring-wn-danger/30", dot: "bg-wn-danger" },
  navy: { cls: "bg-wn-navy text-white", dot: "bg-wn-sky" },
  muted: { cls: "bg-wn-charcoal/5 text-wn-muted ring-1 ring-wn-line", dot: "bg-wn-charcoal/40" },
};

/** Go / Wait / Skip / Unknown, or the opening status while dormant
 *  ("Opens in 31 days") so a closed hill never wears a red Skip. */
export default function VerdictPill({ v, size = "sm" }: { v: Verdict; size?: "sm" | "md" }) {
  const dormant = v.dormant;
  const look = dormant ? STATUS_TONE[v.status.tone] : VERDICT_PILL[v.verdict];
  const text = dormant ? v.headline : VERDICT_PILL[v.verdict].text;
  return (
    <span
      className={[
        "inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-full font-semibold",
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-xs",
        look.cls,
      ].join(" ")}
    >
      <span className={`block h-2 w-2 shrink-0 rounded-full ${look.dot}`} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </span>
  );
}
