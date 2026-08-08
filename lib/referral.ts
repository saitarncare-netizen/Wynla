// Founder-waitlist referral loop — deliberately SCHEMA-FREE.
//
// Instead of adding columns to pro_waitlist (which would need a migration
// the founder has to run by hand), we tag referred signups in the existing
// free-text `source` column as "founder:ref:<code>", where <code> is a
// short deterministic hash of the *referrer's* email. A direct signup stays
// "founder". This keeps the whole loop shippable without touching the DB
// schema, and a later migration can always backfill real columns from
// `source` if we want richer attribution.
//
// Counting:
//   • total founders  = source LIKE 'founder%'   (direct + referred)
//   • X referred by me = source = 'founder:ref:' + myCode

import { createHash } from "crypto";

export const REFERRAL_SOURCE_PREFIX = "founder:ref:";

// Deterministic, URL-safe code derived from a member's email. We never
// store it — we recompute it whenever we need it. 8 hex chars ≈ 4.3B
// space, so collisions are a non-issue at waitlist scale.
export function referralCode(email: string): string {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 8);
}

// Validate/normalize an incoming ?ref value before it ever touches the
// `source` column, so it can't smuggle arbitrary text. Returns null when
// it doesn't look like one of our codes.
export function sanitizeRef(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  return /^[a-z0-9]{4,16}$/.test(v) ? v : null;
}
