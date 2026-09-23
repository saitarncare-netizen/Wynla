// /offline — served by public/sw.js when a navigation fails with no
// network. It is precached at service-worker install time, so it must
// stay static: no auth, no data fetching, no per-request rendering.

import type { Metadata } from "next";
import OfflineActions from "./OfflineActions";

export const metadata: Metadata = {
  title: "You're offline",
  description: "Wynla needs a connection to load the map and forecasts.",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-wn-navy px-6 py-12 text-center text-white">
      <div className="w-full max-w-sm">
        <div aria-hidden="true" className="text-5xl">
          🏔️
        </div>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">You&rsquo;re offline</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/75">
          Wynla needs a connection to load the map, forecasts, and your saved trips. It will pick
          up where you left off as soon as you are back online.
        </p>
        <OfflineActions />
      </div>
    </main>
  );
}
