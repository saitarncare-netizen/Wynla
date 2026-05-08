"use client";

import { useEffect } from "react";
import {
  SIZE_TIER_KEYS,
  SIZE_TIER_LABELS,
  SIZE_TIER_SHORT,
  type SizeTier,
} from "@/lib/sizeTier";

type FilterDrawerProps = {
  open: boolean;
  onClose: () => void;
  sizeFilter: SizeTier | null;
  nightOnly: boolean;
  sizeCounts: Record<string, number>;
  hiddenByNullSize: number;
  onSizeChange: (s: SizeTier | null) => void;
  onNightChange: (v: boolean) => void;
  onClearAll: () => void;
};

// Visual marker size for size chips (matches map pin diameters)
const SIZE_PX: Record<SizeTier, number> = { small: 8, medium: 11, large: 14 };

export default function FilterDrawer({
  open,
  onClose,
  sizeFilter,
  nightOnly,
  sizeCounts,
  hiddenByNullSize,
  onSizeChange,
  onNightChange,
  onClearAll,
}: FilterDrawerProps) {
  // ESC closes the drawer — keyboard parity with the close button + scrim tap.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const totalSize = Object.values(sizeCounts).reduce((a, b) => a + b, 0);

  return (
    <>
      {/* Scrim — covers the map; tap to close. Same treatment as ResortPanel. */}
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-wn-charcoal/30 backdrop-blur-[1px]"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="More filters"
        className={[
          "fixed z-50 flex flex-col bg-white shadow-2xl",
          // mobile bottom sheet — slides up
          "inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl",
          "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          // desktop right side panel — slides in from right
          "md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[380px] md:max-h-none md:rounded-none",
          "md:animate-[slideLeft_220ms_cubic-bezier(0.16,1,0.3,1)]",
        ].join(" ")}
      >
        {/* Mobile drag handle (visual only) */}
        <div
          className="flex shrink-0 justify-center pt-2 md:hidden"
          aria-hidden="true"
        >
          <div className="h-1 w-10 rounded-full bg-wn-charcoal/20" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-wn-charcoal/10 px-5 py-3">
          <h2 className="text-sm font-bold text-wn-navy">More filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-wn-charcoal/60 transition-colors hover:bg-wn-charcoal/5 hover:text-wn-charcoal"
          >
            <span aria-hidden="true" className="text-lg leading-none">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Mountain size */}
          <section className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wn-charcoal/70">
              Mountain size
            </h3>
            <div className="flex flex-wrap gap-1.5">
              <SizeChip
                active={sizeFilter === null}
                onClick={() => onSizeChange(null)}
                label="All"
                count={totalSize}
              />
              {SIZE_TIER_KEYS.map((key) => (
                <SizeChip
                  key={key}
                  active={sizeFilter === key}
                  onClick={() => onSizeChange(sizeFilter === key ? null : key)}
                  label={SIZE_TIER_SHORT[key]}
                  count={sizeCounts[key] ?? 0}
                  dotPx={SIZE_PX[key]}
                  fullName={SIZE_TIER_LABELS[key]}
                />
              ))}
            </div>
            {sizeFilter !== null && hiddenByNullSize > 0 && (
              <p className="mt-2 text-[11px] italic text-wn-charcoal/55">
                {hiddenByNullSize}{" "}
                {hiddenByNullSize === 1 ? "resort" : "resorts"} with unknown
                size hidden
              </p>
            )}
          </section>

          {/* Features */}
          <section className="mb-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-wn-charcoal/70">
              Features
            </h3>
            <button
              type="button"
              onClick={() => onNightChange(!nightOnly)}
              role="switch"
              aria-checked={nightOnly}
              className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                nightOnly
                  ? "border-wn-navy bg-wn-navy/5 text-wn-navy"
                  : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-charcoal/30"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true">🌙</span>
                <span className="font-semibold">Night skiing</span>
              </span>
              <span
                className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                  nightOnly ? "bg-wn-navy" : "bg-wn-charcoal/25"
                }`}
                aria-hidden="true"
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                    nightOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-wn-charcoal/10 px-5 py-3">
          <button
            type="button"
            onClick={() => {
              onClearAll();
              onClose();
            }}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-wn-charcoal/70 transition-colors hover:bg-wn-charcoal/5 hover:text-wn-navy"
          >
            Clear all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-wn-navy px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-wn-navy/85"
          >
            Done
          </button>
        </div>
      </aside>
    </>
  );
}

function SizeChip({
  active,
  onClick,
  label,
  count,
  dotPx,
  fullName,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  dotPx?: number;
  fullName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={fullName ?? label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "border-wn-navy bg-wn-navy text-white"
          : "border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-charcoal/40"
      }`}
    >
      {dotPx != null && (
        <span
          className={`inline-block rounded-full ${
            active ? "bg-white/80" : "bg-wn-charcoal/70"
          }`}
          style={{ width: dotPx, height: dotPx }}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
      <span className={active ? "opacity-75" : "opacity-60"}>{count}</span>
    </button>
  );
}
