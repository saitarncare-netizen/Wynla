"use client";

// Phone tab bar: Map / Today / Trips / Account. Fixed to the bottom on
// screens under md, hidden on desktop where the header carries the
// same links. 44 px targets, padded by the home-indicator inset.
//
// Two attributes on <html> tie it to the rest of the app:
//   data-tab-bar="1"   set while the bar is visible; app/globals.css
//                      pads the page (or shrinks the map) by the bar's
//                      height so nothing hides under it.
//   data-sheet-open    set by components/Map/MapPage.tsx while a resort
//                      sheet, planner, search or filter drawer is up;
//                      the bar gets out of the way on the map route.
// Routes that are a flow rather than a place (/login, /auth/*, share
// pages, /get) never show it.

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PREFIXES = ["/login", "/auth/", "/trip/share/", "/get"];

type Tab = { href: string; label: string; icon: string; match: (path: string) => boolean };

const TABS: Tab[] = [
  {
    href: "/",
    label: "Map",
    icon: "🗺️",
    match: (p) => p === "/" || p.startsWith("/resort/") || p.startsWith("/state/") || p === "/compare",
  },
  { href: "/today", label: "Today", icon: "☀️", match: (p) => p === "/today" },
  { href: "/trips", label: "Trips", icon: "🎿", match: (p) => p === "/trips" || p.startsWith("/trip/") },
  {
    href: "/account",
    label: "Account",
    icon: "👤",
    match: (p) => p === "/account" || p.startsWith("/account/") || p === "/favorites",
  },
];

function isHiddenRoute(path: string): boolean {
  return HIDDEN_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`));
}

// The map writes data-sheet-open outside React's tree; the attribute is
// treated as an external store (MutationObserver = subscribe) instead of
// threading sheet state up through the root layout.
function subscribeSheetOpen(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-sheet-open"] });
  return () => observer.disconnect();
}

function readSheetOpen(): boolean {
  return document.documentElement.dataset.sheetOpen === "1";
}

// Server render: no sheet can be open before hydration.
const serverSheetOpen = () => false;

export default function AppTabBar() {
  const pathname = usePathname() ?? "/";
  const sheetOpen = useSyncExternalStore(subscribeSheetOpen, readSheetOpen, serverSheetOpen);

  const hidden = isHiddenRoute(pathname) || (pathname === "/" && sheetOpen);

  // Publish visibility for the CSS padding rule. The layout ships
  // data-tab-bar="1" in the server HTML so the first paint already has
  // room; this only flips it off on hidden routes and while a sheet is up.
  useEffect(() => {
    document.documentElement.dataset.tabBar = hidden ? "0" : "1";
  }, [hidden]);

  if (hidden) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-wn-charcoal/10 bg-white/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex h-14 items-stretch">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition",
                  active ? "text-wn-navy" : "text-wn-charcoal/55 hover:text-wn-navy",
                ].join(" ")}
              >
                <span aria-hidden="true" className={active ? "text-lg" : "text-lg opacity-80 grayscale"}>
                  {tab.icon}
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
