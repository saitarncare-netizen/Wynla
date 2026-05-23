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
