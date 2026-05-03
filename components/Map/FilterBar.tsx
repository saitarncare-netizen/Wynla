"use client";

import { ORIGINS } from "@/lib/origins";
import { PASS_LABELS } from "@/lib/passColors";

type Props = {
  passFilter: string | null;
  fromCode: string;
  withinHours: number;
  onPassChange: (p: string | null) => void;
  onFromChange: (f: string) => void;
  onWithinChange: (w: string | null) => void;
  counts: Record<string, number>;
};

const PASS_KEYS = ["epic", "ikon", "indy", "independent"] as const;

const HOUR_OPTIONS = [
  { value: "0", label: "Any drive time" },
  { value: "2", label: "≤ 2 hours" },
  { value: "3", label: "≤ 3 hours" },
  { value: "4", label: "≤ 4 hours" },
  { value: "5", label: "≤ 5 hours" },
];

export default function FilterBar({
  passFilter,
  fromCode,
  withinHours,
  onPassChange,
  onFromChange,
  onWithinChange,
  counts,
}: Props) {
  return (
    <div className="flex flex-col gap-2 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
      {/* Pass chips — horizontal scroll on mobile */}
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
        <Chip active={passFilter === null} onClick={() => onPassChange(null)}>
          All <span className="opacity-60">{Object.values(counts).reduce((a, b) => a + b, 0)}</span>
        </Chip>
        {PASS_KEYS.map((key) => (
          <Chip
            key={key}
            active={passFilter === key}
            onClick={() => onPassChange(passFilter === key ? null : key)}
          >
            {PASS_LABELS[key].replace(" Pass", "")}{" "}
            <span className="opacity-60">{counts[key] ?? 0}</span>
          </Chip>
        ))}
      </div>

      {/* Distance dropdowns */}
      <div className="flex shrink-0 items-center gap-2 text-xs">
        <select
          value={fromCode}
          onChange={(e) => onFromChange(e.target.value)}
          className="min-h-[36px] rounded-md border border-wn-charcoal/20 bg-white px-2 py-1 font-medium text-wn-charcoal focus:outline-none focus:ring-2 focus:ring-wn-sky"
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
          className="min-h-[36px] rounded-md border border-wn-charcoal/20 bg-white px-2 py-1 font-medium text-wn-charcoal focus:outline-none focus:ring-2 focus:ring-wn-sky"
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
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-wn-navy bg-wn-navy text-white"
          : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
      }`}
    >
      {children}
    </button>
  );
}
