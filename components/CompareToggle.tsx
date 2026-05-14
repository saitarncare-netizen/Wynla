"use client";

import { useEffect, useState } from "react";
import {
  COMPARE_CHANGE_EVENT,
  COMPARE_MAX,
  addToCompare,
  getCompareIds,
  removeFromCompare,
} from "@/lib/compareList";

type Props = {
  resortId: number;
  // Larger pill for the slug-page hero; default fits next to the
  // FavoriteToggle inside the ResortPanel header.
  size?: "sm" | "lg";
};

// Tiny pill that adds / removes the current resort from the compare
// list (localStorage). Styled to match FavoriteToggle's "white pill on
// hero" look so the two controls sit next to each other cleanly.
export default function CompareToggle({ resortId, size = "sm" }: Props) {
  // SSR renders with `inList=false` so the markup matches what the
  // server emits; the useEffect below re-syncs to actual storage on
  // mount, which avoids a hydration mismatch warning.
  const [inList, setInList] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    function sync() {
      const ids = getCompareIds();
      setCount(ids.length);
      setInList(ids.includes(resortId));
    }
    sync();
    // Cross-tab sync (storage) + same-tab sync (custom event).
    window.addEventListener("storage", sync);
    window.addEventListener(COMPARE_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(COMPARE_CHANGE_EVENT, sync);
    };
  }, [resortId]);

  // Disable the "add" path when the list is full and this resort isn't
  // already on it — prevents a silent no-op (the helper caps at 4).
  const disabled = !inList && count >= COMPARE_MAX;

  function toggle() {
    if (inList) {
      removeFromCompare(resortId);
    } else {
      if (disabled) return;
      addToCompare(resortId);
    }
  }

  const dim =
    size === "lg"
      ? "h-10 px-3.5 text-xs"
      : "h-9 px-3 text-[11px]";

  const label = inList ? "Comparing" : "Compare";
  const title = disabled
    ? `Compare list full (${COMPARE_MAX} max)`
    : inList
      ? "Remove from compare"
      : "Add to compare";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      aria-pressed={inList}
      aria-label={title}
      title={title}
      className={[
        "inline-flex items-center justify-center gap-1 rounded-full font-semibold shadow-md backdrop-blur-sm transition active:scale-95",
        dim,
        inList
          ? "bg-wn-navy text-white hover:bg-wn-navy/90"
          : "bg-white/95 text-wn-charcoal hover:text-wn-navy",
        disabled ? "cursor-not-allowed opacity-60" : "",
      ].join(" ")}
    >
      <span aria-hidden="true" className="text-sm leading-none">
        {inList ? "✓" : "+"}
      </span>
      <span>{label}</span>
    </button>
  );
}
