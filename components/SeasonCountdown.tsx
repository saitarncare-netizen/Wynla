import {
  type ResortStatus,
  type SeasonInfo,
  formatShortDate,
} from "@/lib/seasonDates";

type Variant = "badge" | "hero";

type Props = {
  info: SeasonInfo;
  /**
   * "badge" = compact pill suitable for the map's ResortPanel preview body.
   * "hero" = larger pill for the /resort/[slug] hero region.
   */
  variant?: Variant;
  className?: string;
};

/**
 * Pure presentational countdown. Given a SeasonInfo from
 * `parseSeasonDates` / `resolveSeasonInfo`, render either:
 *   - in-season → green-tinted pill "⛷️ Open until {date} · N days"
 *   - off-season w/ daysUntilOpen ≤ 365 → navy pill "❄️ Opens in N days · {date}"
 *   - off-season (out of range) → small muted "Season dates coming"
 *   - unknown → small muted "Season dates coming"
 * Approximate dates (parsed from "mid-November" style text) carry a "~".
 */
export default function SeasonCountdown({ info, variant = "badge", className }: Props) {
  const isHero = variant === "hero";
  const approx = info.approximate ? "~" : "";

  if (info.status === "in-season" && info.nextCloseDate) {
    const days = info.daysUntilClose;
    return (
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded-full font-semibold",
          isHero
            ? "bg-emerald-600/90 px-3 py-1.5 text-sm text-white shadow-sm"
            : "bg-emerald-50 px-2 py-1 text-[11px] text-emerald-800 ring-1 ring-emerald-200",
          className ?? "",
        ].join(" ")}
      >
        <span aria-hidden="true">⛷️</span>
        <span>
          Season runs to {approx}{formatShortDate(info.nextCloseDate)}
          {days != null && days > 0 ? ` · ${days} day${days === 1 ? "" : "s"} left` : ""}
        </span>
      </span>
    );
  }

  if (
    info.status === "off-season" &&
    info.daysUntilOpen != null &&
    info.daysUntilOpen <= 365 &&
    info.nextOpenDate
  ) {
    return (
      <span
        className={[
          "inline-flex items-center gap-1.5 rounded-full font-semibold",
          isHero
            ? "bg-wn-navy px-3 py-1.5 text-sm text-white shadow-sm"
            : "bg-wn-navy/95 px-2 py-1 text-[11px] text-white",
          className ?? "",
        ].join(" ")}
      >
        <span aria-hidden="true">❄️</span>
        <span>
          Opens in {info.daysUntilOpen} day{info.daysUntilOpen === 1 ? "" : "s"} · {approx}
          {formatShortDate(info.nextOpenDate)}
        </span>
      </span>
    );
  }

  // off-season w/o nextOpenDate or daysUntilOpen > 365, or status === "unknown"
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full bg-wn-charcoal/5 px-2 py-1 text-[11px] font-medium text-wn-charcoal/60",
        className ?? "",
      ].join(" ")}
    >
      Season dates coming
    </span>
  );
}

const TONE_CLASS: Record<ResortStatus["tone"], { pill: string; dot: string }> = {
  green: { pill: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  amber: { pill: "bg-amber-50 text-amber-800 ring-1 ring-amber-200", dot: "bg-amber-500" },
  red: { pill: "bg-red-50 text-red-800 ring-1 ring-red-200", dot: "bg-red-500" },
  navy: { pill: "bg-wn-navy text-white", dot: "bg-wn-sky" },
  muted: { pill: "bg-wn-charcoal/5 text-wn-charcoal/70 ring-1 ring-wn-charcoal/10", dot: "bg-wn-charcoal/40" },
};

/**
 * Open / closed / opens-on / check-resort pill shared by the resort page
 * (at-a-glance strip) and the map panel (above the 3-stat card). Every
 * resort gets one — the audit found ~96% of panels showed no status at
 * all (resort-panel-detail-3).
 */
export function ResortStatusPill({
  status,
  size = "sm",
  className,
}: {
  status: ResortStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = TONE_CLASS[status.tone];
  return (
    <span
      className={[
        "inline-flex max-w-full items-center gap-1.5 rounded-full font-semibold",
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2 py-1 text-[11px]",
        tone.pill,
        className ?? "",
      ].join(" ")}
    >
      <span className={`block h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden="true" />
      <span className="truncate">
        {status.label}
        {status.detail && <span className="font-normal opacity-80"> · {status.detail}</span>}
      </span>
    </span>
  );
}
