// Stacked horizontal bar showing the difficulty mix as percentages.
// Four colored segments (green/blue/black/double-black) sized by
// percent, with a label row below. When all four buckets are zero
// the component returns null — callers gate visibility based on
// getDifficultyMix() returning a non-null result.

import type { DifficultyMix } from "@/lib/difficulty";

type Props = {
  mix: DifficultyMix;
  /** If true, show "from counts" italic caption clarifying that the
      percentages were derived from underlying trail counts rather than
      taken directly from a published percentage. */
  showSourceHint?: boolean;
  /** "compact" trims label sizes for the in-map ResortPanel; "full" is
      the default size used on /resort/[slug]. */
  size?: "compact" | "full";
};

export default function DifficultyBar({ mix, showSourceHint, size = "full" }: Props) {
  const segments: Array<{
    key: "beginner" | "intermediate" | "advanced" | "expert";
    pct: number;
    color: string;
    label: string;
    symbol: React.ReactNode;
  }> = [
    {
      key: "beginner",
      pct: mix.beginner,
      color: "#10b981", // emerald-500
      label: "Beginner",
      symbol: <span className="block h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden="true" />,
    },
    {
      key: "intermediate",
      pct: mix.intermediate,
      color: "#0ea5e9", // sky-500
      label: "Intermediate",
      symbol: <span className="block h-2.5 w-2.5 bg-sky-500" aria-hidden="true" />,
    },
    {
      key: "advanced",
      pct: mix.advanced,
      color: "#000000",
      label: "Expert",
      symbol: <span className="block h-2.5 w-2.5 rotate-45 bg-black" aria-hidden="true" />,
    },
    {
      key: "expert",
      pct: mix.expert,
      color: "#000000",
      label: "Expert Only",
      symbol: (
        <span className="flex items-center gap-0.5" aria-hidden="true">
          <span className="block h-2 w-2 rotate-45 bg-black" />
          <span className="block h-2 w-2 rotate-45 bg-black" />
        </span>
      ),
    },
  ];

  const labelClass = size === "compact" ? "text-[10px]" : "text-[11px]";
  const numClass = size === "compact" ? "text-xs" : "text-sm";
  const barHeight = size === "compact" ? "h-2.5" : "h-3";

  return (
    <div>
      <div
        className={`flex w-full ${barHeight} overflow-hidden rounded-full border border-wn-charcoal/10`}
        role="img"
        aria-label={`Difficulty mix: ${segments.map((s) => `${s.pct}% ${s.label}`).join(", ")}`}
      >
        {segments.map((s) =>
          s.pct > 0 ? (
            <div
              key={s.key}
              style={{ width: `${s.pct}%`, backgroundColor: s.color }}
              title={`${s.label}: ${s.pct}%`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-1.5 grid grid-cols-4 gap-1">
        {segments.map((s) => (
          <div key={s.key} className="flex flex-col items-center gap-0.5 text-center">
            <span className="flex h-3 items-center justify-center">{s.symbol}</span>
            <span className={`${numClass} font-bold leading-none text-wn-navy`}>
              {s.pct}%
            </span>
            <span className={`${labelClass} font-semibold uppercase leading-tight tracking-wide text-wn-charcoal/55`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {showSourceHint && !mix.fromPct && (
        <p className="mt-1.5 text-[10px] italic text-wn-charcoal/45">
          Mix derived from trail counts.
        </p>
      )}
    </div>
  );
}
