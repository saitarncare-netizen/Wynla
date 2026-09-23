"use client";

// "Snow alerts" card on resort detail pages.
//
// Four states, decided in this order:
//   1. iOS Safari in a normal tab → coach the user to Add to Home Screen
//      (iOS only exposes Web Push to installed apps).
//   2. Browser without push support → one-line notice.
//   3. Signed out → a sign-in link. No Enable button, because it could
//      only fail.
//   4. Signed in → threshold input + Enable / Disable, plus the current
//      threshold, the last alert time and whether THIS device is
//      registered (alerts are per account, devices are per browser).
//
// Threshold edits persist immediately once alerts are on (blur / Enter),
// so a change made after enabling is not silently lost.

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useProStatus } from "@/lib/proClient";
import { FREE_LIMITS } from "@/lib/tierLimits";
import {
  getThisDeviceSubscription,
  isPushSupported,
  needsIosInstall,
  subscribeThisDevice,
  syncThisDevice,
} from "@/lib/pushClient";
import UpsellModal from "@/components/UpsellModal";

type Props = {
  resortId: number;
  resortName: string;
};

type AlertRow = {
  threshold_in: number;
  enabled: boolean;
  last_alerted_at: string | null;
};

type Platform = "pending" | "ios-install" | "unsupported" | "ok";

// Platform capability never changes during a page's life, so it is read
// through useSyncExternalStore with a no-op subscription: the server
// snapshot is "pending" (no hydration mismatch) and the client snapshot
// is computed once after hydration, with no setState inside an effect.
const noopSubscribe = () => () => {};
const getServerPlatform = (): Platform => "pending";
function getClientPlatform(): Platform {
  if (isPushSupported()) return "ok";
  return needsIosInstall() ? "ios-install" : "unsupported";
}

const DEFAULT_THRESHOLD_IN = 6;
const MIN_THRESHOLD_IN = 1;
const MAX_THRESHOLD_IN = 50;

function clampThreshold(raw: string, fallback: number): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n) || raw.trim() === "") return fallback;
  return Math.max(MIN_THRESHOLD_IN, Math.min(MAX_THRESHOLD_IN, n));
}

function formatLastAlert(iso: string | null): string {
  if (!iso) return "none yet";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "none yet";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SnowAlertButton({ resortId, resortName }: Props) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const pathname = usePathname();
  const platform = useSyncExternalStore(noopSubscribe, getClientPlatform, getServerPlatform);
  const [userId, setUserId] = useState<string | null | "loading">("loading");
  const [enabled, setEnabled] = useState(false);
  const [savedThreshold, setSavedThreshold] = useState<number>(DEFAULT_THRESHOLD_IN);
  const [thresholdText, setThresholdText] = useState(String(DEFAULT_THRESHOLD_IN));
  const [lastAlertedAt, setLastAlertedAt] = useState<string | null>(null);
  const [thisDeviceRegistered, setThisDeviceRegistered] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [activeAlertCount, setActiveAlertCount] = useState<number | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const { isPro, isLoading: proLoading } = useProStatus();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (cancelled) return;
      const uid = u.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      // Existing per-resort alert + count of active alerts across all
      // resorts (free tier: one active alert total).
      const [{ data: a }, countRes] = await Promise.all([
        supabase
          .from("snow_alerts")
          .select("threshold_in, enabled, last_alerted_at")
          .eq("user_id", uid)
          .eq("resort_id", resortId)
          .maybeSingle(),
        supabase
          .from("snow_alerts")
          .select("resort_id", { count: "exact", head: true })
          .eq("user_id", uid)
          .eq("enabled", true),
      ]);
      if (cancelled) return;
      const row = a as AlertRow | null;
      if (row) {
        setEnabled(row.enabled);
        setSavedThreshold(row.threshold_in);
        setThresholdText(String(row.threshold_in));
        setLastAlertedAt(row.last_alerted_at);
      }
      setActiveAlertCount(countRes.count ?? 0);

      // Is this browser one of the devices that will receive the push?
      // Alerts live per account; a second device or a rotated endpoint
      // means the row says "on" while nothing arrives here.
      if (isPushSupported()) {
        const sub = await getThisDeviceSubscription();
        if (cancelled) return;
        setThisDeviceRegistered(Boolean(sub));
        // Keep the server row bound to the current user and its
        // last_seen_at moving (the service worker has no
        // pushsubscriptionchange handler yet — see lib/pushClient.ts).
        if (sub) void syncThisDevice();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, resortId]);

  const persistThreshold = useCallback(
    async (value: number) => {
      if (userId === "loading" || !userId || !enabled || value === savedThreshold) return;
      setBusy(true);
      setNotice(null);
      const { error } = await supabase
        .from("snow_alerts")
        .update({ threshold_in: value })
        .eq("user_id", userId)
        .eq("resort_id", resortId);
      setBusy(false);
      if (error) {
        setNotice({ kind: "error", text: error.message });
        setThresholdText(String(savedThreshold));
      } else {
        setSavedThreshold(value);
        setNotice({ kind: "ok", text: `Saved. You'll hear when ${resortName} reports ${value} in or more in 24 h.` });
      }
    },
    [supabase, userId, enabled, savedThreshold, resortId, resortName],
  );

  function commitThresholdInput() {
    const value = clampThreshold(thresholdText, savedThreshold);
    setThresholdText(String(value));
    void persistThreshold(value);
  }

  async function registerThisDevice(): Promise<boolean> {
    const res = await subscribeThisDevice();
    if (res.ok) {
      setThisDeviceRegistered(true);
      return true;
    }
    setNotice({
      kind: "error",
      text:
        res.reason === "denied"
          ? "Notifications are blocked for Wynla in this browser. Allow them in the site settings, then try again."
          : "Push is not set up on the server yet (missing VAPID key).",
    });
    return false;
  }

  async function enable() {
    if (!userId) return;
    // Wait for Pro status + alert count before gating, so a tap in the
    // first moments cannot misfire (Pro user sees the upsell, or a free
    // user at the cap slips past).
    if (proLoading || activeAlertCount === null) {
      setNotice({ kind: "error", text: "Still loading your account. Try again in a moment." });
      return;
    }
    if (!isPro && activeAlertCount >= FREE_LIMITS.snowAlerts) {
      setShowUpsell(true);
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const threshold = clampThreshold(thresholdText, savedThreshold);
      setThresholdText(String(threshold));
      if (!(await registerThisDevice())) return;
      const { error: alertErr } = await supabase.from("snow_alerts").upsert(
        { user_id: userId, resort_id: resortId, threshold_in: threshold, enabled: true },
        { onConflict: "user_id,resort_id" },
      );
      if (alertErr) throw new Error(alertErr.message);
      setEnabled(true);
      setSavedThreshold(threshold);
      setActiveAlertCount((c) => (c == null ? c : c + 1));
      setNotice({ kind: "ok", text: "Alerts are on for this device." });
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function addThisDevice() {
    setBusy(true);
    setNotice(null);
    try {
      if (await registerThisDevice()) {
        setNotice({ kind: "ok", text: "This device will now receive alerts too." });
      }
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (userId === "loading" || !userId) return;
    setBusy(true);
    setNotice(null);
    const { error: updErr } = await supabase
      .from("snow_alerts")
      .update({ enabled: false })
      .eq("user_id", userId)
      .eq("resort_id", resortId);
    if (updErr) {
      setNotice({ kind: "error", text: updErr.message });
    } else {
      setEnabled(false);
      setActiveAlertCount((c) => (c == null ? c : Math.max(0, c - 1)));
    }
    setBusy(false);
  }

  const heading = (
    <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
      Snow alerts
    </div>
  );
  const shell = (children: ReactNode) => (
    <div className="rounded-lg border border-wn-charcoal/15 bg-wn-offwhite p-3">
      {heading}
      {children}
    </div>
  );

  if (platform === "ios-install") {
    return shell(
      <p className="text-xs text-wn-charcoal/70">
        Add Wynla to your Home Screen first, then enable alerts. In Safari tap Share, then
        &ldquo;Add to Home Screen&rdquo;. iPhone and iPad only deliver push notifications to
        installed apps.
      </p>,
    );
  }

  if (platform === "unsupported") {
    return shell(
      <p className="text-xs text-wn-charcoal/70">
        Snow alerts need a browser with push notification support.
      </p>,
    );
  }

  if (platform === "pending" || userId === "loading") {
    return shell(<p className="text-xs text-wn-charcoal/55">Checking your account…</p>);
  }

  if (userId === null) {
    const next = pathname && pathname.startsWith("/") ? pathname : "/";
    return shell(
      <p className="text-xs text-wn-charcoal/70">
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-wn-navy underline underline-offset-2 hover:text-wn-navy/80"
        >
          Sign in to get snow alerts
        </Link>{" "}
        when {resortName} reports fresh snow.
      </p>,
    );
  }

  return shell(
    <>
      <p className="mb-2 text-xs text-wn-charcoal/70">
        Get a push when {resortName} reports{" "}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={thresholdText}
          onChange={(e) => setThresholdText(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
          onBlur={commitThresholdInput}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          disabled={busy}
          aria-label={`Alert threshold in inches of new snow in 24 hours (${MIN_THRESHOLD_IN} to ${MAX_THRESHOLD_IN})`}
          className="mx-1 w-12 rounded border border-wn-charcoal/20 bg-white px-1 py-0.5 text-center font-bold text-wn-navy"
        />
        in or more of new snow in 24 h.
      </p>
      {enabled ? (
        <>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-wn-navy bg-white px-3 py-1.5 text-xs font-semibold text-wn-navy transition hover:bg-wn-navy hover:text-white disabled:opacity-60"
          >
            {busy ? "Updating…" : "Alerts on. Turn off"}
          </button>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[11px] text-wn-charcoal/70">
            <dt className="font-semibold text-wn-charcoal/55">Threshold</dt>
            <dd>{savedThreshold} in of new snow in 24 h</dd>
            <dt className="font-semibold text-wn-charcoal/55">Last alert</dt>
            <dd>{formatLastAlert(lastAlertedAt)}</dd>
            <dt className="font-semibold text-wn-charcoal/55">This device</dt>
            <dd>
              {thisDeviceRegistered === false ? (
                <>
                  not registered.{" "}
                  <button
                    type="button"
                    onClick={addThisDevice}
                    disabled={busy}
                    className="font-semibold text-wn-navy underline underline-offset-2 disabled:opacity-60"
                  >
                    Alert this device too
                  </button>
                </>
              ) : thisDeviceRegistered ? (
                "registered"
              ) : (
                "checking…"
              )}
            </dd>
          </dl>
        </>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-wn-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
        >
          {busy ? "Enabling…" : "Enable snow alerts"}
        </button>
      )}
      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-1 text-[10px] ${notice.kind === "error" ? "text-red-700" : "text-emerald-800"}`}
        >
          {notice.text}
        </p>
      )}
      <UpsellModal
        open={showUpsell}
        onClose={() => setShowUpsell(false)}
        gate="snowAlerts"
        detail="Free accounts get alerts for 1 resort at a time, and you already have an active alert elsewhere. Pro adds alerts on every favorite with a custom threshold per resort."
      />
    </>,
  );
}
