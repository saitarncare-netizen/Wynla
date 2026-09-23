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
import Link from "next/link";
import type { HeroSource } from "@/lib/heroSource";

type Props = {
  /** Resolved by heroSourceFor(resort); every caller goes through it. */
  source: HeroSource;
  /** Panel hero is shorter — slightly lighter scrim, credit top-left. */
  compact?: boolean;
  /**
   * Layout-accurate `sizes` for the optimizer. The two consumers differ a
   * lot: the resort-page header is full-bleed (100vw at every breakpoint),
   * while the ResortPanel rail is 380px wide on desktop — one shared value
   * either softens the header LCP or over-downloads for the panel.
   */
  sizes?: string;
};

export default function HeroImage({ source: resolved, compact, sizes = "100vw" }: Props) {
  const [failed, setFailed] = useState(false);
  if (resolved.kind === "gradient" || !resolved.src || failed) return null;
  const scrim = compact
    ? "linear-gradient(180deg, rgba(15,21,48,0.35) 0%, rgba(15,21,48,0.15) 40%, rgba(15,21,48,0.8) 100%)"
    : "linear-gradient(180deg, rgba(15,21,48,0.5) 0%, rgba(15,21,48,0.2) 38%, rgba(15,21,48,0.8) 100%)";
  const isCard = resolved.kind === "card";
  // Terrain cards are rendered without text, so the page's own heading is
  // the only name on screen; the chip says what the image is.
  const chip = isCard ? "Terrain render · USGS 3DEP" : resolved.credit ? `Photo: ${resolved.credit}` : null;
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
        className="object-cover"
        // The source photos are already curated 1280px thumbs and the cards
        // are WebP; mild compression on top is fine for a scrimmed hero.
        quality={70}
      />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: scrim }} />
      {chip &&
        (compact ? (
          // The map panel has no footer to carry the credit, so the chip is
          // the attribution CC BY / BY-SA asks for, and it links to the full
          // entry. Top-left is the one free corner (buttons top-right, the
          // name bottom-left). The link box is 44 px tall for touch while
          // the visible pill stays small.
          <Link
            href="/credits"
            className="group absolute left-2 top-0 z-10 flex min-h-11 max-w-[55%] items-center"
            aria-label={isCard ? "Terrain render from USGS 3DEP elevation data. Photo credits" : `${chip}. Photo credits`}
          >
            <span className="rounded bg-[#0F1530]/70 px-1.5 py-0.5 text-[10px] leading-tight text-white/90 group-hover:underline">
              {chip}
            </span>
          </Link>
        ) : (
          // The resort page prints the full credit and a /credits link in
          // its footer; this chip is the on-image label. White/70 over the
          // 0.8 navy scrim clears 4.5:1.
          <p className="absolute bottom-1 right-2 z-10 text-[10px] text-white/70">{chip}</p>
        ))}
    </>
  );
}
