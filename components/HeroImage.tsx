"use client";

// Resort hero image layer (photo or terrain card + navy scrim + credit).
// Served through next/image so Vercel's optimizer delivers WebP/AVIF
// (~300 KB JPEG → tens of KB) with long-lived immutable CDN caching — this
// matters because Supabase Storage serves the source objects with
// `Cache-Control: no-cache` regardless of their stored cache_control
// metadata (verified empirically 2026-06-28), so hotlinking them directly
// re-validates the LCP image on every view.
//
// What to show comes from lib/heroSource.ts (photo / card / gradient), so
// every surface applies the same copyright and vetting policy. A gradient
// source renders nothing and the caller's designed gradient shows through;
// the same happens on any load error, so a broken-image glyph never leads
// the page.

import { useState } from "react";
import Image from "next/image";
import type { HeroSource } from "@/lib/heroSource";

type Props = {
  /** Resolved by heroSourceFor(resort). Preferred. */
  source?: HeroSource;
  /**
   * Legacy props, kept so components/Map/ResortPanel.tsx (owned by the
   * sheet package) keeps compiling until it switches to `source`. They
   * are treated as a storage-hosted photo; new callers must pass `source`.
   */
  src?: string;
  alt?: string;
  attribution?: string | null;
  /** Panel hero is shorter — slightly lighter scrim. */
  compact?: boolean;
  /**
   * Layout-accurate `sizes` for the optimizer. The two consumers differ a
   * lot: the resort-page header is full-bleed (100vw at every breakpoint),
   * while the ResortPanel rail is 380px wide on desktop — one shared value
   * either softens the header LCP or over-downloads for the panel.
   */
  sizes?: string;
};

export default function HeroImage({ source, src, alt, attribution, compact, sizes = "100vw" }: Props) {
  const [failed, setFailed] = useState(false);
  const resolved: HeroSource | null = source ?? (src ? { kind: "photo", src, thumb: src, alt: alt ?? "", credit: attribution ?? null } : null);
  if (!resolved || resolved.kind === "gradient" || !resolved.src || failed) return null;
  const scrim = compact
    ? "linear-gradient(180deg, rgba(15,21,48,0.35) 0%, rgba(15,21,48,0.15) 40%, rgba(15,21,48,0.8) 100%)"
    : "linear-gradient(180deg, rgba(15,21,48,0.5) 0%, rgba(15,21,48,0.2) 38%, rgba(15,21,48,0.8) 100%)";
  // A terrain card already carries its own name, scrim and provenance
  // note at the bottom; the page's own heading sits over the same area,
  // so mask the card's text band and print the provenance in our chip.
  const isCard = resolved.kind === "card";
  return (
    <>
      <Image
        src={resolved.src}
        alt={resolved.alt}
        fill
        onError={() => setFailed(true)}
        // LCP element — preload + skip lazy-loading.
        priority
        sizes={sizes}
        className={isCard ? "object-cover object-top" : "object-cover"}
        // The source photos are already curated 1280px thumbs and the cards
        // are WebP; mild compression on top is fine for a scrimmed hero.
        quality={70}
      />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: scrim }} />
      {!compact && resolved.credit && (
        <p className="absolute bottom-1 right-2 z-10 text-[9px] text-white/45">
          {isCard ? "Terrain render · USGS 3DEP" : resolved.credit}
        </p>
      )}
    </>
  );
}
