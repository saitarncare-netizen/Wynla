"use client";

// Per-trip delete on the /trips list, so a stale plan can go without
// opening it first (audit trip-planner-25). Two-tap confirm via
// ConfirmButton (no window.confirm: blocked in the native wrapper),
// then router.refresh() so the server list re-renders without the row.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ConfirmButton from "@/components/ConfirmButton";

export default function TripDeleteButton({ tripId, tripName }: { tripId: string; tripName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    // .select("id") makes an RLS no-op (expired session in another tab)
    // visible instead of a silent success.
    const { data, error: err } = await supabase.from("trips").delete().eq("id", tripId).select("id");
    setBusy(false);
    if (err || !data || data.length === 0) {
      setError(err?.message ?? "Could not delete. Sign in again and retry.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <ConfirmButton
        onConfirm={remove}
        busy={busy}
        busyLabel="Deleting…"
        label={
          <>
            <span aria-hidden="true">🗑️</span>
            <span className="sr-only">Delete {tripName}</span>
          </>
        }
        confirmLabel="Delete?"
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-lg px-2 text-sm text-wn-charcoal/50 transition hover:bg-red-50 hover:text-red-700"
        armedClassName="inline-flex h-11 items-center justify-center rounded-lg border border-red-400 bg-red-50 px-3 text-xs font-semibold text-red-700"
      />
      {error && <span className="max-w-[220px] text-right text-[10px] text-red-700">{error}</span>}
    </div>
  );
}
