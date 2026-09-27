// Thursday picks email cron.
//
// Vercel Hobby crons run daily at most, so this is scheduled every day at
// 13:30 UTC (after the weather and snow refreshes) and exits unless it is
// Thursday in America/New_York. `?force=1` (with the cron secret) sends
// on any day, for testing and for a manual re-send after an outage.
//
// Subscribers = profiles rows with preferred_origin + pass_product set
// (handoff-docs/sql/2026-09-23-go.sql). pass_product IS the consent for
// this list; the digest_subscriptions row only supplies the address and
// the id the signed unsubscribe link is minted from, and its `enabled`
// flag (the weekly favorites digest, a separate opt-in) is not consulted.
// The unsubscribe link carries list=thursday so one click clears
// pass_product and nothing else. For each distinct (city, pass product)
// we load the same data /go loads and run the same lib/saturday/rank.ts,
// so the email and the page never disagree. One row per combo is written
// to saturday_predictions when that table exists, so the picks can be
// graded later.
//
// Same-day dedupe: a second run on a Thursday (redeploy, manual trigger
// without force) is skipped when cron_runs shows a thursday-picks run
// today that sent mail. Without cron_runs there is no dedupe; the daily
// schedule makes a double run unlikely.
//
// Runs under lib/cronRun.ts: auth, run history, one JSON log line, HTTP
// 500 when not ok.

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingSchemaError, runCron, type CronContext, type CronSummary } from "@/lib/cronRun";
import { sendListEmail } from "@/lib/email/resendClient";
import { buildThursdayPicksEmail } from "@/lib/email/templates/thursdayPicks";
import { digestSigningSecret, makeUnsubscribeToken, unsubscribeUrl as buildUnsubscribeUrl } from "@/lib/digestUnsubscribe";
import { launchCityByCode, type CityOrigin } from "@/lib/origins";
import { originTimeZone } from "@/lib/saturday/cities";
import { isThursdayIn, todayIso, upcomingWeekendDate } from "@/lib/saturday/dates";
import { loadSaturdayData, rankInputsFrom, type LoadedSaturdayData } from "@/lib/saturday/load";
import { parsePassProduct, passChoiceLabel, type PassChoice } from "@/lib/saturday/passProduct";
import { DEFAULT_MAX_DRIVE_HOURS, rankForSaturday, type RankResult } from "@/lib/saturday/rank";
import { goUrl, DEFAULT_MAX_HOURS } from "@/lib/saturday/url";

export const runtime = "nodejs";
export const maxDuration = 300;

const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app").replace(/\/+$/, "");
const FAIL_SHARE_LIMIT = 0.3;

type ProfileRow = {
  id: string;
  display_name: string | null;
  preferred_origin: string | null;
  pass_product: string | null;
};

type SubRow = { id: number; user_id: string; email: string };

let warnedMissingColumn = false;
let warnedMissingPredictions = false;

async function alreadySentToday(supabase: SupabaseClient, todayNy: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("cron_runs")
    .select("started_at, summary")
    .eq("job", "thursday-picks")
    .gte("started_at", `${todayNy}T00:00:00Z`)
    .order("started_at", { ascending: false })
    .limit(10);
  if (error) return false; // missing table or transient error: no dedupe
  return ((data ?? []) as Array<{ summary: { sent?: number } | null }>).some((r) => (r.summary?.sent ?? 0) > 0);
}

async function recordPrediction(
  supabase: SupabaseClient,
  originCode: string,
  passProduct: string,
  result: RankResult,
  recipients: number,
): Promise<void> {
  const picks = [...result.picks, ...result.runnersUp].map((p) => ({
    rank: p.rank,
    slug: p.resort.slug,
    score: p.score,
    breakdown: p.breakdown,
    expected_in: p.snow.expectedIn,
    surface: p.surface.dormant ? null : { code: p.surface.code, confidence: p.surface.confidence },
    drive_seconds: p.drive.seconds,
    confidence: p.confidence,
    wind: p.windHold.level,
    crowd: p.crowd.level,
  }));
  const { error } = await supabase.from("saturday_predictions").insert({
    source: "thursday-picks",
    origin_code: originCode,
    pass_product: passProduct,
    target_date: result.targetDate,
    horizon_days: result.horizonDays,
    mode: result.mode,
    picks,
    recipients,
  });
  if (error) {
    if (isMissingSchemaError(error)) {
      if (!warnedMissingPredictions) {
        warnedMissingPredictions = true;
        console.warn("[thursday-picks] saturday_predictions is missing; run handoff-docs/sql/2026-09-23-go.sql to log picks");
      }
    } else {
      console.warn(`[thursday-picks] saturday_predictions insert failed: ${error.message}`);
    }
  }
}

async function runThursdayPicks(request: Request, ctx: CronContext): Promise<CronSummary> {
  const { supabase, startedAt: now } = ctx;
  const force = new URL(request.url).searchParams.get("force") === "1";
  const todayNy = todayIso(now);
  if (!force && !isThursdayIn(now)) {
    return { ok: true, sent: 0, reason: `not Thursday in America/New_York (${todayNy})` };
  }
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, reason: "missing RESEND_API_KEY" };
  }
  const signingSecret = digestSigningSecret();
  if (!signingSecret) return { ok: false, reason: "no signing secret for unsubscribe links" };
  if (!force && (await alreadySentToday(supabase, todayNy))) {
    return { ok: true, sent: 0, reason: "already sent today" };
  }

  // 1. Opted-in profiles. A missing pass_product column means the
  //    migration has not run: nobody can have opted in, so exit ok.
  const { data: profData, error: profErr } = await supabase
    .from("profiles")
    .select("id, display_name, preferred_origin, pass_product")
    .not("preferred_origin", "is", null)
    .not("pass_product", "is", null);
  if (profErr) {
    if (isMissingSchemaError(profErr)) {
      if (!warnedMissingColumn) {
        warnedMissingColumn = true;
        console.warn("[thursday-picks] profiles.pass_product is missing; run handoff-docs/sql/2026-09-23-go.sql");
      }
      return { ok: true, sent: 0, reason: "profiles.pass_product missing; run handoff-docs/sql/2026-09-23-go.sql" };
    }
    return { ok: false, reason: `profiles: ${profErr.message}` };
  }
  const profiles = (profData ?? []) as ProfileRow[];
  if (profiles.length === 0) return { ok: true, sent: 0, reason: "no opted-in profiles" };

  // 2. The digest row carries the email and the unsubscribe id. Its
  //    enabled flag is the weekly digest's consent, not this list's, so
  //    it is deliberately not filtered on.
  const { data: subData, error: subErr } = await supabase
    .from("digest_subscriptions")
    .select("id, user_id, email")
    .in(
      "user_id",
      profiles.map((p) => p.id),
    );
  if (subErr) return { ok: false, reason: `digest_subscriptions: ${subErr.message}` };
  const subByUser = new Map<string, SubRow>();
  for (const s of (subData ?? []) as SubRow[]) if (s.email) subByUser.set(s.user_id, s);

  // 3. Group recipients by (city, pass product) so each ranking runs once.
  type Group = { origin: CityOrigin; choice: PassChoice; passProduct: string; users: ProfileRow[] };
  const groups = new Map<string, Group>();
  const skipped = { no_address: 0, bad_city: 0, bad_pass: 0 };
  for (const p of profiles) {
    if (!subByUser.has(p.id)) {
      // Opted in before the API created the row, or the row was deleted:
      // no address to send to and no id to sign an unsubscribe link.
      skipped.no_address++;
      continue;
    }
    const origin = launchCityByCode(p.preferred_origin);
    if (!origin) {
      skipped.bad_city++;
      continue;
    }
    const choice = parsePassProduct(p.pass_product);
    if (!choice) {
      skipped.bad_pass++;
      continue;
    }
    const key = `${origin.code}|${p.pass_product}`;
    const g = groups.get(key) ?? { origin, choice, passProduct: p.pass_product!, users: [] };
    g.users.push(p);
    groups.set(key, g);
  }
  if (groups.size === 0) {
    return { ok: true, sent: 0, skipped, reason: "no deliverable subscribers" };
  }

  // 4. Rank per group, sharing the loaded data per city.
  const dataByCity = new Map<string, Promise<LoadedSaturdayData>>();
  const loadFor = (origin: CityOrigin) => {
    let p = dataByCity.get(origin.code);
    if (!p) {
      p = loadSaturdayData(supabase, origin, DEFAULT_MAX_DRIVE_HOURS, now);
      dataByCity.set(origin.code, p);
    }
    return p;
  };

  let sent = 0;
  const errors: Array<{ user_id: string; error: string }> = [];
  const preferencesUrl = `${SITE_BASE}/go`;
  let timedOut = false;

  for (const g of groups.values()) {
    if (ctx.msLeft() < 20_000) {
      timedOut = true;
      break;
    }
    const tz = originTimeZone(g.origin);
    const targetDate = upcomingWeekendDate(now, "sat", tz);
    let result: RankResult;
    try {
      const data = await loadFor(g.origin);
      result = rankForSaturday({
        ...rankInputsFrom(data),
        passFamily: g.choice.family,
        product: g.choice.product,
        origin: { lat: g.origin.lat, lon: g.origin.lon, name: g.origin.name },
        targetDate,
        maxDriveHours: DEFAULT_MAX_DRIVE_HOURS,
        timeZone: tz,
        now,
      });
    } catch (e) {
      const msg = String((e as Error)?.message ?? e).slice(0, 200);
      for (const u of g.users) errors.push({ user_id: u.id, error: `load/rank: ${msg}` });
      continue;
    }
    const link = goUrl(
      {
        city: g.origin.code,
        lat: null,
        lng: null,
        pass: g.choice.family,
        product: g.choice.product,
        max: DEFAULT_MAX_HOURS,
        day: "sat",
      },
      SITE_BASE,
    );
    let groupSent = 0;
    for (const u of g.users) {
      if (ctx.msLeft() < 10_000) {
        timedOut = true;
        break;
      }
      const sub = subByUser.get(u.id)!;
      // list=thursday: the link (and the List-Unsubscribe header) stops
      // this email only, never the weekly digest.
      const unsubscribe = buildUnsubscribeUrl(SITE_BASE, makeUnsubscribeToken(sub.id, signingSecret), "thursday");
      const { subject, html, text } = buildThursdayPicksEmail({
        userName: u.display_name,
        cityName: g.origin.name,
        passLabel: passChoiceLabel(g.choice),
        result,
        goUrl: link,
        siteBase: SITE_BASE,
        unsubscribeUrl: unsubscribe,
        preferencesUrl,
        now,
      });
      const res = await sendListEmail({ to: sub.email, subject, html, text, unsubscribeUrl: unsubscribe });
      if (!res.ok) {
        errors.push({ user_id: u.id, error: res.error ?? "unknown" });
        continue;
      }
      sent++;
      groupSent++;
    }
    await recordPrediction(supabase, g.origin.code, g.passProduct, result, groupSent);
    if (timedOut) break;
  }

  const attempted = sent + errors.length;
  const failShare = attempted ? errors.length / attempted : 0;
  const ok = failShare <= FAIL_SHARE_LIMIT && !timedOut;
  return {
    ok,
    reason: !ok ? (timedOut ? "timed_out" : "too_many_send_failures") : undefined,
    sent,
    groups: groups.size,
    fail_share: Math.round(failShare * 100) / 100,
    skipped,
    errors: errors.slice(0, 20),
    forced: force,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  return runCron(request, "thursday-picks", maxDuration, (ctx) => runThursdayPicks(request, ctx));
}
