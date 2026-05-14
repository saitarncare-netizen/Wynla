// Tiny client island used by the Pro page's pricing cards. Posts to
// /api/checkout/create-session, then redirects to the Stripe-hosted
// checkout URL. Shows inline error text on failure so the user isn't
// staring at a silent button.

"use client";

import { useState } from "react";

export default function UpgradeCta({
  interval,
  featured,
}: {
  interval: "month" | "year";
  featured: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) {
        setError(j.error ?? `Checkout failed (${r.status})`);
        setLoading(false);
        return;
      }
      // Hard navigate — Stripe Checkout is a different origin.
      window.location.assign(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`block w-full rounded-md px-4 py-2.5 text-center text-sm font-semibold transition disabled:opacity-60 ${
          featured
            ? "bg-wn-navy text-white hover:bg-wn-navy/90"
            : "border border-wn-navy text-wn-navy hover:bg-wn-navy/5"
        }`}
      >
        {loading ? "Loading…" : "Start your subscription"}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
