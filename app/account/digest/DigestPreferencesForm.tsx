"use client";

// Client island for the digest preferences form. The server-component
// parent loads the current row; this handles the cadence / threshold UI
// and POSTs / DELETEs to /api/digest/subscribe.

import { useEffect, useRef, useState, useTransition } from "react";
import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";

type Props = {
  initialEnabled: boolean;
  initialFrequency: "daily" | "weekly";
  initialThreshold: number;
  lastSentAt: string | null;
  /** Arrived from an email's "unsubscribe" link: scroll to and focus the
   *  unsubscribe button so the intent is one click away, never automatic. */
  highlightUnsubscribe?: boolean;
};

function formatLastSent(iso: string | null): string {
  if (!iso) return "not yet; the first one goes out on the next scheduled run";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DigestPreferencesForm({
  initialEnabled,
  initialFrequency,
  initialThreshold,
  lastSentAt,
  highlightUnsubscribe = false,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [frequency, setFrequency] = useState<"daily" | "weekly">(initialFrequency);
  const [threshold, setThreshold] = useState(initialThreshold);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const unsubscribeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (highlightUnsubscribe && unsubscribeRef.current) {
      unsubscribeRef.current.scrollIntoView({ block: "center" });
      unsubscribeRef.current.focus();
    }
  }, [highlightUnsubscribe]);

  async function save() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency, threshold_in: threshold }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => {
        setEnabled(true);
        setStatus("saved");
      });
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function unsubscribe() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/digest/subscribe", { method: "DELETE" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      startTransition(() => {
        setEnabled(false);
        setStatus("saved");
      });
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Unsubscribe failed");
    }
  }

  const thresholdSummary =
    threshold === 0
      ? "Every digest, even with no new snow at open resorts."
      : `Only when a favorite reports ${threshold} in or more of new snow (${frequency === "weekly" ? "over the week" : "in 24 h"}).`;

  return (
    <div className="space-y-6">
      {enabled ? (
        <Notice tone="success">
          Digest is on. Last sent: {formatLastSent(lastSentAt)}.
          {highlightUnsubscribe && (
            <span className="mt-1 block font-normal">
              To stop the emails, use the Unsubscribe button below.
            </span>
          )}
        </Notice>
      ) : (
        <div className="rounded-wn-sm border border-wn-line bg-wn-offwhite px-3 py-2 text-xs font-semibold text-wn-muted">
          Digest is off. Save below to start receiving it.
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-eyebrow font-bold uppercase text-wn-muted">
          How often
        </legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFrequency("daily")}
            className={[
              "flex-1 rounded-wn-sm border-2 px-3 py-2.5 text-sm font-semibold transition",
              frequency === "daily"
                ? "border-wn-navy bg-wn-navy/5 text-wn-navy"
                : "border-wn-line bg-white text-wn-charcoal hover:border-wn-subtle",
            ].join(" ")}
            aria-pressed={frequency === "daily"}
          >
            <div>Daily</div>
            <div className="mt-0.5 text-xs font-normal text-wn-muted">
              every morning around 8 AM Eastern
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFrequency("weekly")}
            className={[
              "flex-1 rounded-wn-sm border-2 px-3 py-2.5 text-sm font-semibold transition",
              frequency === "weekly"
                ? "border-wn-navy bg-wn-navy/5 text-wn-navy"
                : "border-wn-line bg-white text-wn-charcoal hover:border-wn-subtle",
            ].join(" ")}
            aria-pressed={frequency === "weekly"}
          >
            <div>Weekly</div>
            <div className="mt-0.5 text-xs font-normal text-wn-muted">
              Monday mornings only
            </div>
          </button>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-eyebrow font-bold uppercase text-wn-muted">
          Skip emails unless new snow is at least{" "}
          <span className="text-wn-navy">{threshold} in</span>
        </legend>
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
          className="min-h-11 w-full accent-wn-navy"
          aria-label={`Minimum new snow threshold: ${threshold} inches`}
        />
        <div className="mt-1 flex justify-between text-xs text-wn-muted">
          <span>0 in (always)</span>
          <span>12 in (powder days)</span>
          <span>24 in</span>
        </div>
        <p className="mt-2 text-xs text-wn-muted">{thresholdSummary}</p>
        <p className="mt-1 text-xs text-wn-muted">
          Off-season, when none of your favorites is open, no digest is sent at any setting.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 border-t border-wn-line pt-4">
        <Button onClick={save} disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : enabled ? "Update preferences" : "Turn on digest"}
        </Button>
        {enabled && (
          <button
            ref={unsubscribeRef}
            type="button"
            onClick={unsubscribe}
            disabled={status === "saving"}
            className={[
              // Not <Button>: it needs a ref for the focus-on-arrival above.
              "inline-flex min-h-11 items-center rounded-wn-sm border px-4 text-sm font-semibold transition disabled:opacity-50",
              highlightUnsubscribe
                ? "border-wn-navy text-wn-navy ring-2 ring-wn-navy/25 hover:bg-wn-navy/5"
                : "border-wn-line bg-white text-wn-muted hover:border-wn-navy hover:text-wn-navy",
            ].join(" ")}
          >
            Unsubscribe
          </button>
        )}
        {status === "saved" && (
          <span role="status" className="text-xs font-semibold text-wn-success">
            Saved
          </span>
        )}
        {status === "error" && (
          <span role="alert" className="text-xs font-semibold text-wn-danger">
            {errorMsg ?? "Error"}
          </span>
        )}
      </div>
    </div>
  );
}
