"use client";

// Resort hero photo layer (img + navy scrim + attribution). Hotlinked from
// Wikimedia, which can 429/404/rot — so on any load error we hide the whole
// layer and let the gradient header (behind it) show cleanly instead of a
// broken-image glyph. fetchPriority high because this is the LCP element.

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  attribution?: string | null;
  /** Panel hero is shorter — slightly lighter scrim. */
  compact?: boolean;
};

export default function HeroImage({ src, alt, attribution, compact }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  const scrim = compact
    ? "linear-gradient(180deg, rgba(15,21,48,0.35) 0%, rgba(15,21,48,0.15) 40%, rgba(15,21,48,0.8) 100%)"
    : "linear-gradient(180deg, rgba(15,21,48,0.5) 0%, rgba(15,21,48,0.2) 38%, rgba(15,21,48,0.8) 100%)";
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="absolute inset-0" style={{ background: scrim }} />
      {!compact && attribution && (
        <p className="absolute bottom-1 right-2 z-10 text-[9px] text-white/45">{attribution}</p>
      )}
    </>
  );
}
