// profiles.pass_product vocabulary: "any", "<family>" or
// "<family>:<productKey>" (see handoff-docs/sql/2026-09-23-go.sql). One
// place to parse and print it so the opt-in API and the Thursday cron
// cannot disagree.

import { isPassFamily, productsFor, type PassFamily } from "@/lib/passAccess";
import { passLabel } from "@/lib/passColors";

export type PassChoice = { family: PassFamily | null; product: string | null };

export const ANY_PASS = "any";

export function formatPassProduct(choice: PassChoice): string {
  if (!choice.family) return ANY_PASS;
  return choice.product ? `${choice.family}:${choice.product}` : choice.family;
}

/** null when the stored string is not something we can rank for. */
export function parsePassProduct(value: string | null | undefined): PassChoice | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === ANY_PASS) return { family: null, product: null };
  const [family, product] = v.split(":", 2);
  if (!isPassFamily(family)) return null;
  if (!product) return { family, product: null };
  return productsFor(family).some((p) => p.productKey === product) ? { family, product } : null;
}

/** "Ikon Base Pass", "Epic Pass", "any pass or lift ticket". */
export function passChoiceLabel(choice: PassChoice): string {
  if (!choice.family) return "any pass or lift ticket";
  if (!choice.product) return passLabel(choice.family);
  return productsFor(choice.family).find((p) => p.productKey === choice.product)?.product ?? passLabel(choice.family);
}
