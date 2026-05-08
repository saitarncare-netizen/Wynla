"use client";

import { useState } from "react";

const SEEN_KEY = "wynla:geo-banner-seen";

type Props = {
  currentFromCode: string;
  onUseMyLocation: (lat: number, lng: number) => void;
};

// First-visit nudge that lets users opt into device location for accurate
// drive times. Self-dismisses once the user dismisses it OR successfully
// shares location OR the URL already has from=geo.
export default function GeoBanner({ currentFromCode, onUseMyLocation }: Props) {
  // Lazy initializer reads localStorage once on client mount; on SSR we
  // default to "seen=true" so the banner doesn't flash before hydration.
  const [seen, setSeen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(SEEN_KEY) !== null;
  });
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SEEN_KEY, "1");
    }
    setSeen(true);
  }

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Your browser doesn't support location.");
      return;
    }
    setRequesting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUseMyLocation(pos.coords.latitude, pos.coords.longitude);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(SEEN_KEY, "1");
        }
        setRequesting(false);
        setSeen(true);
      },
      (err) => {
        setRequesting(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permission denied. We'll use NYC as the starting point — change it anytime in From."
            : "Couldn't get your location. We'll use NYC for now.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  if (seen || currentFromCode === "geo") return null;

  return (
    <div
      role="dialog"
      aria-label="Use your location"
      className="fixed inset-x-0 bottom-0 z-50 px-3 pb-3 sm:bottom-auto sm:top-4 sm:left-1/2 sm:-translate-x-1/2 sm:px-0"
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-xl border border-wn-charcoal/10 bg-white/95 p-3 shadow-lg backdrop-blur sm:items-center">
        <div className="text-2xl leading-none" aria-hidden="true">📍</div>
        <div className="flex-1 text-xs text-wn-charcoal">
          <p className="font-semibold text-wn-navy">Show drive times from where you are?</p>
          <p className="mt-0.5 text-wn-charcoal/70">
            We&apos;ll estimate driving distance to every resort. Default is NYC.
          </p>
          {error && (
            <p className="mt-1 text-[11px] text-wn-charcoal/60">{error}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
          <button
            type="button"
            onClick={requestLocation}
            disabled={requesting}
            className="rounded-md bg-wn-navy px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
          >
            {requesting ? "Locating…" : "Use my location"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-md border border-wn-charcoal/15 bg-white px-3 py-1.5 text-[11px] font-semibold text-wn-charcoal transition hover:border-wn-charcoal/30"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
