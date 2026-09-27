"use client";

// "Email me this every Thursday". Signed-in users save their city + pass
// to profiles through /api/go/subscribe; visitors get a sign-in link that
// brings them back to this exact view. The Thursday list is its own
// consent (profiles.pass_product), separate from the weekly favorites
// digest, and the card says so. When the pass column has not been
// migrated yet the API answers coming_soon and the card says so instead
// of pretending.

import Link from "next/link";
import { useState } from "react";
import type { GoState } from "@/lib/saturday/url";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type Props = {
  signedIn: boolean;
  /** Already on the Thursday list (pass_product set). */
  optedIn: boolean;
  state: GoState;
  /** The path to come back to after sign-in. */
  returnPath: string;
  /** "Ikon Base Pass from NYC" for the confirmation copy. */
  summary: string;
};

type Status = "idle" | "saving" | "saved" | "stopped" | "coming_soon" | "error";

export default function ThursdayOptIn({ signedIn, optedIn, state, returnPath, summary }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const needsCity = state.city === "geo";
  // Someone already on the list can re-save to switch city or pass; the
  // label says so instead of pretending the button is new.
  const onList = (optedIn && status !== "stopped") || status === "saved";

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

  async function stop() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/go/subscribe", { method: "DELETE" });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
      setStatus("stopped");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not stop the email");
    }
  }

  return (
    <Card>
      <h2 className="text-base font-bold text-wn-navy">Get this every Thursday</h2>
      <p className="mt-1 text-sm text-wn-muted">
        The same three picks for {summary}, in your inbox Thursday morning, in time to plan. One email a week, with
        its own unsubscribe link; it is separate from the{" "}
        <Link href="/account/digest" className="underline">
          weekly snow digest
        </Link>{" "}
        for your favorites.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!signedIn ? (
          <Button href={`/login?next=${encodeURIComponent(returnPath)}`}>Sign in to get the email</Button>
        ) : needsCity ? (
          <p className="text-sm text-wn-muted">Pick a city above to get the email (a location cannot be saved).</p>
        ) : (
          <>
            <Button onClick={subscribe} disabled={status === "saving"}>
              {status === "saving" ? "Saving…" : onList ? "Update to this city and pass" : "Email me this every Thursday"}
            </Button>
            {onList && (
              <Button variant="secondary" onClick={stop} disabled={status === "saving"}>
                Stop the Thursday email
              </Button>
            )}
          </>
        )}
        {status === "saved" && (
          <span className="text-xs font-semibold text-wn-success">Saved: {summary}, every Thursday.</span>
        )}
        {status === "stopped" && <span className="text-xs text-wn-muted">Stopped. No more Thursday emails.</span>}
        {status === "idle" && signedIn && optedIn && !needsCity && (
          <span className="text-xs text-wn-muted">You are on the list.</span>
        )}
        {status === "coming_soon" && (
          <span className="text-xs text-wn-warning">
            Your city is saved. The Thursday email is not switched on yet; it starts once the pass setting goes live.
          </span>
        )}
        {status === "error" && <span className="text-xs text-wn-danger">{error ?? "Could not save"}</span>}
      </div>
    </Card>
  );
}
