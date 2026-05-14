import { type SeasonInfo, formatShortDate } from "@/lib/seasonDates";

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
 * `parseSeasonDates`, render either:
 *   - in-season → green-tinted pill "⛷️ Open until {date} · N days"
 *   - off-season w/ daysUntilOpen ≤ 365 → navy pill "❄️ Opens in N days · {date}"
 *   - off-season (out of range) → small muted "Season info coming"
 *   - unknown → small muted "Season info coming"
 */
export default function SeasonCountdown({ info, variant = "badge", className }: Props) {
  const isHero = variant === "hero";

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
          Open until {formatShortDate(info.nextCloseDate)}
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
          Opens in {info.daysUntilOpen} day{info.daysUntilOpen === 1 ? "" : "s"} · {formatShortDate(info.nextOpenDate)}
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
      Season info coming
    </span>
  );
}
