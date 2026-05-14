// Stage 32 — daily digest email cron.
//
// Vercel cron hits this at 13:00 UTC (8am EST, after refresh-weather has run).
// For each enabled digest_subscriptions row whose cadence is due, we:
//   1. Look up the user's favorites + the resort + weather_cache snapshot.
//   2. Build a personalised HTML email via lib/emailTemplates.
//   3. POST it to Resend (https://resend.com) using RESEND_API_KEY.
//   4. Update last_sent_at on success.
//
// Cadence rules:
//   * 'daily'  → eligible if last_sent_at is null or > 22h ago.
//   * 'weekly' → eligible only on Monday UTC, and if last_sent_at is null
//                or > 6 days ago.
//   * 'powder' → skipped here; the snow-alert cron handles those notifications.
//
// Env vars required:
//   CRON_SECRET                  (matches Vercel cron header)
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY    (service role — we read across users)
//   RESEND_API_KEY               (the only outbound dependency)
//   NEXT_PUBLIC_SITE_URL         (for resort and unsubscribe links)
//
// Without RESEND_API_KEY we 503 cleanly so a fresh deploy doesn't crash the
// cron run before the user has wired up the API key.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildDigestEmail, type FavoriteResortSnapshot } from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const maxDuration = 300;

const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? "Wynla <digest@wynla.com>";
const SITE_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.com";

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
  pass: string;
  snow_new_24h_in: number | null;
  snow_report_status: string | null;
};

type WeatherRow = {
  resort_id: number;
  temp_high_f: number | null;
  conditions_short: string | null;
  snow_24h_in: number | null;
};

function isDue(sub: DigestSub, nowUtc: Date): boolean {
  if (!sub.enabled) return false;
  const last = sub.last_sent_at ? new Date(sub.last_sent_at).getTime() : 0;
  const ageHours = (nowUtc.getTime() - last) / 36e5;
  if (sub.frequency === "daily") {
    return ageHours > 22;
  }
  if (sub.frequency === "weekly") {
    if (nowUtc.getUTCDay() !== 1) return false; // Monday only
    return ageHours > 24 * 6;
  }
  // 'powder' (and anything else) handled by the snow-alert cron.
  return false;
}

async function sendViaResend(
  apiKey: string,
  to: string,
  subject: string,
  html: string,
  text: string,
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
  // Same auth pattern as refresh-weather: Vercel cron sends Authorization: Bearer ${CRON_SECRET}.
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
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

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Eligible digest subscriptions (we filter cadence locally so we can
  //    log skipped rows for observability).
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

  // 2. Bulk-fetch favorites for all due users in one query (service-role
  //    bypasses RLS, so we get every user's favorites at once).
  const userIds = dueSubs.map((s) => s.user_id);
  const { data: favData, error: favErr } = await supabase
    .from("favorites")
    .select("user_id, resort_id")
    .in("user_id", userIds);
  if (favErr) {
    return NextResponse.json({ ok: false, reason: favErr.message }, { status: 500 });
  }
  const favsByUser = new Map<string, number[]>();
  for (const row of (favData ?? []) as Array<{ user_id: string; resort_id: number }>) {
    const arr = favsByUser.get(row.user_id) ?? [];
    arr.push(row.resort_id);
    favsByUser.set(row.user_id, arr);
  }

  const allResortIds = Array.from(
    new Set(((favData ?? []) as Array<{ resort_id: number }>).map((r) => r.resort_id)),
  );

  // 3. Resort + weather snapshots. Two queries instead of a Supabase nested-
  //    select so we keep type narrowing simple and avoid PostgREST embedding
  //    quirks with the SMALLINT snow columns.
  const resortMap = new Map<number, ResortRow>();
  const weatherMap = new Map<number, WeatherRow>();
  if (allResortIds.length > 0) {
    const { data: resortsData } = await supabase
      .from("resorts")
      .select("id, slug, name, state, pass, snow_new_24h_in, snow_report_status")
      .in("id", allResortIds);
    for (const r of (resortsData ?? []) as ResortRow[]) resortMap.set(r.id, r);

    const { data: weatherData } = await supabase
      .from("weather_cache")
      .select("resort_id, temp_high_f, conditions_short, snow_24h_in")
      .in("resort_id", allResortIds);
    for (const w of (weatherData ?? []) as WeatherRow[]) weatherMap.set(w.resort_id, w);
  }

  // 4. For users with zero favorites, prepare a "weekly recap" snapshot
  //    pulled from the top-snow resorts across the whole platform.
  let recapResorts: ResortRow[] = [];
  const recapWeather = new Map<number, WeatherRow>();
  const anyUserHasZeroFavs = dueSubs.some((s) => (favsByUser.get(s.user_id)?.length ?? 0) === 0);
  if (anyUserHasZeroFavs) {
    const { data: topData } = await supabase
      .from("resorts")
      .select("id, slug, name, state, pass, snow_new_24h_in, snow_report_status")
      .gt("snow_new_24h_in", 0)
      .order("snow_new_24h_in", { ascending: false })
      .limit(5);
    recapResorts = (topData ?? []) as ResortRow[];
    if (recapResorts.length > 0) {
      const { data: rw } = await supabase
        .from("weather_cache")
        .select("resort_id, temp_high_f, conditions_short, snow_24h_in")
        .in("resort_id", recapResorts.map((r) => r.id));
      for (const w of (rw ?? []) as WeatherRow[]) recapWeather.set(w.resort_id, w);
    }
  }

  // 5. Send loop. Resend's rate is generous (10 req/sec on free tier), so
  //    sequential is fine for the volumes we expect. We bail out per-user
  //    on send failure rather than aborting the whole run.
  let sent = 0;
  let skippedEmpty = 0;
  const errors: Array<{ user_id: string; error: string }> = [];
  const today = now.toISOString().slice(0, 10);

  for (const sub of dueSubs) {
    const favIds = favsByUser.get(sub.user_id) ?? [];
    const snapshots: FavoriteResortSnapshot[] = [];

    if (favIds.length > 0) {
      for (const rid of favIds) {
        const r = resortMap.get(rid);
        if (!r) continue;
        const w = weatherMap.get(rid);
        snapshots.push({
          name: r.name,
          slug: r.slug,
          state: r.state,
          tempHigh: w?.temp_high_f ?? null,
          conditions: w?.conditions_short ?? null,
          snowNew24h: r.snow_new_24h_in ?? w?.snow_24h_in ?? null,
          snowReportStatus: r.snow_report_status ?? null,
          primaryPass: r.pass,
        });
      }
    } else if (recapResorts.length > 0) {
      // Zero favorites → fall back to a platform-wide top-5 powder recap.
      for (const r of recapResorts) {
        const w = recapWeather.get(r.id);
        snapshots.push({
          name: r.name,
          slug: r.slug,
          state: r.state,
          tempHigh: w?.temp_high_f ?? null,
          conditions: w?.conditions_short ?? null,
          snowNew24h: r.snow_new_24h_in ?? null,
          snowReportStatus: r.snow_report_status ?? null,
          primaryPass: r.pass,
        });
      }
    }

    if (snapshots.length === 0) {
      // No favorites AND no platform-wide snow events → skip rather than
      // ship an empty email.
      skippedEmpty++;
      continue;
    }

    const unsubscribeUrl = `${SITE_BASE}/account/digest?unsubscribe=1`;
    const { subject, html, text } = buildDigestEmail({
      userName: null,
      favoriteResortSnapshots: snapshots,
      unsubscribeUrl,
      date: today,
    });

    const result = await sendViaResend(RESEND_API_KEY, sub.email, subject, html, text);
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
    skippedEmpty,
    errors,
    eligible: dueSubs.length,
    totalEnabled: subs.length,
  });
}
