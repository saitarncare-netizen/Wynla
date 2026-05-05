"use client";

import { ORIGINS } from "@/lib/origins";
import { PASS_COLORS, PASS_KEYS, PASS_SHORT } from "@/lib/passColors";
import { SIZE_TIER_KEYS, SIZE_TIER_SHORT, type SizeTier } from "@/lib/sizeTier";

type Props = {
  passFilter: string | null;
  sizeFilter: SizeTier | null;
  fromCode: string;
  withinHours: number;
  onPassChange: (p: string | null) => void;
  onSizeChange: (s: SizeTier | null) => void;
  onFromChange: (f: string) => void;
  onWithinChange: (w: string | null) => void;
  passCounts: Record<string, number>;
  sizeCounts: Record<string, number>;
  hiddenByNullSize: number;
};

const HOUR_OPTIONS = [
  { value: "0", label: "Any drive time" },
  { value: "2", label: "≤ 2 hours" },
  { value: "3", label: "≤ 3 hours" },
  { value: "4", label: "≤ 4 hours" },
  { value: "5", label: "≤ 5 hours" },
];

// Visual marker size for the size chips (matches map pin diameters)
const SIZE_PX: Record<SizeTier, number> = { small: 8, medium: 11, large: 14 };

export default function FilterBar({
  passFilter,
  sizeFilter,
  fromCode,
  withinHours,
  onPassChange,
  onSizeChange,
  onFromChange,
  onWithinChange,
  passCounts,
  sizeCounts,
  hiddenByNullSize,
}: Props) {
  const totalPass = Object.values(passCounts).reduce((a, b) => a + b, 0);
  const totalSize = Object.values(sizeCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-2 px-4 pb-3 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        {/* Pass chips — horizontal scroll on mobile */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          <Chip active={passFilter === null} onClick={() => onPassChange(null)}>
            All <span className="opacity-60">{totalPass}</span>
          </Chip>
          {PASS_KEYS.map((key) => (
            <Chip
              key={key}
              active={passFilter === key}
              color={PASS_COLORS[key]}
              onClick={() => onPassChange(passFilter === key ? null : key)}
            >
              {PASS_SHORT[key]} <span className="opacity-60">{passCounts[key] ?? 0}</span>
            </Chip>
          ))}
        </div>

        {/* Distance dropdowns */}
        <div className="flex shrink-0 items-center gap-2 text-xs">
          <select
            value={fromCode}
            onChange={(e) => onFromChange(e.target.value)}
            className="min-h-[36px] rounded-md border border-wn-charcoal/20 bg-white px-2 py-1 font-medium text-wn-charcoal transition-colors duration-200 hover:border-wn-charcoal/40 focus:outline-none focus:ring-2 focus:ring-wn-sky"
            aria-label="From city"
          >
            {ORIGINS.map((o) => (
              <option key={o.code} value={o.code}>
                from {o.short}
              </option>
            ))}
          </select>
          <select
            value={String(withinHours)}
            onChange={(e) =>
              onWithinChange(e.target.value === "0" ? null : e.target.value)
            }
            className="min-h-[36px] rounded-md border border-wn-charcoal/20 bg-white px-2 py-1 font-medium text-wn-charcoal transition-colors duration-200 hover:border-wn-charcoal/40 focus:outline-none focus:ring-2 focus:ring-wn-sky"
            aria-label="Maximum drive time"
          >
            {HOUR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Size chips — second row, scrollable on mobile */}
      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
          Size
        </span>
        <Chip active={sizeFilter === null} onClick={() => onSizeChange(null)}>
          All <span className="opacity-60">{totalSize}</span>
        </Chip>
        {SIZE_TIER_KEYS.map((key) => (
          <Chip
            key={key}
            active={sizeFilter === key}
            onClick={() => onSizeChange(sizeFilter === key ? null : key)}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block rounded-full bg-wn-charcoal/70"
                style={{ width: SIZE_PX[key], height: SIZE_PX[key] }}
                aria-hidden="true"
              />
              {SIZE_TIER_SHORT[key]} <span className="opacity-60">{sizeCounts[key] ?? 0}</span>
            </span>
          </Chip>
        ))}
      </div>

      {/* Strict-filter caption: NULL vertical_drop is hidden when a size chip
          is active. Shown only if there's actually anything being hidden. */}
      {sizeFilter !== null && hiddenByNullSize > 0 && (
        <p className="px-1 text-[11px] italic text-wn-charcoal/55">
          {hiddenByNullSize} {hiddenByNullSize === 1 ? "resort" : "resorts"} with unknown size hidden
        </p>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color?: string;
  children: React.ReactNode;
}) {
  // When a brand color is provided and the chip is active, fill with that
  // color. Ikon yellow gets dark text since white-on-yellow fails WCAG.
  const activeStyle =
    active && color
      ? {
          backgroundColor: color,
          borderColor: color,
          color: color === "#F2C200" ? "#1E2952" : "#FFFFFF",
        }
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      style={activeStyle}
      className={`shrink-0 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
        active && !color
          ? "border-wn-navy bg-wn-navy text-white"
          : !active
            ? "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
            : ""
      }`}
    >
      {children}
    </button>
  );
}
