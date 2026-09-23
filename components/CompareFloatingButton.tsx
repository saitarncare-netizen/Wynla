"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPARE_CHANGE_EVENT, getCompareIds } from "@/lib/compareList";

// Floating "Compare X" CTA. Only renders when the user has ≥2 resorts
// queued — single-item compare is a degenerate case (the slug page
// already shows that resort), so we wait for the second add to nudge
// them to the comparison view.
//
// Bottom-centre on every breakpoint. On phones it sits one step above
// the List / Location / Feedback pill row, which starts at
// --wn-bottom-stack (published by components/Map/MapPage.tsx: the Mapbox
// attribution band, the install nudge or the peek sheet), and hides while
// a resort sheet is at half or full ([data-sheet-snap] on the map root).
// Desktop: bottom-left is the Alaska inset, bottom-right is the legend,
// so the centre is free.
export default function CompareFloatingButton() {
  const router = useRouter();
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

  if (ids.length < 2) return null;

  function open() {
    router.push(`/compare?ids=${ids.join(",")}`);
  }

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-30 flex justify-center px-4 md:bottom-10 [[data-sheet-snap=full]_&]:hidden [[data-sheet-snap=half]_&]:hidden"
      style={{ bottom: "calc(var(--wn-bottom-stack, 40px) + 56px)" }}
    >
      <button
        type="button"
        onClick={open}
        className="pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full bg-wn-navy px-5 text-sm font-semibold text-white shadow-xl transition hover:bg-wn-navy/90 active:scale-95"
        aria-label={`Compare ${ids.length} resorts`}
      >
        <span aria-hidden="true" className="text-base leading-none">
          ⇄
        </span>
        <span>Compare {ids.length}</span>
        <span aria-hidden="true" className="text-base leading-none">
          →
        </span>
      </button>
    </div>
  );
}
