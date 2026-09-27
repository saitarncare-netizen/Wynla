"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPARE_CHANGE_EVENT, getCompareIds } from "@/lib/compareList";

// "Compare X" CTA. Only renders when the user has ≥2 resorts queued —
// single-item compare is a degenerate case (the slug page already shows
// that resort), so we wait for the second add to nudge them to the
// comparison view.
//
// Two placements:
//   - Desktop (default export): a floating pill at bottom-centre, 40 px up
//     (md:bottom-10) so the Mapbox attribution band stays clear. Bottom-
//     left is the Alaska inset, bottom-right the legend, so the centre is
//     free. Hidden below md.
//   - Phones (ComparePill): rendered by MapPage inside the one bottom pill
//     row (List / Compare / Location) anchored at --wn-bottom-stack, so it
//     can never collide with its neighbours. See phoneBottomRow in
//     components/Map/ResortSheetMath.ts for the width budget.

/** The compare list (localStorage), kept in sync across tabs and with
 *  CompareToggle taps in this tab. */
export function useCompareIds(): number[] {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    function sync() {
      setIds(getCompareIds());
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(COMPARE_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(COMPARE_CHANGE_EVENT, sync);
    };
  }, []);
  return ids;
}

/** The pill itself. `ids` comes from useCompareIds in the caller so the
 *  phone row can size its other pills around it. */
export function ComparePill({ ids, className = "" }: { ids: number[]; className?: string }) {
  const router = useRouter();
  if (ids.length < 2) return null;
  return (
    <button
      type="button"
      onClick={() => router.push(`/compare?ids=${ids.join(",")}`)}
      className={[
        "pointer-events-auto inline-flex h-11 min-w-0 items-center gap-1.5 rounded-full bg-wn-navy px-3.5 text-sm font-semibold text-white shadow-xl transition hover:bg-wn-navy/90 active:scale-95",
        className,
      ].join(" ")}
      aria-label={`Compare ${ids.length} resorts`}
    >
      <span aria-hidden="true" className="shrink-0 text-base leading-none">
        ⇄
      </span>
      {/* Truncates rather than overlapping a neighbour if a font renders
          wider than the row budget assumes. */}
      <span className="truncate">Compare {ids.length}</span>
    </button>
  );
}

export default function CompareFloatingButton() {
  const ids = useCompareIds();
  if (ids.length < 2) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-10 z-30 hidden justify-center px-4 md:flex">
      <ComparePill ids={ids} />
    </div>
  );
}
