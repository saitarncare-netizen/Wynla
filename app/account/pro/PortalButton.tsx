// Single button that hits /api/checkout/portal and redirects the user
// to the Stripe Customer Portal. Cancellation / payment-method
// updates / plan changes all happen there — we don't reimplement
// them.

"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

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
      <Button onClick={onClick} disabled={loading}>
        {loading ? "Opening…" : "Manage payment method"}
      </Button>
      {error && (
        <p className="text-xs text-wn-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
