"use client";

// Stage 29 — "Enable snow alerts" button on resort detail pages.
// Registers the service worker, prompts for push permission, subscribes
// to the VAPID public key, and POSTs the subscription to our API. Then
// upserts a snow_alerts row so the future cron knows to fire pushes
// for this resort.

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  resortId: number;
  resortName: string;
};

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  // Allocate via a true ArrayBuffer so the resulting view's .buffer is
  // ArrayBuffer (not SharedArrayBuffer) — pushManager.subscribe's
  // applicationServerKey type requires the stricter form.
  const buffer = new ArrayBuffer(rawData.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export default function SnowAlertButton({ resortId, resortName }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(6);
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      const ok =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      setSupported(ok);
      if (ok) setPermission(Notification.permission);
    };
    compute();
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      setUserId(u.user?.id ?? null);
      if (u.user) {
        const { data: a } = await supabase
          .from("snow_alerts")
          .select("threshold_in, enabled")
          .eq("user_id", u.user.id)
          .eq("resort_id", resortId)
          .maybeSingle();
        if (a) {
          setEnabled((a as { enabled: boolean }).enabled);
          setThreshold((a as { threshold_in: number }).threshold_in);
        }
      }
    })();
  }, [supabase, resortId]);

  async function enable() {
    if (!supported) {
      setError("This browser doesn't support push notifications.");
      return;
    }
    if (!userId) {
      setError("Sign in to enable alerts.");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError("Push setup incomplete (no VAPID key). Tell the admin.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 1. Permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        throw new Error("Notification permission denied.");
      }
      // 2. Register SW + subscribe
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      // 3. POST to API
      const resp = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.error ?? "Subscribe failed");
      }
      // 4. Upsert snow_alerts row
      const { error: alertErr } = await supabase.from("snow_alerts").upsert(
        {
          user_id: userId,
          resort_id: resortId,
          threshold_in: threshold,
          enabled: true,
        },
        { onConflict: "user_id,resort_id" },
      );
      if (alertErr) throw new Error(alertErr.message);
      setEnabled(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!userId) return;
    setBusy(true);
    setError(null);
    const { error: updErr } = await supabase
      .from("snow_alerts")
      .update({ enabled: false })
      .eq("user_id", userId)
      .eq("resort_id", resortId);
    if (updErr) setError(updErr.message);
    else setEnabled(false);
    setBusy(false);
  }

  if (!supported) {
    return (
      <p className="text-[11px] text-wn-charcoal/55">
        Snow alerts need a modern browser with push support.
      </p>
    );
  }

  return (
    <div className="rounded-lg border border-wn-charcoal/15 bg-wn-offwhite p-3">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
        Snow alerts
      </div>
      <p className="mb-2 text-xs text-wn-charcoal/70">
        Get a push when {resortName} reports{" "}
        <input
          type="number"
          min={1}
          max={50}
          step={1}
          value={threshold}
          onChange={(e) => setThreshold(Math.max(1, Math.min(50, Number(e.target.value) || 6)))}
          disabled={busy}
          className="mx-1 w-12 rounded border border-wn-charcoal/20 bg-white px-1 py-0.5 text-center font-bold text-wn-navy"
        />
        + inches of new snow in 24h.
      </p>
      {enabled ? (
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-wn-navy bg-white px-3 py-1.5 text-xs font-semibold text-wn-navy transition hover:bg-wn-navy hover:text-white disabled:opacity-60"
        >
          {busy ? "Updating…" : "🔔 Alerts on — disable"}
        </button>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-wn-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
        >
          {busy ? "Enabling…" : "🔔 Enable snow alerts"}
        </button>
      )}
      {permission === "denied" && (
        <p className="mt-1 text-[10px] text-red-700">
          Permission blocked — re-enable in browser settings.
        </p>
      )}
      {error && <p className="mt-1 text-[10px] text-red-700">{error}</p>}
      {!userId && (
        <p className="mt-1 text-[10px] text-wn-charcoal/55">Sign in to enable.</p>
      )}
    </div>
  );
}
