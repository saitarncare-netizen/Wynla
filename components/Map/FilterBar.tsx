"use client";

import { useEffect, useRef, useState } from "react";
import { ORIGINS, originByCode } from "@/lib/origins";
import { PASS_COLORS, PASS_KEYS, PASS_LABELS } from "@/lib/passColors";
import { SIZE_TIER_LABELS, type SizeTier } from "@/lib/sizeTier";

type Props = {
  passFilter: string | null;
  fromCode: string;
  withinHours: number;
  sizeFilter: SizeTier | null;
  nightOnly: boolean;
  passCounts: Record<string, number>;
  hiddenByNullSize: number;
  filteredCount: number;
  totalCount: number;
  onPassChange: (p: string | null) => void;
  onFromChange: (f: string) => void;
  onWithinChange: (w: string | null) => void;
  onSizeChange: (s: SizeTier | null) => void;
  onNightChange: (v: boolean) => void;
  onClearAll: () => void;
  onOpenDrawer: () => void;
};

// Distance presets — match how skiers actually plan trips. "Day trip" = home
// before bedtime; "Weekend" = leave Friday night, return Sunday.
const TRIP_PRESETS = [
  { value: "0", emoji: "",   label: "Anytime"   },
  { value: "3", emoji: "🚗", label: "Day trip"  },
  { value: "5", emoji: "🏕️", label: "Weekend"  },
];

type ActiveChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

export default function FilterBar({
  passFilter,
  fromCode,
  withinHours,
  sizeFilter,
  nightOnly,
  passCounts,
  hiddenByNullSize,
  filteredCount,
  totalCount,
  onPassChange,
  onFromChange,
  onWithinChange,
  onSizeChange,
  onNightChange,
  onClearAll,
  onOpenDrawer,
}: Props) {
  const totalPass = Object.values(passCounts).reduce((a, b) => a + b, 0);
  const origin = originByCode(fromCode);

  // Build active-chip strip from current filter state. Chips render in a
  // stable order so the strip doesn't shuffle as users add/remove.
  const tripPreset =
    TRIP_PRESETS.find((p) => p.value === String(withinHours)) ?? TRIP_PRESETS[0];
  const tripActive = withinHours > 0;

  const activeChips: ActiveChip[] = [];
  if (passFilter) {
    activeChips.push({
      key: "pass",
      label: `Pass: ${PASS_LABELS[passFilter as keyof typeof PASS_LABELS] ?? passFilter}`,
      onRemove: () => onPassChange(null),
    });
  }
  if (tripActive) {
    activeChips.push({
      key: "trip",
      label: `${tripPreset.label} from ${origin.short}`,
      onRemove: () => onWithinChange(null),
    });
  }
  if (sizeFilter) {
    activeChips.push({
      key: "size",
      label: `Size: ${SIZE_TIER_LABELS[sizeFilter]}`,
      onRemove: () => onSizeChange(null),
    });
  }
  if (nightOnly) {
    activeChips.push({
      key: "night",
      label: "🌙 Night skiing",
      onRemove: () => onNightChange(false),
    });
  }

  const moreCount = (sizeFilter ? 1 : 0) + (nightOnly ? 1 : 0);

  // Trip dropdown label collapses From + preset into one line.
  const tripLabel = tripActive
    ? `From ${origin.short} · ${tripPreset.label}`
    : `From ${origin.short} · Anytime`;

  // Pass dropdown label shows the active pass + colored dot when one is set.
  const passLabel = passFilter
    ? PASS_LABELS[passFilter as keyof typeof PASS_LABELS] ?? "All passes"
    : "All passes";

  return (
    <div className="flex flex-col gap-2 px-4 pb-3 sm:px-6">
      {/* Top row — three dropdown buttons + count on the right.
          Mobile: horizontal scroll keeps the row compact; desktop: inline. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-4 flex shrink-0 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0">
          <PassDropdown
            passFilter={passFilter}
            passCounts={passCounts}
            totalPass={totalPass}
            label={passLabel}
            onPassChange={onPassChange}
          />
          <TripDropdown
            fromCode={fromCode}
            withinHours={withinHours}
            label={tripLabel}
            onFromChange={onFromChange}
            onWithinChange={onWithinChange}
          />
          <button
            type="button"
            onClick={onOpenDrawer}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal transition-colors duration-200 hover:border-wn-charcoal/40 min-h-[36px]"
            aria-label="More filters"
          >
            <span aria-hidden="true">≡</span>
            <span>More filters</span>
            {moreCount > 0 && (
              <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-wn-navy px-1 text-[10px] font-bold text-white">
                {moreCount}
              </span>
            )}
          </button>
        </div>

        <div className="shrink-0 text-xs font-medium text-wn-charcoal/70 sm:text-right">
          {filteredCount} / {totalCount}
          {sizeFilter !== null && hiddenByNullSize > 0 && (
            <span className="ml-1 italic text-wn-charcoal/55">
              · {hiddenByNullSize} unknown size hidden
            </span>
          )}
        </div>
      </div>

      {/* Active-filter chips strip — only renders when something is active.
          Each chip has × to remove individually; "Clear all" appears on 2+. */}
      {activeChips.length > 0 && (
        <div className="-mx-4 flex flex-wrap items-center gap-1.5 px-4 sm:mx-0 sm:px-0">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-wn-navy bg-wn-navy px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-wn-navy/85"
              aria-label={`Remove ${chip.label}`}
            >
              <span>{chip.label}</span>
              <span aria-hidden="true" className="text-white/80">×</span>
            </button>
          ))}
          {activeChips.length > 1 && (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto shrink-0 text-[11px] font-semibold text-wn-charcoal/60 underline-offset-2 transition-colors hover:text-wn-navy hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pass dropdown                                                              */
/* -------------------------------------------------------------------------- */

function PassDropdown({
  passFilter,
  passCounts,
  totalPass,
  label,
  onPassChange,
}: {
  passFilter: string | null;
  passCounts: Record<string, number>;
  totalPass: number;
  label: string;
  onPassChange: (p: string | null) => void;
}) {
  const { open, setOpen, ref } = useDropdown();
  const activeColor = passFilter
    ? PASS_COLORS[passFilter as keyof typeof PASS_COLORS]
    : null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          passFilter
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {activeColor && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: activeColor }}
            aria-hidden="true"
          />
        )}
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-2 shadow-lg z-30"
        >
          <DropdownRow
            active={passFilter === null}
            onClick={() => {
              onPassChange(null);
              setOpen(false);
            }}
          >
            <span className="font-semibold">All passes</span>
            <span className="ml-auto text-wn-charcoal/55">{totalPass}</span>
          </DropdownRow>
          <div className="my-1 h-px bg-wn-charcoal/10" />
          {PASS_KEYS.map((key) => {
            const count = passCounts[key] ?? 0;
            const isActive = passFilter === key;
            return (
              <DropdownRow
                key={key}
                active={isActive}
                onClick={() => {
                  onPassChange(isActive ? null : key);
                  setOpen(false);
                }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: PASS_COLORS[key] }}
                  aria-hidden="true"
                />
                <span>{PASS_LABELS[key]}</span>
                <span className="ml-auto text-wn-charcoal/55">{count}</span>
              </DropdownRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Trip dropdown (origin + length)                                            */
/* -------------------------------------------------------------------------- */

function TripDropdown({
  fromCode,
  withinHours,
  label,
  onFromChange,
  onWithinChange,
}: {
  fromCode: string;
  withinHours: number;
  label: string;
  onFromChange: (f: string) => void;
  onWithinChange: (w: string | null) => void;
}) {
  const { open, setOpen, ref } = useDropdown();
  const tripActive = withinHours > 0;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${
          tripActive
            ? "border-wn-navy bg-wn-navy text-white"
            : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="opacity-70">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 mt-1 w-64 rounded-lg border border-wn-charcoal/15 bg-white p-3 shadow-lg z-30"
        >
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            From
          </div>
          <select
            value={fromCode}
            onChange={(e) => onFromChange(e.target.value)}
            className="mb-3 w-full rounded-md border border-wn-charcoal/20 bg-white px-2 py-1.5 text-xs font-medium text-wn-charcoal hover:border-wn-charcoal/40 focus:outline-none focus:ring-2 focus:ring-wn-sky"
            aria-label="From city"
          >
            {ORIGINS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            Trip length
          </div>
          <div className="flex flex-col gap-1">
            {TRIP_PRESETS.map((opt) => {
              const active = String(withinHours) === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onWithinChange(opt.value === "0" ? null : opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                    active
                      ? "border-wn-navy bg-wn-navy text-white"
                      : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
                  }`}
                >
                  {opt.emoji && <span aria-hidden="true">{opt.emoji}</span>}
                  <span>{opt.label}</span>
                  {opt.value === "3" && (
                    <span className={`ml-auto text-[10px] ${active ? "text-white/75" : "text-wn-charcoal/55"}`}>
                      ≤ 3h
                    </span>
                  )}
                  {opt.value === "5" && (
                    <span className={`ml-auto text-[10px] ${active ? "text-white/75" : "text-wn-charcoal/55"}`}>
                      ≤ 5h
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared dropdown helpers                                                    */
/* -------------------------------------------------------------------------- */

// Minimal click-outside + ESC-to-close hook. No library dep — the state is
// owned by the parent dropdown component. Reused by both pass + trip menus.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

function DropdownRow({
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
      role="menuitemradio"
      aria-checked={active}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
        active
          ? "bg-wn-navy/10 font-semibold text-wn-navy"
          : "font-medium text-wn-charcoal hover:bg-wn-charcoal/5"
      }`}
    >
      {children}
    </button>
  );
}
