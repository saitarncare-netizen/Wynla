// Wynla inline-SVG monoline icon set.
//
// Linear / Stripe / Apple aesthetic: 24×24 viewBox, 1.5px stroke,
// rounded line caps + joins. `currentColor` so callers control colour
// with Tailwind text-* classes. Zero dependencies, zero bundle hit —
// every icon is a tiny inline path, and only the glyph you render is
// serialised.
//
// This is the ONLY icon language for chrome (navigation, buttons, status,
// utility). Emoji stay for editorial personality inside copy — never as
// a button glyph, a tab icon or a status dot (audit design-system-12/13/
// 15/16/17, a11y-18). Names are Lucide-compatible where a Lucide glyph
// exists, so a future swap to a full library is a rename, not a redraw.
//
// Usage:
//   import Icon from "@/components/icons/Icon";
//   <Icon name="map" className="h-4 w-4 text-wn-navy" />
//
// Decorative by default (aria-hidden). For an icon that IS the label,
// pass `title` and the svg gets role="img" + aria-label instead.

import type { SVGProps } from "react";

export type IconName =
  // Brand / domain
  | "globe"
  | "camera"
  | "map"
  | "pin"
  | "mountain"
  | "snowflake"
  | "skier"
  | "sun"
  | "cloud"
  | "snow-cloud"
  | "wind"
  | "thermometer"
  | "plane"
  | "car"
  | "ticket"
  | "book"
  | "list"
  | "star"
  | "heart"
  | "trips"
  | "compass"
  | "sparkle"
  // Chrome / utility
  | "user"
  | "settings"
  | "search"
  | "filter"
  | "bell"
  | "calendar"
  | "clock"
  | "share"
  | "download"
  | "external"
  | "menu"
  | "close"
  | "check"
  | "alert"
  | "info"
  | "arrow-left"
  | "arrow-right"
  | "chevron-down"
  | "chevron-right"
  | "spinner";

type Props = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: IconName;
  /** Accessible name when the icon carries meaning on its own. */
  title?: string;
};

export default function Icon({ name, title, ...rest }: Props) {
  const path = PATHS[name];
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable={false}
      {...a11y}
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
  cloud: <path d="M17.5 19a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.3 8.5 4.5 4.5 0 0 0 7 17.5Z" />,
  "snow-cloud": (
    <>
      <path d="M17.5 16a4.5 4.5 0 0 0 .5-8.97A6 6 0 0 0 6.3 5.5 4.5 4.5 0 0 0 7 14.5" />
      <path d="M8 17v.01" />
      <path d="M12 17v.01" />
      <path d="M16 17v.01" />
      <path d="M10 21v.01" />
      <path d="M14 21v.01" />
    </>
  ),
  wind: (
    <>
      <path d="M3 8h11a3 3 0 1 0-3-3" />
      <path d="M3 12h15a3 3 0 1 1-3 3" />
      <path d="M3 16h7a2 2 0 1 1-2 2" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0Z" />
      <path d="M12 10v6" />
    </>
  ),
  plane: (
    <path d="M21 12c0-.7-.4-1.3-1-1.6L14 7V3.5a1.5 1.5 0 0 0-3 0V7L4 10.4c-.6.3-1 .9-1 1.6 0 .7.6 1.2 1.3 1.1L11 12v5l-2.5 1.3c-.3.2-.5.5-.5.9v.3c0 .3.3.5.6.4L12 19l3.4 1c.3.1.6-.1.6-.4v-.3c0-.4-.2-.7-.5-.9L13 17v-5l6.7 1.1c.7.1 1.3-.4 1.3-1.1Z" />
  ),
  car: (
    <>
      <path d="M5 17h14" />
      <path d="M3 13l2-5.5A2 2 0 0 1 6.9 6h10.2a2 2 0 0 1 1.9 1.5L21 13v5a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H6v1a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
      <path d="M7 13h.01" />
      <path d="M17 13h.01" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6Z" />
      <path d="M13 6v12" strokeDasharray="2 2" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />,
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
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5Z" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8.5V19l-4 2v-7.5Z" />,
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  share: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M5 20h14" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <path d="M12 3 2.5 19.5h19Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5v.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8v.01" />
    </>
  ),
  "arrow-left": (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  spinner: (
    <>
      <circle cx="12" cy="12" r="9" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </>
  ),
};
