// Site navigation model shared by the AppShell top bar (desktop link
// row + phone compact bar) and the phone AppTabBar, so a route is
// "active" in exactly one place on both. Pure functions; unit tested in
// lib/nav.test.ts.

import type { IconName } from "@/components/icons/Icon";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Which pathnames light this item up. */
  match: (pathname: string) => boolean;
  /** Show in the phone tab bar (at most five). */
  tab: boolean;
};

const startsWithSeg = (p: string, prefix: string) => p === prefix || p.startsWith(`${prefix}/`);

// Order = visual order in both bars.
export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: "/",
    label: "Map",
    icon: "map",
    // /near/<city> is a drive-sorted resort directory, the same kind of
    // place as /state/<code>, so it lights the Map item too.
    match: (p) => p === "/" || startsWithSeg(p, "/resort") || startsWithSeg(p, "/state") || startsWithSeg(p, "/near") || p === "/compare",
    tab: true,
  },
  {
    href: "/today",
    label: "Today",
    icon: "sun",
    match: (p) => p === "/today",
    tab: true,
  },
  {
    href: "/go",
    label: "Saturday",
    icon: "compass",
    match: (p) => p === "/go",
    tab: false,
  },
  {
    href: "/guides",
    label: "Guides",
    icon: "book",
    match: (p) => startsWithSeg(p, "/guides") || startsWithSeg(p, "/lists") || startsWithSeg(p, "/trip-templates") || p === "/deals",
    tab: false,
  },
  {
    href: "/trips",
    label: "Trips",
    icon: "trips",
    match: (p) => p === "/trips" || startsWithSeg(p, "/trip"),
    tab: true,
  },
  {
    href: "/account",
    label: "Account",
    icon: "user",
    match: (p) => startsWithSeg(p, "/account") || p === "/favorites",
    tab: true,
  },
];

export const TAB_ITEMS = NAV_ITEMS.filter((i) => i.tab);

/** Routes that are a flow, not a place: no tab bar, no shell links. */
const FLOW_PREFIXES = ["/login", "/auth", "/trip/share", "/get"];

export function isFlowRoute(pathname: string): boolean {
  return FLOW_PREFIXES.some((prefix) => startsWithSeg(pathname, prefix));
}

/** The map is the only route without the AppShell top bar. */
export function isMapRoute(pathname: string): boolean {
  return pathname === "/";
}

export type BackLink = { href: string; label: string };

/**
 * Where the shell's back link points. Nested pages go to their index;
 * everything else goes to the map. The list is explicit rather than
 * "strip the last segment" so /resort/x and /state/co go to the map, not
 * to a /resort or /state index that does not exist.
 */
export function backLinkFor(pathname: string): BackLink {
  if (pathname.startsWith("/guides/")) return { href: "/guides", label: "Guides" };
  if (pathname.startsWith("/lists/")) return { href: "/lists", label: "Lists" };
  if (pathname.startsWith("/trip-templates/")) return { href: "/trip-templates", label: "Trip ideas" };
  if (pathname.startsWith("/trip/") && !pathname.startsWith("/trip/share")) return { href: "/trips", label: "Trips" };
  if (pathname.startsWith("/account/")) return { href: "/account", label: "Account" };
  // Resort pages hand the slug back as ?recent=<slug> so the map rings the
  // pin the user just looked at (Saitarn 2026-05-23: the highlight must
  // survive leaving the resort page).
  const resort = pathname.match(/^\/resort\/([^/?#]+)/);
  if (resort) return { href: `/?recent=${encodeURIComponent(decodeURIComponent(resort[1]))}`, label: "Map" };
  return { href: "/", label: "Map" };
}

/** The item that should read as active, if any. */
export function activeNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((i) => i.match(pathname));
}
