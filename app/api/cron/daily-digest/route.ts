// Digest email cron.
//
// Vercel cron hits this at 13:00 UTC (8 AM Eastern), after the snow and
// weather refreshes. For each enabled digest_subscriptions row whose
// cadence is due we:
//   1. Load the user's favorites, the resort rows and the weather_cache
//      snapshot, plus the display name from profiles.
//   2. Decide with lib/alertRules.decideDigest whether the mail is worth
//      sending: nothing to show, every favorite off-season with no new
//      snow, or the best favorite under the user's threshold → skip, and
//      leave last_sent_at alone so the next run re-evaluates.
//   3. Build HTML + plain-text via lib/emailTemplates.
//   4. POST to Resend with List-Unsubscribe / List-Unsubscribe-Post headers
//      pointing at the signed one-click unsubscribe endpoint.
//   5. Update last_sent_at on success only.
//
// Cadence rules:
//   * 'daily'  → due if last_sent_at is null or > 22 h ago.
//   * 'weekly' → due only on Monday UTC, and if last_sent_at is null or
//                > 6 days ago. Threshold compares the 7-day snow total.
//   * anything else → not handled here (snow alerts are the push cron).
//
// Env vars:
//   CRON_SECRET                  matches the Vercel cron header; also the
//                                fallback signing secret for unsubscribe
//                                tokens (DIGEST_SECRET overrides)
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    reads across users
//   RESEND_API_KEY               outbound mail
//   RESEND_FROM_EMAIL            optional sender override
//   NEXT_PUBLIC_SITE_URL         absolute links in the email
//
// Without RESEND_API_KEY we 503 so a fresh deploy fails loudly in the
// cron log rather than pretending to send.

import { NextResponse } from "next/server";
import { passLabel } from "@/lib/passColors";
import { createClient } from "@supabase/supabase-js";
import { buildDigestEmail, type FavoriteResortSnapshot } from "@/lib/emailTemplates";
import {
  decideDigest,
  isReportFresh,
  isResortOperating,
  snowSourceForStatus,
  statusLabel,
  surfaceLabelForCode,
  type DigestFrequency,
  type DigestVerdict,
} from "@/lib/alertRules";
import {
  digestSigningSecret,
  makeUnsubscribeToken,
  unsubscribeUrl as buildUnsubscribeUrl,
} from "@/lib/digestUnsubscribe";

export const runtime = "nodejs";
export const maxDuration = 300;

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "Wynla <digest@wynla.app>";
const SITE_BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app").replace(/\/+$/, "");

type DigestSub = {
  id: number;
  user_id: string;
  email: string;
  frequency: string;
  threshold_in: number | null;
  last_sent_at: string | null;
  enabled: boolean;
};

type ResortRow = {
  id: number;
  slug: string;
  name: string;
  state: string;
  passes: string[] | null;
  snow_new_24h_in: number | null;
  snow_new_7d_in: number | null;
  snow_report_status: string | null;
  snow_report_updated_at: string | null;
  current_surface_class: string | null;
};

type WeatherRow = {
  resort_id: number;
  temp_high_f: number | null;
  conditions_short: string | null;
  snow_24h_in: number | null;
};

const RESORT_COLUMNS =
  "id, slug, name, state, passes, snow_new_24h_in, snow_new_7d_in, snow_report_status, snow_report_updated_at, current_surface_class";

function isDue(sub: DigestSub, nowUtc: Date): boolean {
  if (!sub.enabled) return false;
  const last = sub.last_sent_at ? new Date(sub.last_sent_at).getTime() : 0;
  const ageHours = (nowUtc.getTime() - last) / 36e5;
  if (sub.frequency === "daily") return ageHours > 22;
  if (sub.frequency === "weekly") {
    if (nowUtc.getUTCDay() !== 1) return false; // Monday only
    return ageHours > 24 * 6;
  }
  return false;
}

function passesLabel(r: ResortRow): string {
  if (!r.passes || r.passes.length === 0) return passLabel("independent");
  return r.passes.map(passLabel).join(" / ");
}

function toSnapshot(r: ResortRow, w: WeatherRow | undefined, now: Date): FavoriteResortSnapshot {
  const operating = isResortOperating(r.snow_report_status);
  // Prefer the resort's own report; fall back to the NWS forecast number
  // only when there is no report at all, and say so via snowSource.
  const hasReport = r.snow_new_24h_in != null;
  const forecastSnow = w?.snow_24h_in != null ? Number(w.snow_24h_in) : null;
  return {
    name: r.name,
    slug: r.slug,
    state: r.state,
    tempHigh: w?.temp_high_f ?? null,
    conditions: w?.conditions_short ?? null,
    snowNew24h: hasReport ? r.snow_new_24h_in : forecastSnow,
    snowNew7d: r.snow_new_7d_in,
    snowSource: hasReport ? snowSourceForStatus(r.snow_report_status) : "Forecast",
    statusLabel: statusLabel(r.snow_report_status),
    operating,
    surfaceLabel: surfaceLabelForCode(r.current_surface_class),
    reportFresh: hasReport ? isReportFresh(r.snow_report_updated_at, now) : forecastSnow != null,
    primaryPass: passesLabel(r),
  };
}

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  text: string,
  unsubscribe: string,
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
        text,
        // RFC 8058 one-click unsubscribe: Gmail / Yahoo require both
        // headers for bulk senders, and their "Unsubscribe" button POSTs
        // to the URL with List-Unsubscribe=One-Click in the body.
        headers: {
          "List-Unsubscribe": `<${unsubscribe}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${body.slice(0, 200)}` };
    }
    const j = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: j.id };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: a missing secret must NOT make this service-role endpoint
  // publicly invokable (it can blast digest emails to all subscribers).
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
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    return NextResponse.json(
      { ok: false, reason: "missing RESEND_API_KEY — set it in Vercel env to enable digest sends" },
      { status: 503 },
    );
  }
  const signingSecret = digestSigningSecret();
  if (!signingSecret) {
    // Unreachable while CRON_SECRET is required above, but the helper's
    // contract allows null and a digest without a working unsubscribe
    // link must never go out.
    return NextResponse.json({ ok: false, reason: "no signing secret for unsubscribe links" }, { status: 503 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Enabled subscriptions; cadence filtered locally so skips are logged.
  const { data: subsData, error: subsErr } = await supabase
    .from("digest_subscriptions")
    .select("id, user_id, email, frequency, threshold_in, last_sent_at, enabled")
    .eq("enabled", true);
  if (subsErr) {
    return NextResponse.json({ ok: false, reason: subsErr.message }, { status: 500 });
  }
  const subs = (subsData ?? []) as DigestSub[];

  const now = new Date();
  const dueSubs = subs.filter((s) => isDue(s, now));
  if (dueSubs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: subs.length, reason: "nothing due" });
  }

  // 2. Favorites + display names for every due user, two bulk queries.
  const userIds = dueSubs.map((s) => s.user_id);
  const [{ data: favData, error: favErr }, { data: profData }] = await Promise.all([
    supabase.from("favorites").select("user_id, resort_id").in("user_id", userIds),
    supabase.from("profiles").select("id, display_name").in("id", userIds),
  ]);
  if (favErr) {
    return NextResponse.json({ ok: false, reason: favErr.message }, { status: 500 });
  }
  const favsByUser = new Map<string, number[]>();
  for (const row of (favData ?? []) as Array<{ user_id: string; resort_id: number }>) {
    const arr = favsByUser.get(row.user_id) ?? [];
    arr.push(row.resort_id);
    favsByUser.set(row.user_id, arr);
  }
  const nameByUser = new Map<string, string>();
  for (const p of (profData ?? []) as Array<{ id: string; display_name: string | null }>) {
    const n = (p.display_name ?? "").trim();
    if (n) nameByUser.set(p.id, n);
  }

  const allResortIds = Array.from(new Set(Array.from(favsByUser.values()).flat()));

  // 3. Resort + weather snapshots. Two flat queries instead of a nested
  //    select keeps the typing simple and avoids PostgREST embedding
  //    quirks with the SMALLINT snow columns.
  const resortMap = new Map<number, ResortRow>();
  const weatherMap = new Map<number, WeatherRow>();
  if (allResortIds.length > 0) {
    const { data: resortsData, error: resortsErr } = await supabase
      .from("resorts")
      .select(RESORT_COLUMNS)
      .in("id", allResortIds);
    if (resortsErr) {
      return NextResponse.json({ ok: false, reason: resortsErr.message }, { status: 500 });
    }
    for (const r of (resortsData ?? []) as ResortRow[]) resortMap.set(r.id, r);

    const { data: weatherData } = await supabase
      .from("weather_cache")
      .select("resort_id, temp_high_f, conditions_short, snow_24h_in")
      .in("resort_id", allResortIds);
    for (const w of (weatherData ?? []) as WeatherRow[]) weatherMap.set(w.resort_id, w);
  }

  // 4. Users with zero favorites get a platform-wide recap of OPEN resorts
  //    reporting new snow. Off-season this list is empty and they are
  //    skipped, which is the point: no "nothing happened" mail.
  let recapResorts: ResortRow[] = [];
  const recapWeather = new Map<number, WeatherRow>();
  const anyUserHasZeroFavs = dueSubs.some((s) => (favsByUser.get(s.user_id)?.length ?? 0) === 0);
  if (anyUserHasZeroFavs) {
    const { data: topData } = await supabase
      .from("resorts")
      .select(RESORT_COLUMNS)
      .in("snow_report_status", ["open", "limited"])
      .gt("snow_new_24h_in", 0)
      .order("snow_new_24h_in", { ascending: false })
      .limit(5);
    recapResorts = ((topData ?? []) as ResortRow[]).filter((r) =>
      isReportFresh(r.snow_report_updated_at, now),
    );
    if (recapResorts.length > 0) {
      const { data: rw } = await supabase
        .from("weather_cache")
        .select("resort_id, temp_high_f, conditions_short, snow_24h_in")
        .in("resort_id", recapResorts.map((r) => r.id));
      for (const w of (rw ?? []) as WeatherRow[]) recapWeather.set(w.resort_id, w);
    }
  }

  // 5. Send loop. Sequential is fine at our volumes (Resend allows ~10
  //    req/s). A send failure is logged per user and does not abort the run.
  let sent = 0;
  const skipped: Record<Exclude<DigestVerdict, "send">, number> = {
    empty: 0,
    off_season: 0,
    below_threshold: 0,
  };
  const errors: Array<{ user_id: string; error: string }> = [];
  const today = now.toISOString().slice(0, 10);
  const preferencesUrl = `${SITE_BASE}/account/digest`;

  for (const sub of dueSubs) {
    const favIds = favsByUser.get(sub.user_id) ?? [];
    const isRecap = favIds.length === 0;
    const rows: Array<[ResortRow, WeatherRow | undefined]> = isRecap
      ? recapResorts.map((r) => [r, recapWeather.get(r.id)])
      : favIds.flatMap((rid) => {
          const r = resortMap.get(rid);
          return r ? [[r, weatherMap.get(rid)] as [ResortRow, WeatherRow | undefined]] : [];
        });
    const snapshots = rows.map(([r, w]) => toSnapshot(r, w, now));

    const frequency: DigestFrequency = sub.frequency === "weekly" ? "weekly" : "daily";
    const { verdict } = decideDigest(
      snapshots.map((s) => ({
        operating: s.operating,
        snowNew24hIn: s.reportFresh ? s.snowNew24h : null,
        snowNew7dIn: s.reportFresh ? s.snowNew7d : null,
      })),
      sub.threshold_in,
      frequency,
    );
    if (verdict !== "send") {
      // Not bumping last_sent_at: the same subscription is re-evaluated
      // next run, so the first morning that clears the bar gets its mail.
      skipped[verdict]++;
      continue;
    }

    const unsubscribeUrl = buildUnsubscribeUrl(SITE_BASE, makeUnsubscribeToken(sub.id, signingSecret));
    const { subject, html, text } = buildDigestEmail({
      userName: nameByUser.get(sub.user_id) ?? null,
      favoriteResortSnapshots: snapshots,
      isRecap,
      unsubscribeUrl,
      preferencesUrl,
      date: today,
      frequency,
    });

    const result = await sendViaResend(RESEND_API_KEY, sub.email, subject, html, text, unsubscribeUrl);
    if (!result.ok) {
      errors.push({ user_id: sub.user_id, error: result.error ?? "unknown" });
      continue;
    }

    await supabase
      .from("digest_subscriptions")
      .update({ last_sent_at: new Date().toISOString() })
      .eq("id", sub.id);
    sent++;
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped,
    errors,
    eligible: dueSubs.length,
    totalEnabled: subs.length,
  });
}
