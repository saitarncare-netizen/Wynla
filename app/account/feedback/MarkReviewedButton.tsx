"use client";

// Small client island for the "Mark as reviewed" link in the admin
// feedback table. PATCHes /api/feedback/[id] and refreshes the page so
// the row falls out of the "unread" count and styling.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

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
      {/* sm (36 px): a dense row in the desktop-only admin table. */}
      <Button size="sm" onClick={mark} disabled={busy}>
        {busy ? "…" : "Mark reviewed"}
      </Button>
      {err && <span className="text-xs text-wn-danger">{err}</span>}
    </div>
  );
}
