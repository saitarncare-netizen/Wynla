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
        className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 transition hover:border-red-400 hover:bg-red-50"
      >
        Delete my account…
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor="confirm-delete"
        className="block text-xs font-semibold text-red-900"
      >
        Type <span className="font-mono font-bold">DELETE</span> to confirm
      </label>
      <input
        id="confirm-delete"
        type="text"
        autoComplete="off"
        autoCapitalize="characters"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-wn-charcoal focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        disabled={status === "deleting"}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={deleteAccount}
          disabled={confirm !== "DELETE" || status === "deleting"}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "deleting" ? "Deleting…" : "Permanently delete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setArmed(false);
            setConfirm("");
            setStatus("idle");
            setErrorMsg(null);
          }}
          disabled={status === "deleting"}
          className="rounded-md border border-wn-charcoal/20 px-4 py-2 text-sm font-semibold text-wn-charcoal/75 transition hover:bg-wn-charcoal/5 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs font-semibold text-red-700">
          {errorMsg ?? "Error"}
        </p>
      )}
    </div>
  );
}
