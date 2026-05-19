// Inaugural Season 2026 — inline-SVG monoline icon set.
//
// Linear / Stripe / Apple aesthetic: 24×24 viewBox, 1.5px stroke,
// rounded line caps + joins. `currentColor` so callers control colour
// with Tailwind text-* classes. Zero dependencies, zero bundle hit —
// every icon is a tiny inline path.
//
// Naming follows the inaugural-overhaul spec callouts: globe, camera,
// map, pin, mountain, snowflake, skier, sun. Each one replaces a
// functional emoji previously used for navigation/utility (NOT brand
// personality — those emoji stay).
//
// Usage:
//   import Icon from "@/components/icons/Icon";
//   <Icon name="map" className="h-4 w-4 text-wn-navy" />

import type { SVGProps } from "react";

export type IconName =
  | "globe"
  | "camera"
  | "map"
  | "pin"
  | "mountain"
  | "snowflake"
  | "skier"
  | "sun"
  | "heart"
  | "trips"
  | "settings"
  | "user"
  | "plane";

type Props = SVGProps<SVGSVGElement> & { name: IconName };

export default function Icon({ name, ...rest }: Props) {
  const path = PATHS[name];
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
      {path}
    </svg>
  );
}

const PATHS: Record<IconName, React.ReactNode> = {
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  map: (
    <>
      <path d="m3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3Z" />
      <path d="M9 4v16" />
      <path d="M15 7v16" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.5-7-12a7 7 0 1 1 14 0c0 5.5-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
  mountain: (
    <>
      <path d="m3 20 6-10 4 6 2-3 6 7Z" />
      <path d="m9 10 1.5-2" />
    </>
  ),
  snowflake: (
    <>
      <path d="M12 2v20" />
      <path d="M2 12h20" />
      <path d="m4.5 4.5 15 15" />
      <path d="m19.5 4.5-15 15" />
      <path d="M9 5l3 2 3-2" />
      <path d="M9 19l3-2 3 2" />
      <path d="m5 9 2 3-2 3" />
      <path d="m19 9-2 3 2 3" />
    </>
  ),
  skier: (
    <>
      <circle cx="13" cy="5" r="1.5" />
      <path d="m4 19 14-5" />
      <path d="m7 11 4 1 3-3" />
      <path d="m11 12 1 4-3 3" />
      <path d="m14 9 4 2-1 3" />
      <path d="M17 19h3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </>
  ),
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
  ),
  trips: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h10" />
      <circle cx="18" cy="17" r="2.5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  plane: (
    <path d="M21 12c0-.7-.4-1.3-1-1.6L14 7V3.5a1.5 1.5 0 0 0-3 0V7L4 10.4c-.6.3-1 .9-1 1.6 0 .7.6 1.2 1.3 1.1L11 12v5l-2.5 1.3c-.3.2-.5.5-.5.9v.3c0 .3.3.5.6.4L12 19l3.4 1c.3.1.6-.1.6-.4v-.3c0-.4-.2-.7-.5-.9L13 17v-5l6.7 1.1c.7.1 1.3-.4 1.3-1.1Z" />
  ),
};
