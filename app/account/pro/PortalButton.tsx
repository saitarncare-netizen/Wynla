// Single button that hits /api/checkout/portal and redirects the user
// to the Stripe Customer Portal. Cancellation / payment-method
// updates / plan changes all happen there — we don't reimplement
// them.

"use client";

import { useState } from "react";

export default function PortalButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/checkout/portal", { method: "POST" });
      const j = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !j.url) {
        setError(j.error ?? `Portal unavailable (${r.status})`);
        setLoading(false);
        return;
      }
      window.location.assign(j.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
      >
        {loading ? "Opening…" : "Manage payment method"}
      </button>
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
