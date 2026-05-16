// Stage 34 — Resumes a Stripe checkout flow that was interrupted by a
// sign-in detour. The /pro page sends signed-out users to
// /login?next=/pro?autostart=<interval>; once auth lands them back on
// /pro, this client island fires the checkout POST automatically so the
// user doesn't have to click "Start your subscription" a second time.
//
// Safety: parent only renders us when (signed-in && !isPro &&
// stripeConfigured && autostart param valid), so we don't need to
// re-check those here. We do show a small status pill so the user knows
// something is happening before the Stripe redirect.

"use client";

import { useEffect, useState } from "react";

export default function AutoStartCheckout({
  interval,
}: {
  interval: "month" | "year";
}) {
  const [status, setStatus] = useState<"starting" | "error">("starting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/checkout/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interval }),
        });
        const j = (await r.json()) as { url?: string; error?: string };
        if (cancelled) return;
        if (!r.ok || !j.url) {
          setError(j.error ?? `Checkout failed (${r.status})`);
          setStatus("error");
          return;
        }
        window.location.assign(j.url);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Network error");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [interval]);

  if (status === "error") {
    return (
      <div
        role="alert"
        className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
      >
        Couldn&apos;t resume checkout: {error}. Pick a plan below to try again.
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-lg border border-wn-sky/30 bg-wn-sky/10 px-3 py-2 text-sm text-wn-navy">
      Resuming your checkout…
    </div>
  );
}
