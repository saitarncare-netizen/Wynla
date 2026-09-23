"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COMPARE_CHANGE_EVENT, getCompareIds } from "@/lib/compareList";

// Floating "Compare X" CTA. Only renders when the user has ≥2 resorts
// queued — single-item compare is a degenerate case (the slug page
// already shows that resort), so we wait for the second add to nudge
// them to the comparison view.
//
// Bottom-center on every breakpoint, one step above the Feedback /
// Location pill row on phones (that row sits at bottom-10, this at
// bottom-22) so the three never overlap at 375px. Centered on desktop
// too: bottom-left is the Alaska inset, bottom-right is the legend.
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
      className="pointer-events-none fixed inset-x-0 bottom-22 z-30 flex justify-center px-4 md:bottom-10"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <button
        type="button"
        onClick={open}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-wn-navy px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:bg-wn-navy/90 active:scale-95"
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
