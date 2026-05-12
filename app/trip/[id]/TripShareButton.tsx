"use client";

// Stage 28 — generates a shareable read-only URL for a trip. Creates a
// row in trip_shares with a random token; anyone with the URL can view
// the trip at /trip/share/[token]. Uses Supabase RLS — only the trip
// owner can INSERT a new share row.

import { useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  tripId: string;
};

function randomToken(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

export default function TripShareButton({ tripId }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [generating, setGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ensureShareUrl() {
    if (shareUrl) {
      copyToClipboard(shareUrl);
      return;
    }
    setGenerating(true);
    setError(null);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setError("Sign in first.");
      setGenerating(false);
      return;
    }
    // Reuse existing share token if one already exists for this trip
    // (owner generates one, doesn't need infinite tokens).
    const { data: existing } = await supabase
      .from("trip_shares")
      .select("share_token")
      .eq("trip_id", tripId)
      .eq("created_by", u.user.id)
      .maybeSingle();
    let token = (existing as { share_token: string } | null)?.share_token;
    if (!token) {
      token = randomToken(16);
      const { error: insErr } = await supabase.from("trip_shares").insert({
        trip_id: tripId,
        share_token: token,
        created_by: u.user.id,
      });
      if (insErr) {
        setError(insErr.message);
        setGenerating(false);
        return;
      }
    }
    const url = `${window.location.origin}/trip/share/${token}`;
    setShareUrl(url);
    copyToClipboard(url);
    setGenerating(false);
  }

  function copyToClipboard(text: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={ensureShareUrl}
        disabled={generating}
        className="rounded-lg border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy disabled:opacity-60"
      >
        {generating ? "Generating…" : copied ? "✓ Link copied" : shareUrl ? "🔗 Copy link" : "🔗 Share trip"}
      </button>
      {shareUrl && (
        <span className="max-w-[240px] truncate text-[10px] text-wn-charcoal/50">
          {shareUrl}
        </span>
      )}
      {error && <span className="text-[10px] text-red-700">{error}</span>}
    </div>
  );
}
