"use client";

import { useEffect, useSyncExternalStore } from "react";

// Retry button + auto-retry. The page the user actually wanted is not
// known here (the service worker swapped it for /offline), so "Try again"
// goes back in history when there is somewhere to go and reloads
// otherwise; the `online` event does the same without a tap.
const LINKS: Array<{ href: string; label: string }> = [
  { href: "/", label: "Map" },
  { href: "/favorites", label: "Favorites" },
  { href: "/trips", label: "My trips" },
];

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

function retry() {
  if (window.history.length > 1) window.history.back();
  else window.location.reload();
}

export default function OfflineActions() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => {
    if (!online) return;
    // Give the radio a beat to settle before retrying; a reload fired the
    // same instant `online` flips often still fails.
    const t = window.setTimeout(retry, 800);
    return () => window.clearTimeout(t);
  }, [online]);

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={retry}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-wn-gold px-5 text-sm font-semibold text-wn-navy shadow-sm transition hover:bg-wn-gold/90"
      >
        Try again
      </button>
      <p className="mt-2 text-xs text-white/55" role="status">
        {online ? "Connection detected. Retrying…" : "No connection right now."}
      </p>

      <p className="mt-8 text-[11px] font-bold uppercase tracking-wider text-white/50">
        Once you are back online
      </p>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {LINKS.map((l) => (
          <li key={l.href}>
            {/* Plain anchors on purpose: a client-side router transition
                would fail silently offline, a full navigation goes back
                through the service worker and lands here again if the
                network is still down. */}
            <a
              href={l.href}
              className="inline-flex h-9 items-center rounded-full border border-white/20 px-4 text-xs font-semibold text-white/85 transition hover:border-white/50 hover:text-white"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
