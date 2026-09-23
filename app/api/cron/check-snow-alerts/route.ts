// Snow-alert push cron.
//
// Vercel cron hits this at 12:30 UTC, after refresh-snow-conditions
// (11:30) and refresh-weather (12:00) have written fresh values onto the
// resorts rows. For every enabled snow_alerts row we decide, with the
// shared rules in lib/alertRules.ts, whether a push fires:
//
//   unknown_status  the OnTheSnow parse failed and only the Open-Meteo
//                   model fallback ran — the number is an estimate, so no
//                   push. Counted apart from 'closed': in season a rising
//                   count here means the parser broke, not that the hills
//                   shut
//   closed          resort is closed / off-season — modelled snow at a
//                   closed hill is not a powder day
//   stale           snow report older than 36 h — never alert on old data
//   below_threshold reported new snow < the user's threshold
//   already_today   an alert already went out today in the resort's own
//                   time zone (one push per resort per day, per user)
//   fire            send to every registered device of that user
//
// The notification names the resort, the number of inches, that the
// number is resort-reported, and when we last checked the report, in the
// resort's local time (snow_report_updated_at is our fetch time, not the
// resort's own report time, so the copy says "checked", not "reported").
//
// Push-service responses: 404 / 410 mean the subscription is gone and the
// row is deleted; 401 / 403 mean the VAPID key the browser subscribed
// with is not the one we sign with (key rotation, preview vs production
// mismatch). Those rows are NOT pruned — re-subscribing with the current
// key fixes them (lib/pushClient.ts does that on the next enable) — but
// they are counted as `vapidMismatch` in the JSON so the outage is seen.
//
// Env vars:
//   CRON_SECRET                   matches the Vercel cron header
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY     service role — joins snow_alerts to resorts
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  base64url P-256 point (the browser uses
//                                 the same key when subscribing)
//   VAPID_PRIVATE_KEY             base64url 32-byte private scalar
//   VAPID_SUBJECT                 "mailto:you@example.com"
//
// Without the VAPID env vars we 503 so a fresh deploy fails loudly in the
// cron log instead of silently doing nothing.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWebPush, type VapidKeys } from "@/lib/webPush";
import {
  evaluateAlert,
  formatResortLocalTime,
  type AlertVerdict,
} from "@/lib/alertRules";
import { timeZoneForState } from "@/lib/sunTimes";

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
  state: string | null;
  snow_new_24h_in: number | null;
  snow_report_status: string | null;
  snow_report_updated_at: string | null;
};

type SubRow = {
  user_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function GET(request: Request) {
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

  // NEXT_PUBLIC_VAPID_PUBLIC_KEY is the canonical name; VAPID_PUBLIC_KEY
  // is accepted so an older env layout keeps working through the rename.
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

  // 1. Every enabled alert. Filtering happens locally so each skip reason
  //    is counted in the run log.
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

  // 2. Current snow report for every resort referenced by an alert.
  const resortIds = Array.from(new Set(alerts.map((a) => a.resort_id)));
  const { data: resortsData, error: resortsErr } = await supabase
    .from("resorts")
    .select("id, slug, name, state, snow_new_24h_in, snow_report_status, snow_report_updated_at")
    .in("id", resortIds);
  if (resortsErr) {
    return NextResponse.json({ ok: false, reason: resortsErr.message }, { status: 500 });
  }
  const resortMap = new Map<number, ResortRow>();
  for (const r of (resortsData ?? []) as ResortRow[]) resortMap.set(r.id, r);

  // 3. Decide which alerts fire this run.
  const now = new Date();
  type Firing = { alert: AlertRow; resort: ResortRow; timeZone?: string };
  const firing: Firing[] = [];
  const skipped: Record<Exclude<AlertVerdict, "fire"> | "missing_resort", number> = {
    unknown_status: 0,
    closed: 0,
    stale: 0,
    below_threshold: 0,
    already_today: 0,
    missing_resort: 0,
  };

  for (const a of alerts) {
    const r = resortMap.get(a.resort_id);
    if (!r) {
      skipped.missing_resort++;
      continue;
    }
    const timeZone = timeZoneForState(r.state);
    const verdict = evaluateAlert(
      {
        thresholdIn: a.threshold_in,
        lastAlertedAt: a.last_alerted_at,
        snowNew24hIn: r.snow_new_24h_in,
        snowReportStatus: r.snow_report_status,
        snowReportUpdatedAt: r.snow_report_updated_at,
        timeZone,
      },
      now,
    );
    if (verdict === "fire") firing.push({ alert: a, resort: r, timeZone });
    else skipped[verdict]++;
  }

  if (firing.length === 0) {
    return NextResponse.json({ ok: true, fired: 0, skipped });
  }

  // 4. Registered devices for the affected users, one query.
  const userIds = Array.from(new Set(firing.map((f) => f.alert.user_id)));
  const { data: subsData, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subsErr) {
    return NextResponse.json({ ok: false, reason: subsErr.message }, { status: 500 });
  }
  const subsByUser = new Map<string, SubRow[]>();
  for (const s of (subsData ?? []) as SubRow[]) {
    if (!s.user_id) continue;
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  }

  // 5. Send. Per-alert success is tracked so one dead endpoint does not
  //    block the run; last_alerted_at moves as soon as one device of that
  //    user accepted the push, which is what makes the per-day dedupe hold.
  let fired = 0;
  let noDevice = 0;
  const errors: Array<{ alert_id: number; endpoint: string; error: string }> = [];
  const deadEndpoints = new Set<string>();
  const vapidMismatchEndpoints = new Set<string>();

  for (const { alert, resort, timeZone } of firing) {
    const subs = subsByUser.get(alert.user_id) ?? [];
    if (subs.length === 0) {
      noDevice++;
      continue;
    }
    const inches = resort.snow_new_24h_in ?? 0;
    // Only stamp a time when we know the resort's zone: printing the
    // server's UTC clock as if it were local would be worse than no time.
    const checkedAt =
      resort.snow_report_updated_at && timeZone
        ? formatResortLocalTime(new Date(resort.snow_report_updated_at), timeZone)
        : null;
    const payload = {
      title: `${inches} in of new snow at ${resort.name}`,
      body:
        `Resort-reported 24 h snowfall${checkedAt ? `, checked at ${checkedAt}` : ""}. ` +
        `Your alert threshold is ${alert.threshold_in} in.`,
      url: `/resort/${resort.slug}`,
      label: "Snow alert",
      tag: `snow-alert-${resort.id}`,
    };

    let anyOk = false;
    for (const sub of subs) {
      if (deadEndpoints.has(sub.endpoint)) continue;
      const result = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        vapidKeys,
      );
      if (result.ok) {
        anyOk = true;
        continue;
      }
      if (result.dead) deadEndpoints.add(sub.endpoint);
      if (result.vapidMismatch) vapidMismatchEndpoints.add(sub.endpoint);
      errors.push({
        alert_id: alert.id,
        endpoint: sub.endpoint,
        error: result.error ?? `status ${result.status ?? "?"}`,
      });
    }

    if (anyOk) {
      await supabase
        .from("snow_alerts")
        .update({ last_alerted_at: new Date().toISOString() })
        .eq("id", alert.id);
      fired++;
    }
  }

  // 6. Prune subscriptions the push service reported gone (404 / 410) so
  //    we stop retrying them every day.
  let expiredPruned = 0;
  if (deadEndpoints.size > 0) {
    const { error: pruneErr } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", Array.from(deadEndpoints));
    if (pruneErr) {
      errors.push({ alert_id: 0, endpoint: "(prune)", error: pruneErr.message });
    } else {
      expiredPruned = deadEndpoints.size;
    }
  }

  return NextResponse.json({
    ok: true,
    fired,
    noDevice,
    skipped,
    expiredPruned,
    // Devices whose subscription was made with a different VAPID public
    // key than the one this deploy signs with. Non-zero after a key
    // rotation is expected until those users re-enable alerts; non-zero
    // on a fresh deploy means the browser and server keys do not match.
    vapidMismatch: vapidMismatchEndpoints.size,
    errors,
  });
}
