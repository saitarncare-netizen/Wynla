"use client";

// Inline rename for a saved trip. Server-rendered name comes in via
// props; this component owns the edit toggle, optimistic UI, and the
// supabase.update + router.refresh round-trip after save.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  tripId: string;
  initialName: string | null;
  fallbackName: string;
};

export default function TripNameEditor({ tripId, initialName, fallbackName }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName ?? "");
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function startEdit() {
    setDraft(name ?? "");
    setEditing(true);
    setError(null);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function save() {
    const trimmed = draft.trim();
    // Empty input clears the custom name (falls back to "X-day trip").
    const nextName = trimmed.length === 0 ? null : trimmed.slice(0, 80);
    setSaving(true);
    setError(null);
    const { error: e } = await supabase
      .from("trips")
      .update({ name: nextName })
      .eq("id", tripId);
    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setName(nextName);
    setEditing(false);
    startTransition(() => router.refresh());
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          maxLength={80}
          placeholder={fallbackName}
          className="w-full rounded-md border-2 border-white/40 bg-white/10 px-3 py-2 text-2xl font-extrabold tracking-tight text-white placeholder:text-white/40 focus:border-white focus:outline-none sm:text-3xl"
          aria-label="Trip name"
        />
        <div className="flex gap-2 sm:flex-shrink-0">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-wn-navy transition hover:bg-white/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={saving}
            className="rounded-md border border-white/30 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
        {error && (
          <p className="w-full rounded-md bg-red-500/90 px-2 py-1 text-[11px] font-semibold text-white">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="group flex items-baseline gap-2">
      <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
        {name ?? fallbackName}
      </h1>
      <button
        type="button"
        onClick={startEdit}
        title="Rename trip"
        aria-label="Rename trip"
        className="rounded-md border border-white/0 bg-white/0 p-1.5 text-white/70 transition hover:border-white/30 hover:bg-white/10 hover:text-white focus:border-white/30 focus:bg-white/10 focus:text-white focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>
    </div>
  );
}
