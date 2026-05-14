"use client";

// Client island for the digest preferences form. Server-component parent
// loads the initial row + email; this just handles the radio/slider UI
// and POSTs / DELETEs to /api/digest/subscribe.

import { useState, useTransition } from "react";

type Props = {
  initialEnabled: boolean;
  initialFrequency: "daily" | "weekly";
  initialThreshold: number;
  lastSentAt: string | null;
};

export default function DigestPreferencesForm({
  initialEnabled,
  initialFrequency,
  initialThreshold,
  lastSentAt,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [frequency, setFrequency] = useState<"daily" | "weekly">(
    initialFrequency,
  );
  const [threshold, setThreshold] = useState(initialThreshold);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

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
    if (!confirm("Stop sending email digests?")) return;
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

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {enabled ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
          ✓ Digest is on. Last sent:{" "}
          {lastSentAt
            ? new Date(lastSentAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "not yet — first one ships on next scheduled run"}
        </div>
      ) : (
        <div className="rounded-lg border border-wn-charcoal/15 bg-wn-charcoal/[0.03] px-3 py-2 text-xs font-semibold text-wn-charcoal/70">
          Digest is off. Save below to start receiving it.
        </div>
      )}

      {/* Frequency picker */}
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-wn-charcoal/60">
          How often
        </legend>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFrequency("daily")}
            className={[
              "flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition",
              frequency === "daily"
                ? "border-wn-navy bg-wn-navy/5 text-wn-navy"
                : "border-wn-charcoal/15 bg-white text-wn-charcoal/75 hover:border-wn-charcoal/30",
            ].join(" ")}
            aria-pressed={frequency === "daily"}
          >
            <div>Daily</div>
            <div className="mt-0.5 text-[10px] font-normal text-wn-charcoal/55">
              every morning, 13:00 UTC
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFrequency("weekly")}
            className={[
              "flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition",
              frequency === "weekly"
                ? "border-wn-navy bg-wn-navy/5 text-wn-navy"
                : "border-wn-charcoal/15 bg-white text-wn-charcoal/75 hover:border-wn-charcoal/30",
            ].join(" ")}
            aria-pressed={frequency === "weekly"}
          >
            <div>Weekly</div>
            <div className="mt-0.5 text-[10px] font-normal text-wn-charcoal/55">
              Monday mornings only
            </div>
          </button>
        </div>
      </fieldset>

      {/* Threshold slider */}
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-wn-charcoal/60">
          Skip emails unless new snow ≥{" "}
          <span className="text-wn-navy">{threshold}&quot;</span>
        </legend>
        <input
          type="range"
          min={0}
          max={24}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
          className="w-full accent-wn-navy"
          aria-label={`Minimum new snow threshold: ${threshold} inches`}
        />
        <div className="mt-1 flex justify-between text-[10px] text-wn-charcoal/45">
          <span>0&quot; (always)</span>
          <span>12&quot; (powder days)</span>
          <span>24&quot;+</span>
        </div>
        <p className="mt-2 text-[11px] text-wn-charcoal/55">
          Set to 0 to receive every digest. Higher values only email you when
          a favorite resort gets a real dump.
        </p>
      </fieldset>

      {/* Save row */}
      <div className="flex flex-wrap items-center gap-2 border-t border-wn-charcoal/10 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving"}
          className="rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-50"
        >
          {status === "saving"
            ? "Saving…"
            : enabled
              ? "Update preferences"
              : "Turn on digest"}
        </button>
        {enabled && (
          <button
            type="button"
            onClick={unsubscribe}
            disabled={status === "saving"}
            className="rounded-md border border-wn-charcoal/20 px-4 py-2 text-sm font-semibold text-wn-charcoal/70 transition hover:bg-wn-charcoal/5 disabled:opacity-50"
          >
            Unsubscribe
          </button>
        )}
        {status === "saved" && (
          <span className="text-xs font-semibold text-emerald-700">
            ✓ Saved
          </span>
        )}
        {status === "error" && (
          <span className="text-xs font-semibold text-red-700">
            {errorMsg ?? "Error"}
          </span>
        )}
      </div>
    </div>
  );
}
