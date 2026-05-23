"use client";

import { useEffect, useState } from "react";

/**
 * IosInstallBanner — slim coaching banner that nudges iOS Safari users
 * to install Wynla as a PWA via Share → Add to Home Screen.
 *
 * iOS doesn't expose a programmatic `beforeinstallprompt` event the way
 * Android Chrome does, so the only path to install is the OS share
 * sheet. Most users don't discover this on their own; we surface a
 * pill at the bottom of the screen explaining it.
 *
 * Display rules:
 *   - Only on iOS Safari (not Chrome / Firefox / Edge on iOS — those
 *     can't install PWAs on iOS at all, so showing the banner there
 *     would be misleading).
 *   - Hidden once the user is in standalone mode (already installed).
 *   - Hidden forever after dismiss (stored in localStorage).
 *   - Delayed 5s after first render so it doesn't ambush the user.
 */
export default function IosInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosSafariNotInstalled()) return;

    const timer = window.setTimeout(() => setVisible(true), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem("wynla_ios_banner_dismissed", "true");
    } catch {
      // Private mode / storage disabled — banner won't persist but
      // it'll vanish for this session, which is good enough.
    }
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Install Wynla on your home screen"
      className="pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-3"
      style={{
        // Sit just above the iOS home indicator / safe-area inset.
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
      }}
    >
      <div
        className="pointer-events-auto flex w-full max-w-[480px] items-center gap-3 rounded-full bg-wn-navy px-4 py-2.5 text-white shadow-lg shadow-black/25 ring-1 ring-white/10"
      >
        {/* Share-up icon — simple inline SVG so we don't pull in a
            new icon dep just for this. */}
        <span
          aria-hidden="true"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-white/10"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M12 16V4" />
            <path d="m7 9 5-5 5 5" />
            <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
          </svg>
        </span>

        <p className="flex-1 text-[12.5px] leading-tight">
          Install Wynla on your home screen — tap{" "}
          <span className="font-semibold">Share</span> then{" "}
          <span className="font-semibold">Add to Home Screen</span>
        </p>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-wn-gold"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.25}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * Detect iOS Safari that hasn't been installed as a PWA yet.
 *
 * Chrome / Firefox / Edge on iOS all use WebKit under the hood but
 * don't expose `navigator.standalone` and can't install PWAs — we
 * sniff their user agents so we don't mislead those users.
 */
function isIosSafariNotInstalled(): boolean {
  if (typeof window === "undefined") return false;

  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (!isIos) return false;

  const isStandalone =
    (window.navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
  if (isStandalone) return false;

  // Real Safari on iOS — exclude Chrome (CriOS), Firefox (FxiOS), Edge
  // (EdgiOS). All three lack the install path entirely on iOS.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  if (!isSafari) return false;

  try {
    if (localStorage.getItem("wynla_ios_banner_dismissed") === "true") {
      return false;
    }
  } catch {
    // Storage blocked — proceed; banner won't persist dismiss but
    // showing it once is fine.
  }

  return true;
}
