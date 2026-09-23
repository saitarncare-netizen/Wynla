// Lazy-init Resend client. Reads RESEND_API_KEY at first use, throws a
// clear error if missing. Wrapped because Resend's SDK throws at
// instantiation if no key, which would break next build's page-data
// collection — same pattern as lib/supabase.ts proxy.
import { Resend } from "resend";

let _client: Resend | null = null;

export function getResend(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY not configured");
  }
  _client = new Resend(key);
  return _client;
}

// Optional check used by callers that want to fail-soft when the key
// isn't set yet (e.g. /api/early — signup still succeeds even though
// the welcome email is skipped).
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

// Default From address. Override per-env via RESEND_FROM, e.g.
//   "Wynla <hello@wynla.app>"  (production, once domain is verified)
//   "onboarding@resend.dev"    (Resend's sandbox sender, pre-DNS)
export function getResendFrom(): string {
  return process.env.RESEND_FROM ?? "Wynla <hello@wynla.app>";
}

/** Where pipeline / health alerts go. Defaults to the founder's inbox. */
export function getAlertRecipient(): string {
  return process.env.PIPELINE_ALERT_EMAIL?.trim() || "saitarncare@gmail.com";
}

/**
 * Plain-text operational email (health alerts). Uses the raw REST
 * endpoint with a hard timeout instead of the SDK so a slow Resend
 * cannot stall a cron that is already near its deadline.
 */
export async function sendOpsEmail(opts: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not configured" };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10_000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: getResendFrom(), to: [opts.to], subject: opts.subject, text: opts.text }),
      signal: ac.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${body.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 160) };
  } finally {
    clearTimeout(timer);
  }
}
