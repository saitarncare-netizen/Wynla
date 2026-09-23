"use client";

// Client island for the profile form. Saves display_name + preferred_origin
// via POST /api/account/profile. The preferred_origin picker uses the same
// city codes as the map's "from" picker (lib/origins ORIGINS), which is
// the column's domain.
//
// A saved default is also mirrored to this device's stored origin so the
// map picks it up on the next visit without a profile round-trip. Before
// this the setting was written and never read (audit account-social-2 /
// fresh-eyes-power-13).

import { useState, useTransition } from "react";
import { originOptionLabel, originsForPicker } from "@/lib/origins";
import { clearStoredOrigin, setStoredOrigin } from "@/lib/preferences";

type Props = {
  initialDisplayName: string;
  initialPreferredOrigin: string;
};

// Same order and labels as the map's pickers (cached cities first, then
// A-Z with "(≈ estimated)"), so the account page never shows a
// different list from the one the user sees on the map.
const ORIGIN_OPTIONS = originsForPicker().map((o) => ({
  code: o.code,
  label: originOptionLabel(o),
}));

export default function ProfileForm({
  initialDisplayName,
  initialPreferredOrigin,
}: Props) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [preferredOrigin, setPreferredOrigin] = useState(initialPreferredOrigin);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const dirty =
    displayName.trim() !== initialDisplayName.trim() ||
    preferredOrigin !== initialPreferredOrigin;

  async function save() {
    setStatus("saving");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName.trim() === "" ? null : displayName.trim(),
          preferred_origin:
            preferredOrigin === "" ? null : preferredOrigin,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      // Keep this device in step with the account: the map reads the
      // stored origin first, so without this the old local choice would
      // keep winning over the default the user just saved.
      if (preferredOrigin === "") clearStoredOrigin();
      else setStoredOrigin({ kind: "city", code: preferredOrigin });
      startTransition(() => setStatus("saved"));
      setTimeout(() => setStatus("idle"), 2500);
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="display-name"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-wn-charcoal/60"
        >
          Display name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={60}
          placeholder="Anonymous skier"
          className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm text-wn-charcoal placeholder-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-1 focus:ring-wn-navy"
        />
        <p className="mt-1 text-[11px] text-wn-charcoal/55">
          Shown on reviews you leave. Leave blank to stay anonymous.
        </p>
      </div>

      <div>
        <label
          htmlFor="preferred-origin"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-wn-charcoal/60"
        >
          Default starting city
        </label>
        <select
          id="preferred-origin"
          value={preferredOrigin}
          onChange={(e) => setPreferredOrigin(e.target.value)}
          className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-1 focus:ring-wn-navy"
        >
          <option value="">No default — ask each visit</option>
          {ORIGIN_OPTIONS.map((o) => (
            <option key={o.code} value={o.code}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-wn-charcoal/55">
          Sets where drive times start on the map and in Compare. You can
          always change it on the map. Cities outside the Northeast show
          estimated (≈) drive times.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-wn-charcoal/10 pt-4">
        <button
          type="button"
          onClick={save}
          disabled={status === "saving" || !dirty}
          className="rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
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
