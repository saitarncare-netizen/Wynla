// Stage 36 — AI-powered daily resort enrichment.
//
// Fetches each resort's homepage, hands a cleaned + truncated copy to
// Anthropic Claude Haiku, and extracts structured updates:
//   - ticket_price_adult_min  (lowest visible adult day-pass USD)
//   - ticket_price_adult_max  (highest visible)
//   - daily_note              (1-sentence highlight visible on the page today)
//
// Why Haiku: fast + cheap (~$0.001/resort), and ticket-price + note
// extraction doesn't need a frontier model. 451 resorts × $0.001 × 30 days
// = ~$13/month, well under the project's $100-500/mo budget.
//
// The scraper is intentionally lenient — most resorts won't have prices
// visible on the homepage. nulls are fine and don't overwrite existing
// values; only NON-NULL fields make it into the DB update.

const CLAUDE_MODEL = "claude-haiku-4-5";
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const USER_AGENT = "Wynla/1.0 (+https://wynla.app)";
const HTML_TIMEOUT_MS = 12_000;
const CLAUDE_TIMEOUT_MS = 25_000;
const MAX_HTML_CHARS = 12_000; // ~3K tokens — keeps each call cheap

export type AiResortExtract = {
  ticket_price_adult_min: number | null;
  ticket_price_adult_max: number | null;
  daily_note: string | null;
};

export type AiResortInput = {
  id: number;
  slug: string;
  name: string;
  state: string | null;
  website_url: string | null;
};

export type AiResortOutcome =
  | { kind: "ok"; extract: AiResortExtract; html_url: string }
  | { kind: "skip"; reason: string }
  | { kind: "fail"; reason: string };

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, cancel: () => clearTimeout(t) };
}

/** Strip <script>, <style>, <svg>, and excess whitespace. Keeps text +
 *  inline price tags + currency-laden runs. Tuned to fit ~10-12KB. */
function cleanHtml(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<head[\s\S]*?<\/head>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHomepage(
  websiteUrl: string,
): Promise<{ html: string; finalUrl: string } | null> {
  const { signal, cancel } = withTimeout(HTML_TIMEOUT_MS);
  try {
    const r = await fetch(websiteUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal,
    });
    if (!r.ok) return null;
    const html = await r.text();
    return { html, finalUrl: r.url };
  } catch {
    return null;
  } finally {
    cancel();
  }
}

const SYSTEM_PROMPT = `You are a precise data extractor for a US ski-resort database. Your job is to read HTML from a resort's homepage and extract three fields.

Rules:
- "ticket_price_adult_min" = lowest adult day-pass USD price visible on the page (e.g. weekday/early-season price). Pure number, no currency symbol. null if not visible.
- "ticket_price_adult_max" = highest adult day-pass USD price visible (e.g. peak holiday). Pure number. null if not visible OR if you only see one price (set both to same value only if explicitly labeled as the standard/single price).
- "daily_note" = a single brief sentence (max 90 chars) summarizing what is PROMINENTLY FEATURED on the page right now: opening status, special event today, weather/snow callout, or pass deal. Plain English. null if nothing notable.

Never invent prices or events. Prefer null over guessing.
Respond with raw JSON only, no markdown, no explanation.`;

function buildUserPrompt(resort: AiResortInput, cleanedHtml: string): string {
  return [
    `Resort: ${resort.name} (${resort.state ?? "US"})`,
    `Cleaned homepage HTML (truncated):`,
    `---`,
    cleanedHtml.slice(0, MAX_HTML_CHARS),
    `---`,
    `Extract JSON: { "ticket_price_adult_min": number|null, "ticket_price_adult_max": number|null, "daily_note": string|null }`,
  ].join("\n");
}

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
  error?: { message: string };
};

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string | null> {
  const { signal, cancel } = withTimeout(CLAUDE_TIMEOUT_MS);
  try {
    const r = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal,
    });
    if (!r.ok) {
      // Surface API errors so the cron handler can log them. 429 / 529 are
      // expected during rate spikes; non-fatal.
      return null;
    }
    const j = (await r.json()) as AnthropicResponse;
    const text = j.content?.[0]?.text;
    return text ?? null;
  } catch {
    return null;
  } finally {
    cancel();
  }
}

/** Parse Claude's response. Lenient — accepts wrapping ```json fences or
 *  whitespace. Returns null on any parse failure or out-of-range value. */
function parseExtract(text: string): AiResortExtract | null {
  // Strip code fences if Claude added them despite instructions.
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;
  const min = obj.ticket_price_adult_min;
  const max = obj.ticket_price_adult_max;
  const note = obj.daily_note;

  function priceOrNull(v: unknown): number | null {
    if (v == null) return null;
    if (typeof v !== "number" || !Number.isFinite(v)) return null;
    // Sanity bounds — US lift tickets range ~$20-$300. Reject obvious
    // junk (e.g. season-pass $1500 misclassified as day pass).
    if (v < 10 || v > 400) return null;
    return Math.round(v);
  }
  function noteOrNull(v: unknown): string | null {
    if (v == null) return null;
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    if (trimmed.length === 0) return null;
    return trimmed.slice(0, 120);
  }
  return {
    ticket_price_adult_min: priceOrNull(min),
    ticket_price_adult_max: priceOrNull(max),
    daily_note: noteOrNull(note),
  };
}

/** End-to-end refresh for a single resort. Returns `skip` when there's
 *  no homepage URL to scrape. Returns `fail` on fetch/Claude/parse error.
 *  Caller batches these with bounded concurrency in the cron handler. */
export async function refreshResortViaAi(
  resort: AiResortInput,
  apiKey: string,
): Promise<AiResortOutcome> {
  if (!resort.website_url) {
    return { kind: "skip", reason: "no website_url" };
  }
  const page = await fetchHomepage(resort.website_url);
  if (!page) return { kind: "fail", reason: "homepage fetch failed" };

  const cleaned = cleanHtml(page.html);
  if (cleaned.length < 200) {
    return { kind: "fail", reason: "page too thin after cleaning" };
  }

  const text = await callClaude(
    apiKey,
    SYSTEM_PROMPT,
    buildUserPrompt(resort, cleaned),
  );
  if (!text) return { kind: "fail", reason: "claude no response" };

  const extract = parseExtract(text);
  if (!extract) return { kind: "fail", reason: "claude parse failed" };

  return { kind: "ok", extract, html_url: page.finalUrl };
}
