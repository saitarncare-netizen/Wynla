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
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Input, { inputClasses } from "@/components/ui/Input";
import Icon from "@/components/icons/Icon";

type Props = {
  initialDisplayName: string;
  initialPreferredOrigin: string;
};

// All 29 launch cities from lib/origins, in the same order and with the
// same labels as the map's pickers (cached cities first, then A-Z with
// "(≈ estimated)"), so the account page never shows a different list
// from the one the user sees on the map.
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
      <Field label="Display name" hint="Shown on reviews you leave. Leave blank to stay anonymous.">
        {(a11y) => (
          <Input
            {...a11y}
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            placeholder="Anonymous skier"
          />
        )}
      </Field>

      <Field
        label="Default starting city"
        hint="Sets where drive times start on the map and in Compare. You can always change it on the map. Cities outside the Northeast show estimated (≈) drive times."
      >
        {({ invalid, ...a11y }) => (
          <select
            {...a11y}
            value={preferredOrigin}
            onChange={(e) => setPreferredOrigin(e.target.value)}
            className={inputClasses(invalid, "min-h-11")}
          >
            <option value="">No default — ask each visit</option>
            {ORIGIN_OPTIONS.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="flex flex-wrap items-center gap-2 border-t border-wn-line pt-4">
        <Button onClick={save} disabled={status === "saving" || !dirty}>
          {status === "saving" ? "Saving…" : "Save changes"}
        </Button>
        {status === "saved" && (
          <span role="status" className="inline-flex items-center gap-1 text-xs font-semibold text-wn-success">
            <Icon name="check" className="h-3.5 w-3.5" /> Saved
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
