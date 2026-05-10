"use client";

import { useState } from "react";

type Props = {
  isUsingGeo: boolean;
  onUseMyLocation: (lat: number, lng: number) => void;
};

type ErrorState =
  | null
  | { kind: "denied" }
  | { kind: "unavailable" }
  | { kind: "no-support" };

// Detect iOS Safari so we can show the right help text — desktop
// browsers and Android Chrome all have different remediation paths.
function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

// Floating "use my location" pill. Replaces the Stage 19 GeoBanner —
// always visible, mobile-discoverable, and handles the iOS permission
// prompt directly. Sits at bottom-right of the map; on desktop it
// stacks above the pass-color legend (which is hidden on mobile).
export default function LocationButton({ isUsingGeo, onUseMyLocation }: Props) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  // When permission is denied iOS won't re-prompt — we open a help
  // modal explaining how to clear the cached denial in iOS Settings.
  const [helpOpen, setHelpOpen] = useState(false);

  function requestLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError({ kind: "no-support" });
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
        if (err.code === err.PERMISSION_DENIED) {
          setError({ kind: "denied" });
          // Auto-open the help modal so the user immediately sees
          // the iOS Settings path. Otherwise they'd hit the error,
          // tap the button again, get the same denied result, and
          // wonder why nothing changed.
          setHelpOpen(true);
        } else {
          setError({ kind: "unavailable" });
        }
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
      {error && !helpOpen && (
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="pointer-events-auto rounded-md border border-red-200 bg-white/95 px-2 py-1 text-[10px] font-semibold text-red-700 shadow hover:bg-red-50"
        >
          {error.kind === "denied" && "Permission blocked — how to fix"}
          {error.kind === "unavailable" && "Couldn't get location — tap to retry"}
          {error.kind === "no-support" && "Browser doesn't support location"}
        </button>
      )}

      {/* Help modal — explains the iOS Settings path. Renders as a
          centered card with a backdrop. Only iOS-specific copy varies;
          desktop users get a generic "site permissions" hint. */}
      {helpOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-[80] flex items-center justify-center px-4"
          role="dialog"
          aria-label="Location permission help"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setHelpOpen(false)}
            className="absolute inset-0 cursor-default bg-wn-charcoal/40 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-wn-charcoal/10 bg-white p-5 shadow-2xl">
            <h3 className="mb-1 text-base font-bold text-wn-navy">
              Location is blocked
            </h3>
            <p className="mb-3 text-[12px] leading-relaxed text-wn-charcoal/75">
              Safari remembered an earlier &ldquo;Don&rsquo;t Allow&rdquo;. iOS won&rsquo;t
              ask again until you reset it.
            </p>
            {isIosSafari() ? (
              <ol className="mb-4 space-y-1.5 text-[12px] text-wn-charcoal">
                <li className="flex gap-2">
                  <span className="font-bold text-wn-navy">1.</span>
                  <span>Open the iOS <strong>Settings</strong> app</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-wn-navy">2.</span>
                  <span>
                    Tap <strong>Apps</strong> → <strong>Safari</strong> →
                    <strong> Location</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-wn-navy">3.</span>
                  <span>
                    Set to <strong>Ask</strong> (or <strong>Allow</strong>)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-wn-navy">4.</span>
                  <span>Refresh this page and tap 📍 again</span>
                </li>
              </ol>
            ) : (
              <ol className="mb-4 space-y-1.5 text-[12px] text-wn-charcoal">
                <li className="flex gap-2">
                  <span className="font-bold text-wn-navy">1.</span>
                  <span>Click the lock / info icon in the address bar</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-wn-navy">2.</span>
                  <span>
                    Find <strong>Location</strong> → set to <strong>Allow</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-wn-navy">3.</span>
                  <span>Refresh and tap 📍 again</span>
                </li>
              </ol>
            )}
            <p className="mb-4 text-[11px] leading-relaxed text-wn-charcoal/55">
              Or pick a city / ZIP from the <strong>From</strong> dropdown for
              now — drive times will use that origin instead.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(false);
                  setError(null);
                }}
                className="rounded-md border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal transition hover:border-wn-charcoal/40"
              >
                Got it
              </button>
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(false);
                  requestLocation();
                }}
                className="rounded-md bg-wn-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
