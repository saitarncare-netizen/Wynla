// Snow-alert push cron.
//
// Vercel cron hits this at 12:30 UTC, after refresh-snow-conditions
// (10:00, season status → resorts.currently_open, licensed reports when a
// feed exists) and refresh-weather (11:00, measured snow → resorts.
// snow_new_24h_in) have written fresh values onto the resorts rows. For
// every enabled snow_alerts row we decide, with the shared rules in
// lib/alertRules.ts, whether a push fires:
//
//   unknown_status  currently_open is null — no declared season dates and
//                   no feed, so we cannot say the lifts run. No push (snow
//                   falls on shut mountains too). Counted apart from
//                   'closed': a rising count here in season means resorts
//                   are missing season evidence, not that the hills shut
//   closed          currently_open is false — measured snow at a closed
//                   hill is not a powder day
//   stale           the snow number is older than 36 h — never alert on
//                   old data. 'reported' rows date from the resort's own
//                   report time; measured rows from the weather refresh
//                   (weather_cache.fetched_at) that wrote the number
//   below_threshold new snow < the user's threshold
//   already_today   an alert already went out today in the resort's own
//                   time zone (one push per resort per day, per user)
//   fire            send to every registered device of that user
//
// The notification names the resort, the number of inches, whether the
// number is resort-reported or measured (NOAA snowfall analysis), and
// when it dates from, in the resort's local time.
//
// Push-service responses: 404 / 410 mean the subscription is gone and the
// row is deleted (pruned, not counted as a failure); 401 / 403 mean the
// VAPID key the browser subscribed with is not the one we sign with (key
// rotation, preview vs production mismatch). Those rows are NOT pruned —
// re-subscribing with the current key fixes them (lib/pushClient.ts does
// that on the next enable) — but they are counted as `vapidMismatch` in
// the JSON so the outage is seen.
//
// Runs under lib/cronRun.ts like every other cron: auth, a cron_runs row,
// one JSON log line, and HTTP 500 when the run is not ok. Missing VAPID
// keys are reported as a failed run (the job cannot do its work) rather
// than a silent ok. A run is ok when at most FAIL_SHARE_LIMIT of the push
// deliveries failed.
//
// Env vars:
//   CRON_SECRET                   matches the Vercel cron header
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY     service role — joins snow_alerts to resorts
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  base64url P-256 point (the browser uses
//                                 the same key when subscribing)
//   VAPID_PRIVATE_KEY             base64url 32-byte private scalar
//   VAPID_SUBJECT                 "mailto:you@example.com"

import { runCron, type CronContext, type CronSummary } from "@/lib/cronRun";
import { sendWebPush, type VapidKeys } from "@/lib/webPush";
import {
  evaluateAlert,
  formatResortLocalTime,
  isReportedStatus,
  type AlertVerdict,
} from "@/lib/alertRules";
import { timeZoneForState } from "@/lib/sunTimes";

export const runtime = "nodejs";
export const maxDuration = 300;

const FAIL_SHARE_LIMIT = 0.3;

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
  currently_open: boolean | null;
};

type WeatherStamp = { resort_id: number; fetched_at: string | null };

type SubRow = {
  user_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function runAlerts(ctx: CronContext): Promise<CronSummary> {
  const { supabase, startedAt: now } = ctx;

  // NEXT_PUBLIC_VAPID_PUBLIC_KEY is the canonical name; VAPID_PUBLIC_KEY
  // is accepted so an older env layout keeps working through the rename.
  const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY;
  const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
  const VAPID_SUBJECT = process.env.VAPID_SUBJECT;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE || !VAPID_SUBJECT) {
    return {
      ok: false,
      reason:
        "missing NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT — generate with `npx web-push generate-vapid-keys`",
    };
  }
  const vapidKeys: VapidKeys = { publicKey: VAPID_PUBLIC, privateKey: VAPID_PRIVATE, subject: VAPID_SUBJECT };

  // 1. Every enabled alert. Filtering happens locally so each skip reason
  //    is counted in the run log.
  const { data: alertsData, error: alertsErr } = await supabase
    .from("snow_alerts")
    .select("id, user_id, resort_id, threshold_in, enabled, last_alerted_at")
    .eq("enabled", true);
  if (alertsErr) return { ok: false, reason: `snow_alerts: ${alertsErr.message}` };
  const alerts = (alertsData ?? []) as AlertRow[];
  if (alerts.length === 0) return { ok: true, fired: 0, reason: "no enabled alerts" };

  // 2. Current snow number + open state for every resort referenced by an
  //    alert, plus the weather refresh stamp that dates the measured number.
  const resortIds = Array.from(new Set(alerts.map((a) => a.resort_id)));
  const [{ data: resortsData, error: resortsErr }, { data: weatherData, error: weatherErr }] = await Promise.all([
    supabase
      .from("resorts")
      .select("id, slug, name, state, snow_new_24h_in, snow_report_status, snow_report_updated_at, currently_open")
      .in("id", resortIds),
    supabase.from("weather_cache").select("resort_id, fetched_at").in("resort_id", resortIds),
  ]);
  if (resortsErr) return { ok: false, reason: `resorts: ${resortsErr.message}` };
  if (weatherErr) return { ok: false, reason: `weather_cache: ${weatherErr.message}` };
  const resortMap = new Map<number, ResortRow>();
  for (const r of (resortsData ?? []) as ResortRow[]) resortMap.set(r.id, r);
  const weatherStamp = new Map<number, string | null>();
  for (const w of (weatherData ?? []) as WeatherStamp[]) weatherStamp.set(w.resort_id, w.fetched_at);

  /** When the resort's snow number was last written (see lib/alertRules). */
  const snowUpdatedAt = (r: ResortRow): string | null =>
    isReportedStatus(r.snow_report_status) ? r.snow_report_updated_at : (weatherStamp.get(r.id) ?? null);

  // 3. Decide which alerts fire this run.
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
        currentlyOpen: r.currently_open,
        snowUpdatedAt: snowUpdatedAt(r),
        timeZone,
      },
      now,
    );
    if (verdict === "fire") firing.push({ alert: a, resort: r, timeZone });
    else skipped[verdict]++;
  }

  if (firing.length === 0) return { ok: true, fired: 0, skipped };

  // 4. Registered devices for the affected users, one query.
  const userIds = Array.from(new Set(firing.map((f) => f.alert.user_id)));
  const { data: subsData, error: subsErr } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subsErr) return { ok: false, reason: `push_subscriptions: ${subsErr.message}` };
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
  let attempts = 0;
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
    const reported = isReportedStatus(resort.snow_report_status);
    // Only stamp a time when we know the resort's zone: printing the
    // server's UTC clock as if it were local would be worse than no time.
    const stampSource = snowUpdatedAt(resort);
    const stamp = stampSource && timeZone ? formatResortLocalTime(new Date(stampSource), timeZone) : null;
    const provenance = reported
      ? `Resort-reported 24 h snowfall${stamp ? ` (report from ${stamp})` : ""}.`
      : `Measured 24 h snowfall from the NOAA snow analysis${stamp ? `, checked at ${stamp}` : ""}.`;
    const payload = {
      title: `${inches} in of new snow at ${resort.name}`,
      body: `${provenance} Your alert threshold is ${alert.threshold_in} in.`,
      url: `/resort/${resort.slug}`,
      label: "Snow alert",
      tag: `snow-alert-${resort.id}`,
    };

    let anyOk = false;
    for (const sub of subs) {
      if (deadEndpoints.has(sub.endpoint)) continue;
      attempts++;
      const result = await sendWebPush(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        vapidKeys,
      );
      if (result.ok) {
        anyOk = true;
        continue;
      }
      if (result.dead) {
        // The browser uninstalled the subscription — prune, not a failure.
        deadEndpoints.add(sub.endpoint);
        attempts--;
        continue;
      }
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

  const failShare = attempts ? errors.length / attempts : 0;
  const ok = failShare <= FAIL_SHARE_LIMIT;
  return {
    ok,
    reason: ok ? undefined : "too_many_push_failures",
    fired,
    attempts,
    fail_share: Math.round(failShare * 100) / 100,
    noDevice,
    skipped,
    expiredPruned,
    // Devices whose subscription was made with a different VAPID public
    // key than the one this deploy signs with. Non-zero after a key
    // rotation is expected until those users re-enable alerts; non-zero
    // on a fresh deploy means the browser and server keys do not match.
    vapidMismatch: vapidMismatchEndpoints.size,
    errors: errors.slice(0, 20),
  };
}

export async function GET(request: Request) {
  return runCron(request, "check-snow-alerts", maxDuration, runAlerts);
}
