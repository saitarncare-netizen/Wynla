// Go / Wait / Skip / Unknown pill shared by /today and /favorites. Lives
// in its own file because a page module may only export the page.

import type { Verdict } from "@/lib/goWaitSkip";

const VERDICT_PILL: Record<Verdict["verdict"], { text: string; cls: string; dot: string }> = {
  go: { text: "Go", cls: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  wait: { text: "Wait", cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500" },
  skip: { text: "Skip", cls: "bg-red-50 text-red-800 ring-1 ring-red-200", dot: "bg-red-500" },
  unknown: { text: "Unknown", cls: "bg-wn-charcoal/5 text-wn-charcoal/70 ring-1 ring-wn-charcoal/10", dot: "bg-wn-charcoal/40" },
};

const STATUS_TONE: Record<Verdict["status"]["tone"], { cls: string; dot: string }> = {
  green: { cls: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  amber: { cls: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500" },
  red: { cls: "bg-red-50 text-red-800 ring-1 ring-red-200", dot: "bg-red-500" },
  navy: { cls: "bg-wn-navy text-white", dot: "bg-wn-sky" },
  muted: { cls: "bg-wn-charcoal/5 text-wn-charcoal/70 ring-1 ring-wn-charcoal/10", dot: "bg-wn-charcoal/40" },
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
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-[11px]",
        look.cls,
      ].join(" ")}
    >
      <span className={`block h-2 w-2 shrink-0 rounded-full ${look.dot}`} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </span>
  );
}
