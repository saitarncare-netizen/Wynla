"use client";

// Client-side action chips for the (server-rendered) compare page —
// "Clear all" empties the localStorage compare list and bounces back
// to the map. Lives in a thin client wrapper because /compare/page.tsx
// itself is `async` server component and can't touch window.
//
// Why a chip not just a link: removing data is destructive, so the
// label says exactly what happens ("Clear compare list") and the
// button styling is muted rather than primary — users don't accidentally
// nuke their stack of resorts when they were aiming for "← Map".

import { useRouter } from "next/navigation";
import { clearCompare } from "@/lib/compareList";

export default function ClearCompareButton() {
  const router = useRouter();
  function onClick() {
    clearCompare();
    router.push("/");
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-wn-charcoal/15 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal/70 transition hover:border-red-400 hover:text-red-700"
      aria-label="Clear compare list and return to map"
    >
      <span aria-hidden="true">✕</span>
      Clear compare
    </button>
  );
}
