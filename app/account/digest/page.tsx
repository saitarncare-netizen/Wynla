// Email digest preferences. Auth-required.
//
// Lets the user choose between daily / weekly cadence, set a minimum
// "new snow" threshold (the cron skips the email when no favorite clears
// it), and unsubscribe. Sending happens in `/api/cron/daily-digest`; this
// page edits the digest_subscriptions row via `/api/digest/subscribe`.
//
// `?unsubscribe=1` (older emails linked here) opens the page with the
// unsubscribe action highlighted. Newer emails use the signed one-click
// link at /api/digest/unsubscribe, which needs no session.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/cronRun";
import { launchCityByCode } from "@/lib/origins";
import { parsePassProduct, passChoiceLabel } from "@/lib/saturday/passProduct";
import DigestPreferencesForm from "./DigestPreferencesForm";

export const dynamic = "force-dynamic";

type DigestRow = {
  frequency: "daily" | "weekly";
  threshold_in: number;
  enabled: boolean;
  last_sent_at: string | null;
};

export default async function AccountDigestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/login?next=/account/digest");
  }

  const params = await searchParams;
  const wantsUnsubscribe = params.unsubscribe === "1";

  const [{ data: row }, prof] = await Promise.all([
    supabase
      .from("digest_subscriptions")
      .select("frequency, threshold_in, enabled, last_sent_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("preferred_origin, pass_product").eq("id", user.id).maybeSingle(),
  ]);

  const sub = (row as DigestRow | null) ?? null;

  // The Thursday Saturday-picks email is a separate list that lives in
  // profiles.pass_product (handoff-docs/sql/2026-09-23-go.sql). Shown
  // here so the two emails are not a surprise to each other.
  const profile = prof.error && isMissingSchemaError(prof.error) ? null : (prof.data as { preferred_origin?: string | null; pass_product?: string | null } | null);
  const thursdayChoice = parsePassProduct(profile?.pass_product);
  const thursdayCity = launchCityByCode(profile?.preferred_origin);
  const thursdayHref = thursdayCity ? `/go?city=${encodeURIComponent(thursdayCity.code)}` : "/go";

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <header className="mb-6 mt-6">
          <h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">
            Email digest
          </h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            A snow and conditions summary for your favorited resorts, sent to{" "}
            <span className="font-semibold">{user.email ?? "your account email"}</span>.
          </p>
        </header>

        <section className="rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <DigestPreferencesForm
            initialEnabled={sub?.enabled ?? false}
            initialFrequency={sub?.frequency ?? "daily"}
            initialThreshold={sub?.threshold_in ?? 0}
            lastSentAt={sub?.last_sent_at ?? null}
            highlightUnsubscribe={wantsUnsubscribe && (sub?.enabled ?? false)}
          />
        </section>

        <p className="mt-4 text-xs text-wn-charcoal/55">
          You can unsubscribe any time. Your favorites and snow alerts stay as they are.
        </p>

        <section className="mt-6 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-bold text-wn-navy">Thursday picks email</h2>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            {thursdayChoice
              ? `On: the three best mountains for ${passChoiceLabel(thursdayChoice)} from ${thursdayCity?.name ?? "your city"}, every Thursday. Separate from the digest above, with its own unsubscribe link.`
              : "Off. A separate weekly email with the three best mountains for your pass and city this Saturday."}
          </p>
          <Link
            href={thursdayHref}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-wn-charcoal/20 bg-white px-4 text-sm font-semibold text-wn-navy hover:border-wn-navy"
          >
            {thursdayChoice ? "Change or stop it on the Saturday page" : "Set it up on the Saturday page"}
          </Link>
        </section>
      </div>
    </main>
  );
}
