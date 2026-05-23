"use client";

// Small client island for the "Mark as reviewed" link in the admin
// feedback table. PATCHes /api/feedback/[id] and refreshes the page so
// the row falls out of the "unread" count and styling.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkReviewedButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function mark() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setErr(data.error ?? "Failed");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={mark}
        disabled={busy}
        className="rounded-full bg-wn-navy px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-50"
      >
        {busy ? "…" : "Mark reviewed"}
      </button>
      {err && <span className="text-[10px] text-red-700">{err}</span>}
    </div>
  );
}
