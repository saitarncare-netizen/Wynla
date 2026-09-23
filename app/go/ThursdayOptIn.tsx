"use client";

// "Email me this every Thursday". Signed-in users save their city + pass
// to profiles and enable the digest through /api/go/subscribe; visitors
// get a sign-in link that brings them back to this exact view. When the
// pass column has not been migrated yet the API answers coming_soon and
// the card says so instead of pretending.

import Link from "next/link";
import { useState } from "react";
import type { GoState } from "@/lib/saturday/url";

type Props = {
  signedIn: boolean;
  /** Already opted in with a pass product and an enabled digest row. */
  optedIn: boolean;
  state: GoState;
  /** The path to come back to after sign-in. */
  returnPath: string;
  /** "Ikon Base Pass from NYC" for the confirmation copy. */
  summary: string;
};

export default function ThursdayOptIn({ signedIn, optedIn, state, returnPath, summary }: Props) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "coming_soon" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const needsCity = state.city === "geo";
  // Someone already on the list can re-save to switch city or pass; the
  // label says so instead of pretending the button is new.
  const onList = optedIn || status === "saved";

  async function subscribe() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/go/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: state.city, pass: state.pass ?? "any", product: state.product }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; reason?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setStatus(j.ok ? "saved" : j.reason === "coming_soon" ? "coming_soon" : "error");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-wn-navy">Get this every Thursday</h2>
      <p className="mt-1 text-sm text-wn-charcoal/70">
        The same three picks for {summary}, in your inbox Thursday morning, in time to plan.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!signedIn ? (
          <Link
            href={`/login?next=${encodeURIComponent(returnPath)}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-wn-navy px-4 text-sm font-semibold text-white hover:bg-wn-navy/90"
          >
            Sign in to get the email
          </Link>
        ) : needsCity ? (
          <p className="text-sm text-wn-charcoal/70">Pick a city above to get the email (a location cannot be saved).</p>
        ) : (
          <button
            type="button"
            onClick={subscribe}
            disabled={status === "saving"}
            className="inline-flex min-h-11 items-center rounded-lg bg-wn-navy px-4 text-sm font-semibold text-white hover:bg-wn-navy/90 disabled:opacity-60"
          >
            {status === "saving"
              ? "Saving…"
              : onList
                ? "Update to this city and pass"
                : "Email me this every Thursday"}
          </button>
        )}
        {status === "saved" && (
          <span className="text-xs font-semibold text-emerald-700">Saved: {summary}, every Thursday.</span>
        )}
        {status === "idle" && signedIn && optedIn && !needsCity && (
          <span className="text-xs text-wn-charcoal/60">
            You are on the list.{" "}
            <Link href="/account/digest" className="underline">
              Email settings
            </Link>
          </span>
        )}
        {status === "coming_soon" && (
          <span className="text-xs text-amber-800">
            Your city is saved. The Thursday email is not switched on yet; it starts once the pass setting goes live.
          </span>
        )}
        {status === "error" && <span className="text-xs text-red-700">{error ?? "Could not save"}</span>}
      </div>
    </section>
  );
}
