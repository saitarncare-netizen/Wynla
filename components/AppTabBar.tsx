"use client";

// Phone tab bar: Map / Today / Trips / Account. Fixed to the bottom on
// screens under md, hidden on desktop where the AppShell top bar carries
// the same links. 44 px targets, padded by the home-indicator inset.
// The items, their icons and the active-route rules come from lib/nav.ts
// so this bar and the top bar can never disagree.
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
import Icon from "@/components/icons/Icon";
import { isFlowRoute, TAB_ITEMS } from "@/lib/nav";

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

  const hidden = isFlowRoute(pathname) || (pathname === "/" && sheetOpen);

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
      className="fixed inset-x-0 bottom-0 z-50 border-t border-wn-line bg-white/95 backdrop-blur-sm md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex h-14 items-stretch">
        {TAB_ITEMS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 text-eyebrow font-semibold transition-colors",
                  active ? "text-wn-navy" : "text-wn-muted hover:text-wn-navy",
                ].join(" ")}
              >
                <Icon name={tab.icon} className={active ? "h-6 w-6" : "h-6 w-6 opacity-80"} strokeWidth={active ? 2 : 1.5} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
