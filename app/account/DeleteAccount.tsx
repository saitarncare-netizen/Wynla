"use client";

// Permanent account deletion. Two-step UX to prevent oops-clicks:
//   1. The "Delete my account" button reveals a confirmation panel.
//   2. The user has to type the literal word DELETE before the final
//      red button enables.
//
// On success we redirect to "/" — the user is signed out server-side
// inside the route handler, so the next page load sees an anon session.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function DeleteAccount() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function deleteAccount() {
    setStatus("deleting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      // Bounce home. router.refresh() so the layout re-reads auth state.
      router.replace("/");
      router.refresh();
    } catch (e) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="inline-flex min-h-11 items-center rounded-wn-sm border border-wn-danger/40 px-4 text-sm font-semibold text-wn-danger transition hover:border-wn-danger hover:bg-wn-danger-bg"
      >
        Delete my account…
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Spell out what goes, so the confirmation is informed. Mirrors
          the cascade list in /api/account/delete (audit account-social-35). */}
      <div className="rounded-wn-sm border border-wn-danger/30 bg-wn-danger-bg p-3 text-xs text-wn-danger">
        <p className="font-semibold">Deleting your account removes, permanently:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          <li>your favorites and saved trips, including any trip share links</li>
          <li>snow alerts and push subscriptions</li>
          <li>your snow digest and Thursday picks email subscriptions</li>
          <li>your profile, reviews and sign-in</li>
          <li>any Stripe subscription, which is cancelled first so nothing bills afterwards</li>
        </ul>
      </div>
      <label
        htmlFor="confirm-delete"
        className="block text-xs font-semibold text-wn-danger"
      >
        Type <span className="font-mono font-bold">DELETE</span> to confirm
      </label>
      <Input
        id="confirm-delete"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        disabled={status === "deleting"}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="danger"
          onClick={deleteAccount}
          disabled={confirm !== "DELETE" || status === "deleting"}
        >
          {status === "deleting" ? "Deleting…" : "Permanently delete"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setArmed(false);
            setConfirm("");
            setStatus("idle");
            setErrorMsg(null);
          }}
          disabled={status === "deleting"}
        >
          Cancel
        </Button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-xs font-semibold text-wn-danger">
          {errorMsg ?? "Error"}
        </p>
      )}
    </div>
  );
}
