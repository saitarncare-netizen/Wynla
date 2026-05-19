// Inline-SVG icon set for the 9 Snow Surface classes (8 SANY codes +
// VC variable fallback). Same design language as components/icons/Icon.tsx
// — 24×24 viewBox, 1.5px stroke, rounded line caps, currentColor.
//
// Each shape is chosen to be visually distinct from every other surface
// at small sizes (h-4 w-4 = 16px in the 3-day strip, h-7 w-7 = 28px in
// the headline bubble). Trade-offs ranked by importance:
//   1. silhouette readable at 16px,
//   2. evokes the physical surface ("looks like" the snow you'd ski),
//   3. consistent stroke weight + corner roundness across the set.
//
// The class taxonomy (SANY) maps to:
//   PP   ornate 6-arm snowflake          — light, fluffy, fresh
//   PPC  snowflake on a packed base      — snow over compacted layer
//   MG   parallel diagonal lines         — corduroy from snowcat grooming
//   LSG  scattered tiny grains           — dry, loose, sugar-like
//   FG   three angular diamond crystals  — refrozen, sharp, packed
//   WS   snowflake with a falling drop   — warm new snow, melting
//   WG   granules above a wavy waterline — corn snow / slush
//   IP   tall ice shard with highlight   — hard, glassy, sketchy
//   VC   circle quartered                — mixed, no single state
//
// Tip: when rendered on the toned bubble (bg-wn-sky / bg-red-600 / etc.
// with text-white), currentColor turns the stroke white automatically.
// On the modal cards (low-contrast container) currentColor follows the
// tone.code class for visibility against pale backgrounds.

import type { SVGProps } from "react";
import type { SurfaceCode } from "@/lib/snowSurface";

type Props = SVGProps<SVGSVGElement> & { code: SurfaceCode };

export default function SurfaceIcon({ code, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable={false}
      {...rest}
    >
      {PATHS[code]}
    </svg>
  );
}

const PATHS: Record<SurfaceCode, React.ReactNode> = {
  // PP — Powder
  // Six-arm snowflake with branched tips. The branches sell the
  // ornate, low-density feel of fresh powder vs the simpler shape we
  // use elsewhere for "snow in general".
  PP: (
    <>
      <path d="M12 3v18" />
      <path d="M3 12h18" />
      <path d="m5.5 5.5 13 13" />
      <path d="m18.5 5.5-13 13" />
      <path d="m9.5 4.5 2.5 1.5 2.5-1.5" />
      <path d="m9.5 19.5 2.5-1.5 2.5 1.5" />
      <path d="m4.5 9.5 1.5 2.5-1.5 2.5" />
      <path d="m19.5 9.5-1.5 2.5 1.5 2.5" />
    </>
  ),

  // PPC — Packed Powder
  // Smaller four-arm snowflake riding on top of a low arch — the arch
  // is the compacted base layer, the flake is the dusting on top.
  PPC: (
    <>
      {/* Packed base — a wide low curve */}
      <path d="M3 19c3-4 6-4 9-4s6 0 9 4" />
      {/* Small flake on top */}
      <path d="M12 4v8" />
      <path d="M8 8h8" />
      <path d="m9 5 6 6" />
      <path d="m15 5-6 6" />
    </>
  ),

  // MG — Machine Groomed
  // Four parallel diagonal lines — corduroy left behind by a snowcat.
  // 45deg slope, tight even spacing reads as "tracks" not "menu".
  MG: (
    <>
      <path d="M3 14 14 3" />
      <path d="M6 17 17 6" />
      <path d="M9 20 20 9" />
      <path d="M12 21 21 12" />
    </>
  ),

  // LSG — Loose Granular
  // Six small grains scattered without obvious order — sugary, dry,
  // loose. Solid dots rather than stroked circles so they read as
  // discrete grains, not bubbles.
  LSG: (
    <>
      <circle cx="7" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="13" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="14" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),

  // FG — Frozen Granular
  // Three angular diamond crystals tessellated. The packing + sharp
  // corners distinguish FG from PPC (which is rounded) and from LSG
  // (which is scattered dots). Reads as "frozen pellets stuck
  // together".
  FG: (
    <>
      <path d="M7 5 10 8 7 11 4 8z" />
      <path d="M14 9 17 12 14 15 11 12z" />
      <path d="M9 15 12 18 9 21 6 18z" />
    </>
  ),

  // WS — Wet Snow
  // Small four-arm snowflake on top, single water drop directly below
  // the centre — the flake is in the middle of becoming a drop. Calls
  // out the warm-snow / heavy-mash feel without spelling "water" too
  // literally.
  WS: (
    <>
      {/* Small snowflake top */}
      <path d="M10 3v8" />
      <path d="M6 7h8" />
      <path d="m7 4 6 6" />
      <path d="m13 4-6 6" />
      {/* Water drop falling from the flake */}
      <path d="M16 13c-2 2.5-2 5 0 6.5 2-1.5 2-4 0-6.5z" />
    </>
  ),

  // WG — Wet Granular
  // Granules clustered above a wavy water line. Five grains above the
  // wave instead of six (LSG) so the eye reads it as a smaller, denser
  // pile sitting in liquid. Wave below is the corn-snow / slush
  // signature.
  WG: (
    <>
      <circle cx="7" cy="9" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="9" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.2" fill="currentColor" stroke="none" />
      <path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </>
  ),

  // IP — Icy
  // A tall elongated diamond — an icicle in silhouette — with a short
  // highlight line on its upper-left face. The single-shape silhouette
  // reads "blade of ice" at any size and pairs naturally with the
  // red tone the surrounding card uses for the danger signal.
  IP: (
    <>
      <path d="M12 3 17 12 12 21 7 12z" />
      <path d="m10 8 1.5-2.5" />
    </>
  ),

  // VC — Variable
  // Circle divided in four — patchy, no single dominant state. Drawn
  // as a circle plus a horizontal and vertical diameter so the four
  // quadrants are obvious without crowding the small viewport.
  VC: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17" />
      <path d="M12 3.5v17" />
    </>
  ),
};
