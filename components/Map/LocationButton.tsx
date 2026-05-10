"use client";

import { useState } from "react";

type Props = {
  isUsingGeo: boolean;
  onUseMyLocation: (lat: number, lng: number) => void;
};

// Floating "use my location" pill. Replaces the Stage 19 GeoBanner —
// always visible, mobile-discoverable, and handles the iOS permission
// prompt directly. Sits at bottom-right of the map; on desktop it
// stacks above the pass-color legend (which is hidden on mobile).
export default function LocationButton({ isUsingGeo, onUseMyLocation }: Props) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Browser doesn't support location");
      return;
    }
    setRequesting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onUseMyLocation(pos.coords.latitude, pos.coords.longitude);
        setRequesting(false);
      },
      (err) => {
        setRequesting(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Permission denied — try again"
            : "Couldn't get your location",
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  const label = requesting
    ? "Locating…"
    : isUsingGeo
      ? "Using your location"
      : "Use my location";

  return (
    <div
      className="pointer-events-none absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1 sm:bottom-4 sm:right-4 md:bottom-24"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <style>{`
        @keyframes wynla-locpulse {
          0%, 100% { box-shadow: 0 4px 12px rgba(15,21,48,0.15); }
          50% { box-shadow: 0 0 0 6px rgba(212,168,75,0.22), 0 4px 12px rgba(15,21,48,0.15); }
        }
        .wynla-locpulse { animation: wynla-locpulse 2.4s ease-in-out infinite; }
      `}</style>
      <button
        type="button"
        onClick={requestLocation}
        disabled={requesting}
        aria-label={label}
        title={label}
        className={[
          "pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-sm transition active:scale-95 disabled:opacity-70",
          isUsingGeo
            ? "border border-wn-gold/60 bg-white/95 text-wn-navy"
            : "border border-wn-charcoal/15 bg-white/95 text-wn-charcoal hover:border-wn-navy hover:text-wn-navy",
          !isUsingGeo && !requesting ? "wynla-locpulse" : "",
        ].join(" ")}
      >
        <span aria-hidden="true">📍</span>
        <span>{label}</span>
      </button>
      {error && (
        <span
          role="alert"
          className="pointer-events-auto rounded-md border border-red-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-red-700 shadow"
        >
          {error}
        </span>
      )}
    </div>
  );
}
