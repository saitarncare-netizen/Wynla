// Season-status + snow-report job (replaces the OnTheSnow scraper, which
// died when OnTheSnow moved to React Server Components and whose terms
// forbade the use anyway).
//
// What it writes, per active resort:
//   - With a licensed feed (SNOCOUNTRY_API_KEY set): the resort-reported
//     numbers via lib/snowReport (base depth, 24 h / 48 h snow, lifts and
//     trails open), snow_report_status = 'reported', snow_report_updated_at
//     = the resort's own report time, currently_open from the reported
//     status when it is affirmative.
//   - Without a feed: snow_report_status = 'no_feed' and currently_open
//     derived from the season evidence we hold (lib/snowReport/seasonStatus)
//     — true / false only with evidence, null otherwise, never false by
//     default. The measured snow numbers for these resorts are written by
//     refresh-weather from NOHRSC / SNOTEL.
//
// Schedule: daily at 10:00 UTC on Hobby (before refresh-weather, whose
// surface classifier reads currently_open); every 30 min in season via
// the GitHub workflow once a feed exists. Pro cadence would be
// "*/15 4-10 * * *" local-morning polling per the SnoCountry guidance.
//
// Dry run: ?dryRun=1 calls the feed (using the public demo key when no
// real key is set), reports the normalized mapping in the JSON summary
// and writes NOTHING. Demo data never reaches the database.

import { runCron, type CronContext } from "@/lib/cronRun";
import { isGlobalOffSeasonNow } from "@/lib/seasonDates";
import type { NormalizedReport, ProviderResortRef } from "@/lib/snowReport/provider";
import { deriveSeasonStatus, type SeasonEvidence } from "@/lib/snowReport/seasonStatus";
import { getConfiguredProvider, SNOCOUNTRY_DEMO_KEY, SnoCountryProvider } from "@/lib/snowReport/snocountry";

export const runtime = "nodejs";
export const maxDuration = 120;

const REEVALUATE_AFTER_HOURS = 12;
const FAIL_SHARE_LIMIT = 0.3;

type ResortRow = ProviderResortRef &
  SeasonEvidence & {
    currently_open: boolean | null;
    snow_report_status: string | null;
    snow_report_updated_at: string | null;
  };

type ResortUpdate = {
  id: number;
  currently_open?: boolean | null;
  snow_report_status: string;
  snow_report_updated_at: string;
  snow_base_depth_in?: number | null;
  snow_new_24h_in?: number | null;
  snow_new_48h_in?: number | null;
  trails_open_today?: number | null;
  lifts_open_today?: number | null;
};

function reportedUpdate(r: ResortRow, rep: NormalizedReport, now: string): ResortUpdate {
  const u: ResortUpdate = {
    id: r.id,
    snow_report_status: "reported",
    snow_report_updated_at: rep.reportedAt ?? now,
    snow_base_depth_in: rep.baseDepthIn,
    snow_new_24h_in: rep.new24In,
    snow_new_48h_in: rep.new48In,
    trails_open_today: rep.trailsOpen,
    lifts_open_today: rep.liftsOpen,
  };
  if (rep.status === "open") u.currently_open = true;
  else if (rep.status === "closed" || rep.status === "off-season") u.currently_open = false;
  return u;
}

async function run(ctx: CronContext, request: Request) {
  const { supabase, startedAt } = ctx;
  const now = startedAt.toISOString();
  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const { data, error } = await supabase
    .from("resorts")
    .select(
      "id, slug, name, state, operating_status, season_open_text, season_close_text, typical_season_start, typical_season_end, season_end_date, currently_open, snow_report_status, snow_report_updated_at",
    )
    .eq("active", true);
  if (error || !data) return { ok: false, reason: `resorts: ${error?.message ?? "none"}` };
  const resorts = data as ResortRow[];

  // Feed: the configured provider, or the demo key for a dry run only.
  let provider = getConfiguredProvider();
  if (!provider && dryRun) provider = new SnoCountryProvider(SNOCOUNTRY_DEMO_KEY);
  const demo = provider instanceof SnoCountryProvider && provider.isDemoKey();
  let reports: NormalizedReport[] = [];
  let feedError: string | null = null;
  if (provider) {
    try {
      reports = await provider.getReports(resorts);
    } catch (e) {
      feedError = String((e as Error)?.message ?? e).slice(0, 200);
    }
  }
  const reportsById = new Map(reports.map((r) => [r.resortId, r]));
  const unmatched = provider instanceof SnoCountryProvider ? provider.lastUnmatched : [];

  // Build updates. Season-derived rows are only rewritten when something
  // changed or the last evaluation is older than REEVALUATE_AFTER_HOURS,
  // so a 30-minute cadence does not churn 425 rows every run.
  const updates: ResortUpdate[] = [];
  const counts = { reported: 0, no_feed: 0, open_true: 0, open_false: 0, open_null: 0, unchanged: 0 };
  const reasons: Record<string, number> = {};
  for (const r of resorts) {
    const rep = reportsById.get(r.id);
    if (rep) {
      counts.reported++;
      const u = reportedUpdate(r, rep, now);
      if (u.currently_open === true) counts.open_true++;
      else if (u.currently_open === false) counts.open_false++;
      else counts.open_null++;
      updates.push(u);
      continue;
    }
    counts.no_feed++;
    const verdict = deriveSeasonStatus(r, startedAt);
    reasons[verdict.reason.split(" (")[0]] = (reasons[verdict.reason.split(" (")[0]] ?? 0) + 1;
    if (verdict.currently_open === true) counts.open_true++;
    else if (verdict.currently_open === false) counts.open_false++;
    else counts.open_null++;
    const lastEval = r.snow_report_updated_at ? Date.parse(r.snow_report_updated_at) : 0;
    const stale = startedAt.getTime() - lastEval > REEVALUATE_AFTER_HOURS * 3_600_000;
    const changed = r.currently_open !== verdict.currently_open || r.snow_report_status !== "no_feed";
    if (!changed && !stale) {
      counts.unchanged++;
      continue;
    }
    updates.push({
      id: r.id,
      currently_open: verdict.currently_open,
      snow_report_status: "no_feed",
      snow_report_updated_at: now,
    });
  }

  let written = 0;
  let writeErrors = 0;
  if (!dryRun && !demo) {
    const BATCH = 20;
    for (let off = 0; off < updates.length; off += BATCH) {
      const results = await Promise.all(
        updates.slice(off, off + BATCH).map(({ id, ...cols }) => supabase.from("resorts").update(cols).eq("id", id)),
      );
      for (const res of results) {
        if (res.error) writeErrors++;
        else written++;
      }
    }
  }

  const inSeason = !isGlobalOffSeasonNow(startedAt);
  const feedDead = !!provider && !demo && !dryRun && reports.length === 0 && inSeason;
  const writeFailShare = updates.length ? writeErrors / updates.length : 0;
  const ok = !feedDead && writeFailShare <= FAIL_SHARE_LIMIT && !feedError;
  return {
    ok,
    reason: !ok ? (feedError ? `feed_error: ${feedError}` : feedDead ? "feed_returned_no_reports_in_season" : "db_errors") : undefined,
    dry_run: dryRun || demo,
    provider: provider?.name ?? null,
    demo_key: demo,
    reports: reports.length,
    unmatched_feed_items: unmatched.length,
    unmatched_sample: unmatched.slice(0, 10),
    counts,
    season_reasons: reasons,
    updates_prepared: updates.length,
    written,
    write_errors: writeErrors,
    ...(dryRun ? { report_sample: reports.slice(0, 5) } : {}),
  };
}

export async function GET(request: Request) {
  return runCron(request, "refresh-snow-conditions", maxDuration, (ctx) => run(ctx, request));
}
