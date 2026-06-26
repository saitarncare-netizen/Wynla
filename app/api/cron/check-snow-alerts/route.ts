// Stage 32 — snow-alert firing cron.
//
// Vercel cron hits this at 12:30 UTC (30 min after refresh-weather has
// finished writing fresh snow_new_24h_in values onto resorts rows). We
// find snow_alerts rows whose resort's measured snowfall now meets or
// exceeds the user's threshold, then push a web notification per matching
// push_subscriptions row.
//
// Eligibility:
//   * snow_alerts.enabled = true
//   * resorts.snow_new_24h_in >= snow_alerts.threshold_in
//   * snow_alerts.last_alerted_at is null OR older than 12h (don't spam)
//
// Env vars:
//   CRON_SECRET                   matches Vercel cron header
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY     service role — joins snow_alerts to resorts
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  base64url, 65-byte uncompressed P-256 point
//                                 (NEXT_PUBLIC_ because the client SW needs
//                                 the same key when subscribing)
//   VAPID_PRIVATE_KEY             base64url, 32-byte raw private scalar
//   VAPID_SUBJECT                 "mailto:you@example.com"
//
// Without the VAPID env vars we 503 gracefully so a fresh deploy doesn't
// blow up the run before keys are generated.
//
// lib/webPush.ts now uses the `web-push` SDK to encrypt the JSON payload
// (title/body/url), so subscribers actually see the specific resort name
// and snow amount in the notification.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush, type VapidKeys } from "@/lib/webPush";

export const runtime = "nodejs";
export const maxDuration = 300;

type AlertRow = {
  id: number;
  user_id: string;
  resort_id: number;
  threshold_in: number;
  enabled: boolean;
  last_alerted_at: string | null;
};

type ResortRow = {
  id: number;
  slug: string;
  name: string;
  snow_new_24h_in: number | null;
};

type SubRow = {
  user_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function GET(request: Request) {
  // Same auth pattern as refresh-weather.
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: a missing secret must NOT make this service-role endpoint
  // publicly invokable (it fans out push notifications to all subscribers).
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, reason: "cron_secret_not_configured" },
      { status: 503 },
    );
  }
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ ok: false, reason: "missing supabase env" }, { status: 503 });
  }

  // Read NEXT_PUBLIC_VAPID_PUBLIC_KEY (same value the client SW uses
  // when subscribing) with a legacy VAPID_PUBLIC_KEY fallback so older
  // deploys keep working through the rename.
  const VAPID_PUBLIC =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT) {
    return NextResponse.json(
      {
        ok: false,
        reason:
          "missing NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT — generate with `npx web-push generate-vapid-keys`",
      },
      { status: 503 },
    );
  }
  const vapidKeys: VapidKeys = {
    publicKey: VAPID_PUBLIC,
    privateKey: VAPID_PRIVATE,
    subject: VAPID_SUBJECT,
  };

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Load all enabled alerts. The 12h cooldown filter is applied locally
  //    because we want to log "skipped due to cooldown" counts separately
  //    from "no snow yet" counts.
  const { data: alertsData, error: alertsErr } = await supabase
    .from("snow_alerts")
    .select("id, user_id, resort_id, threshold_in, enabled, last_alerted_at")
    .eq("enabled", true);
  if (alertsErr) {
    return NextResponse.json({ ok: false, reason: alertsErr.message }, { status: 500 });
  }
  const alerts = (alertsData ?? []) as AlertRow[];
  if (alerts.length === 0) {
    return NextResponse.json({ ok: true, fired: 0, reason: "no enabled alerts" });
  }

  // 2. Fetch fresh snowfall for every resort referenced by an alert.
  const resortIds = Array.from(new Set(alerts.map((a) => a.resort_id)));
  const { data: resortsData, error: resortsErr } = await supabase
    .from("resorts")
    .select("id, slug, name, snow_new_24h_in")
    .in("id", resortIds);
  if (resortsErr) {
    return NextResponse.json({ ok: false, reason: resortsErr.message }, { status: 500 });
  }
  const resortMap = new Map<number, ResortRow>();
  for (const r of (resortsData ?? []) as ResortRow[]) resortMap.set(r.id, r);

  // 3. Decide which alerts fire this run.
  const now = Date.now();
  const COOLDOWN_MS = 12 * 60 * 60 * 1000;
  type Firing = { alert: AlertRow; resort: ResortRow };
  const firing: Firing[] = [];
  let skippedCooldown = 0;
  let skippedBelowThreshold = 0;

  for (const a of alerts) {
    const r = resortMap.get(a.resort_id);
    if (!r || r.snow_new_24h_in == null) {
      skippedBelowThreshold++;
      continue;
    }
    if (r.snow_new_24h_in < a.threshold_in) {
      skippedBelowThreshold++;
      continue;
    }
    if (a.last_alerted_at) {
      const age = now - new Date(a.last_alerted_at).getTime();
      if (age < COOLDOWN_MS) {
        skippedCooldown++;
        continue;
      }
    }
    firing.push({ alert: a, resort: r });
  }

  if (firing.length === 0) {
    return NextResponse.json({
      ok: true,
      fired: 0,
      skippedCooldown,
      skippedBelowThreshold,
    });
  }

  // 4. Load push_subscriptions for the affected users in one query.
  const userIds = Array.from(new Set(firing.map((f) => f.alert.user_id)));
  const { data: subsData } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  const subsByUser = new Map<string, SubRow[]>();
  for (const s of (subsData ?? []) as SubRow[]) {
    if (!s.user_id) continue;
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  }

  // 5. Fire pushes. We track per-alert success so an endpoint going 410
  //    (expired) doesn't block the rest of the run; we still bump
  //    last_alerted_at as long as at least one device for that user
  //    accepted the push.
  let fired = 0;
  const errors: Array<{ alert_id: number; endpoint: string; error: string }> = [];
  const expiredEndpoints: string[] = [];

  for (const { alert, resort } of firing) {
    const subs = subsByUser.get(alert.user_id) ?? [];
    if (subs.length === 0) continue;

    let anyOk = false;
    for (const sub of subs) {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        {
          title: `${resort.snow_new_24h_in}" of fresh snow at ${resort.name}!`,
          body: `Above your ${alert.threshold_in}" alert threshold.`,
          url: `/resort/${resort.slug}`,
        },
        vapidKeys,
      );
      if (result.ok) {
        anyOk = true;
      } else {
        // 404/410 means the browser uninstalled the subscription — prune.
        if (result.status === 404 || result.status === 410) {
          expiredEndpoints.push(sub.endpoint);
        }
        errors.push({
          alert_id: alert.id,
          endpoint: sub.endpoint,
          error: result.error ?? `status ${result.status ?? "?"}`,
        });
      }
    }

    if (anyOk) {
      await supabase
        .from("snow_alerts")
        .update({ last_alerted_at: new Date().toISOString() })
        .eq("id", alert.id);
      fired++;
    }
  }

  // 6. Prune dead subscriptions so we don't keep retrying them.
  if (expiredEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
  }

  return NextResponse.json({
    ok: true,
    fired,
    skippedCooldown,
    skippedBelowThreshold,
    expiredPruned: expiredEndpoints.length,
    errors,
  });
}
