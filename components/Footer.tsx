// Global footer, rendered by app/layout.tsx as a direct child of <body>
// (app/globals.css hides `body.route-map > footer` on the map route,
// where the map fills the viewport). Server component: plain links, no
// JS.
//
// Replaces the 10-11 px charcoal/40 footer (audit design-system-36) with
// 12 px muted text, the brand mark, and links to every content hub so
// the state / list / guide pages are reachable from anywhere
// (content-seo-13). Link rows are 44 px on phones (the guide's tap
// minimum) and 32 px in the desktop wrap.

import Link from "next/link";
import BrandMark from "@/components/BrandMark";

const LINKS: ReadonlyArray<{ href: string; label: string; strong?: boolean }> = [
  { href: "/early", label: "Founder list", strong: true },
  { href: "/go", label: "Saturday pick" },
  // /near has no index page; the NYC page lists every other origin city.
  { href: "/near/nyc", label: "Resorts near your city" },
  { href: "/guides", label: "Guides" },
  { href: "/lists", label: "Lists" },
  { href: "/trip-templates", label: "Trip ideas" },
  { href: "/deals", label: "Pass deals" },
  { href: "/data-sources", label: "Data sources" },
  { href: "/credits", label: "Photo credits" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "mailto:hello@wynla.app", label: "Contact" },
  { href: "/get", label: "Install" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-wn-line bg-white/60 text-xs text-wn-muted">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-6 sm:px-6">
        <BrandMark variant="mark" size="sm" className="min-h-11 min-w-11 justify-center" />
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                {l.href.startsWith("mailto:") ? (
                  <a href={l.href} className="inline-flex min-h-11 items-center hover:text-wn-navy md:min-h-8">
                    {l.label}
                  </a>
                ) : (
                  <Link href={l.href} className={l.strong ? "inline-flex min-h-11 items-center font-semibold text-wn-navy hover:underline md:min-h-8" : "inline-flex min-h-11 items-center hover:text-wn-navy md:min-h-8"}>
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* FTC affiliate disclosure — required wherever Wynla deep-links
            to a partner that pays commission (Booking.com + Vrbo on the
            resort page). Generic wording so it stays valid if the
            affiliate surface grows. */}
        <p className="max-w-md text-center">
          Wynla may earn a commission from purchases made through partner links, at no extra cost to you.
        </p>
        <p>&copy; {new Date().getFullYear()} Wynla. All rights reserved.</p>
      </div>
    </footer>
  );
}
