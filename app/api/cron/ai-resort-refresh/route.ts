// Stage 36 — daily AI resort enrichment cron.
//
// Runs every morning. For each active resort with a website_url:
//   1. fetch homepage HTML
//   2. send cleaned excerpt to Claude Haiku 3.5
//   3. extract ticket_price_adult_min/max + daily_note
//   4. update the resort row (only non-null fields)
//
// Budget guard: caps at 500 resorts per run + 4-way concurrency. Each
// call ~$0.001 → ~$0.50/day max. Skips resorts that don't have a
// website_url. Rate-limit aware (Anthropic 429s gracefully).
//
// Env vars:
//   CRON_SECRET                 matches Vercel cron Authorization header
//   ANTHROPIC_API_KEY           Anthropic API key (Claude Haiku access)
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   bypasses RLS to write resort rows

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  refreshResortViaAi,
  type AiResortInput,
  type AiResortOutcome,
} from "@/lib/aiResortRefresh";

export const runtime = "nodejs";
export const maxDuration = 800; // Vercel Pro: up to 900s; leave buffer
export const dynamic = "force-dynamic";

const CONCURRENCY = 4;
const MAX_RESORTS_PER_RUN = 500;

type ResortRow = {
  id: number;
  slug: string;
  name: string;
  state: string | null;
  website_url: string | null;
};

type RowUpdate = {
  ticket_price_adult_min?: number;
  ticket_price_adult_max?: number;
  ticket_price_currency?: string;
  ticket_price_updated_at?: string;
  daily_note?: string;
  daily_note_updated_at?: string;
};

type RunSummary = {
  ok: boolean;
  total: number;
  attempted: number;
  updated: number;
  skipped: number;
  failed: number;
  sample_failures: Array<{ slug: string; reason: string }>;
};

function unauthorized(reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status: 401 });
}

function serverError(reason: string): NextResponse {
  return NextResponse.json({ error: reason }, { status: 500 });
}

export async function GET(req: Request) {
  // 1. Auth — Vercel cron sends `Authorization: Bearer ${CRON_SECRET}`
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return serverError("CRON_SECRET not set");
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) return unauthorized("bad cron auth");

  // 2. Env — narrow to const after null-check so closures keep the
  // string type (TS doesn't preserve narrowing across nested functions).
  const anthKeyEnv = process.env.ANTHROPIC_API_KEY;
  if (!anthKeyEnv) return serverError("ANTHROPIC_API_KEY not set");
  const apiKey: string = anthKeyEnv;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return serverError("Supabase service env missing");
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 3. Load resorts to refresh — active + has a website URL
  const { data: resorts, error: loadErr } = await supabase
    .from("resorts")
    .select("id, slug, name, state, website_url")
    .eq("active", true)
    .not("website_url", "is", null)
    .order("id", { ascending: true })
    .limit(MAX_RESORTS_PER_RUN);

  if (loadErr) return serverError(`load failed: ${loadErr.message}`);
  const rows = (resorts ?? []) as ResortRow[];

  const summary: RunSummary = {
    ok: true,
    total: rows.length,
    attempted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    sample_failures: [],
  };

  // 4. Bounded concurrency pool — 4 in flight at a time
  let idx = 0;
  async function worker(): Promise<void> {
    while (true) {
      const i = idx++;
      if (i >= rows.length) return;
      const resort = rows[i];
      summary.attempted++;
      const outcome = await processOne(resort, apiKey);
      if (outcome.kind === "ok") {
        const update = buildUpdate(outcome);
        if (update) {
          const { error: upErr } = await supabase
            .from("resorts")
            .update(update)
            .eq("id", resort.id);
          if (upErr) {
            summary.failed++;
            recordFailure(summary, resort.slug, `db: ${upErr.message}`);
          } else {
            summary.updated++;
          }
        } else {
          // OK but extract had all-null values — nothing to write.
          summary.skipped++;
        }
      } else if (outcome.kind === "skip") {
        summary.skipped++;
      } else {
        summary.failed++;
        recordFailure(summary, resort.slug, outcome.reason);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  return NextResponse.json(summary);
}

async function processOne(
  resort: ResortRow,
  apiKey: string,
): Promise<AiResortOutcome> {
  const input: AiResortInput = {
    id: resort.id,
    slug: resort.slug,
    name: resort.name,
    state: resort.state,
    website_url: resort.website_url,
  };
  return refreshResortViaAi(input, apiKey);
}

/** Build the Supabase update row. Returns null when the extract has no
 *  usable values (avoids touching the row for no reason). */
function buildUpdate(
  outcome: Extract<AiResortOutcome, { kind: "ok" }>,
): RowUpdate | null {
  const e = outcome.extract;
  const now = new Date().toISOString();
  const update: RowUpdate = {};
  let hasAny = false;

  if (e.ticket_price_adult_min != null) {
    update.ticket_price_adult_min = e.ticket_price_adult_min;
    update.ticket_price_currency = "USD";
    update.ticket_price_updated_at = now;
    hasAny = true;
  }
  if (e.ticket_price_adult_max != null) {
    update.ticket_price_adult_max = e.ticket_price_adult_max;
    update.ticket_price_currency = "USD";
    update.ticket_price_updated_at = now;
    hasAny = true;
  }
  if (e.daily_note != null) {
    update.daily_note = e.daily_note;
    update.daily_note_updated_at = now;
    hasAny = true;
  }
  return hasAny ? update : null;
}

function recordFailure(
  summary: RunSummary,
  slug: string,
  reason: string,
): void {
  if (summary.sample_failures.length < 10) {
    summary.sample_failures.push({ slug, reason });
  }
}
