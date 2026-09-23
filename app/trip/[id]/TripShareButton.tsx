"use client";

// Stage 28 — shareable read-only URL for a trip. A row in trip_shares
// holds a random token; anyone with the URL can view the trip at
// /trip/share/[token]. Supabase RLS lets only the trip owner insert
// or delete share rows.
//
// Mobile-first sharing rules (the old version failed silently on iOS):
//   * navigator.share / clipboard.writeText are called synchronously
//     inside the tap that asked for them — never after an await, or
//     Safari drops the user activation and rejects the call.
//   * The existing token is fetched on mount so that first tap on an
//     already-shared trip needs no network round-trip.
//   * When a link has to be created first, the button turns into a
//     link panel (URL field + Copy + Share…) rather than pretending
//     the copy happened.
//   * Every outcome is visible: copied, failed (with the URL to select
//     by hand), shared, disabled, renewed.

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Whether the device has a native share sheet. Read through
// useSyncExternalStore so the server render (no navigator) and the
// first client render agree, then the real value takes over.
const noopSubscribe = () => () => {};
function useCanNativeShare(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
    () => false,
  );
}

type Props = {
  tripId: string;
  /** Title for the native share sheet. */
  tripName: string;
};

type Status =
  | "idle"
  | "copied"
  | "shared"
  | "copy-failed"
  | "renewed"
  | "stopped";

function randomToken(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += chars[b % chars.length];
  return out;
}

export default function TripShareButton({ tripId, tripName }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "create" | "renew" | "stop">(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const canNativeShare = useCanNativeShare();

  // Look up an existing share token once so the first tap can share
  // synchronously instead of waiting on the network.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user || cancelled) return;
      const { data } = await supabase
        .from("trip_shares")
        .select("share_token")
        .eq("trip_id", tripId)
        .eq("created_by", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ share_token: string }>();
      if (cancelled || !data?.share_token) return;
      setShareUrl(`${window.location.origin}/trip/share/${data.share_token}`);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, tripId]);

  function flash(next: Status) {
    setStatus(next);
    window.setTimeout(() => setStatus((cur) => (cur === next ? "idle" : cur)), 2500);
  }

  // Clipboard write — must run synchronously in the click that owns
  // the user gesture. A rejection (iOS after lost activation, or no
  // clipboard API at all) opens the panel so the URL can be selected.
  function copyLink(url: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setPanelOpen(true);
      flash("copy-failed");
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => flash("copied"))
      .catch(() => {
        setPanelOpen(true);
        flash("copy-failed");
      });
  }

  // Native share sheet when the device has one; clipboard otherwise.
  function shareLink(url: string) {
    if (canNativeShare) {
      navigator
        .share({ title: tripName, url })
        .then(() => flash("shared"))
        .catch((err: unknown) => {
          // The user dismissed the sheet — nothing to report.
          if (err instanceof Error && err.name === "AbortError") return;
          copyLink(url);
        });
      return;
    }
    copyLink(url);
  }

  async function createToken(): Promise<string | null> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setError("Sign in first.");
      return null;
    }
    const token = randomToken(16);
    const { error: insErr } = await supabase.from("trip_shares").insert({
      trip_id: tripId,
      share_token: token,
      created_by: u.user.id,
    });
    if (insErr) {
      setError(`Couldn't create a link (${insErr.message}). Try again.`);
      return null;
    }
    return `${window.location.origin}/trip/share/${token}`;
  }

  async function deleteTokens(): Promise<boolean> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      setError("Sign in first.");
      return false;
    }
    const { error: delErr } = await supabase
      .from("trip_shares")
      .delete()
      .eq("trip_id", tripId)
      .eq("created_by", u.user.id);
    if (delErr) {
      setError(`Couldn't change the link (${delErr.message}). Try again.`);
      return false;
    }
    return true;
  }

  function handlePrimary() {
    setError(null);
    if (shareUrl) {
      // Sync path — the gesture is still live.
      shareLink(shareUrl);
      return;
    }
    void (async () => {
      setBusy("create");
      const url = await createToken();
      setBusy(null);
      if (!url) return;
      // The activation is gone after the awaits above, so instead of
      // a copy that may silently fail we show the link with its own
      // Copy / Share buttons.
      setShareUrl(url);
      setPanelOpen(true);
    })();
  }

  async function handleRenew() {
    setError(null);
    setBusy("renew");
    const removed = await deleteTokens();
    const url = removed ? await createToken() : null;
    setBusy(null);
    if (!url) return;
    setShareUrl(url);
    setPanelOpen(true);
    flash("renewed");
  }

  async function handleStop() {
    setError(null);
    setBusy("stop");
    const removed = await deleteTokens();
    setBusy(null);
    if (!removed) return;
    setShareUrl(null);
    setPanelOpen(false);
    flash("stopped");
  }

  const primaryLabel =
    busy === "create"
      ? "Creating link…"
      : status === "copied"
        ? "✓ Link copied"
        : status === "shared"
          ? "✓ Shared"
          : status === "stopped"
            ? "Sharing stopped"
            : shareUrl
              ? canNativeShare
                ? "🔗 Share trip"
                : "🔗 Copy link"
              : "🔗 Share trip";

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handlePrimary}
          disabled={busy != null}
          className="rounded-lg border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy disabled:opacity-60"
        >
          {primaryLabel}
        </button>
        {shareUrl && (
          <button
            type="button"
            onClick={() => setPanelOpen((v) => !v)}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? "Hide link options" : "Show link options"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-wn-charcoal/20 bg-white text-xs font-bold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
          >
            {panelOpen ? "▴" : "▾"}
          </button>
        )}
      </div>

      {shareUrl && panelOpen && (
        <div className="w-[min(88vw,320px)] rounded-lg border border-wn-charcoal/15 bg-white p-2 text-left shadow-md">
          <label htmlFor={`share-url-${tripId}`} className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            Anyone with this link can view the trip
          </label>
          <input
            id={`share-url-${tripId}`}
            type="text"
            readOnly
            value={shareUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-wn-charcoal/20 bg-wn-offwhite px-2 py-1 text-[11px] text-wn-charcoal"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => copyLink(shareUrl)}
              className="rounded-md bg-wn-navy px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-wn-navy/90"
            >
              {status === "copied" ? "✓ Copied" : "Copy link"}
            </button>
            {canNativeShare && (
              <button
                type="button"
                onClick={() => shareLink(shareUrl)}
                className="rounded-md border border-wn-charcoal/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
              >
                Share…
              </button>
            )}
            <button
              type="button"
              onClick={handleRenew}
              disabled={busy != null}
              title="Replace the link — the old one stops working"
              className="rounded-md border border-wn-charcoal/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy disabled:opacity-60"
            >
              {busy === "renew" ? "Renewing…" : status === "renewed" ? "✓ New link" : "New link"}
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={busy != null}
              className="rounded-md border border-wn-charcoal/20 bg-white px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal transition hover:border-red-400 hover:text-red-700 disabled:opacity-60"
            >
              {busy === "stop" ? "Stopping…" : "Stop sharing"}
            </button>
          </div>
          {status === "copy-failed" && (
            <p className="mt-1 text-[10px] text-amber-800">
              Couldn&apos;t copy automatically — select the link above and copy it.
            </p>
          )}
        </div>
      )}
      {error && <span className="max-w-[280px] text-right text-[10px] text-red-700">{error}</span>}
    </div>
  );
}
