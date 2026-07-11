"use client";

// Resort hero photo layer (image + navy scrim + attribution). Served through
// next/image so Vercel's optimizer delivers WebP/AVIF (~300 KB JPEG → tens of
// KB) with long-lived immutable CDN caching — this matters because Supabase
// Storage serves the source objects with `Cache-Control: no-cache` regardless
// of their stored cache_control metadata (verified empirically 2026-06-28),
// so hotlinking them directly re-validates the LCP image on every view.
// On any load error we hide the whole layer and let the gradient header
// (behind it) show cleanly instead of a broken-image glyph.

import { useState } from "react";
import Image from "next/image";

type Props = {
  src: string;
  alt: string;
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

export default function HeroImage({
  src,
  alt,
  attribution,
  compact,
  sizes = "100vw",
}: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  const scrim = compact
    ? "linear-gradient(180deg, rgba(15,21,48,0.35) 0%, rgba(15,21,48,0.15) 40%, rgba(15,21,48,0.8) 100%)"
    : "linear-gradient(180deg, rgba(15,21,48,0.5) 0%, rgba(15,21,48,0.2) 38%, rgba(15,21,48,0.8) 100%)";
  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill
        onError={() => setFailed(true)}
        // LCP element — preload + skip lazy-loading.
        priority
        sizes={sizes}
        className="object-cover"
        // The source photos are already curated 1280px thumbs; mild
        // compression on top is fine for a scrimmed hero.
        quality={70}
      />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: scrim }} />
      {!compact && attribution && (
        <p className="absolute bottom-1 right-2 z-10 text-[9px] text-white/45">{attribution}</p>
      )}
    </>
  );
}
