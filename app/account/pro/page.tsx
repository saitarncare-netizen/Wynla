// Wynla Pro manage page. Auth-required.
// Shows the subscription's current status + next billing date, and
// hands off cancellation / payment-method updates to the Stripe
// Customer Portal (Stripe handles all the legal UX, dunning, etc.).
//
// On `?status=success` we surface a confirmation banner — the webhook
// upserts pro_subscriptions, but Stripe's redirect happens before the
// webhook fires in some cases, so this page may briefly show
// "Processing…" until the row exists. That's intentional.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProStatus, isStripeConfigured } from "@/lib/pro";
import PortalButton from "./PortalButton";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Free trial",
  past_due: "Past due",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  unpaid: "Unpaid",
};

export default async function AccountProPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await props.searchParams;
  const justSucceeded = sp.status === "success";

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/login?next=/account/pro");
  }

  const pro = await getProStatus(user.id);
  const configured = isStripeConfigured();

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <header className="mt-6 mb-6">
          <h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">
            Wynla Pro
          </h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Manage your subscription.
          </p>
        </header>

        {justSucceeded && (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            🎉 You&apos;re in. If anything looks off below, give it a few
            seconds — Stripe confirms in the background.
          </div>
        )}

        <section className="rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          {!pro ? (
            <div>
              <div className="text-sm font-semibold text-wn-charcoal/70">
                No active subscription
              </div>
              <p className="mt-1 text-sm text-wn-charcoal/65">
                You&apos;re on the free plan. Upgrade to unlock alerts,
                history, and bigger comparisons.
              </p>
              <Link
                href="/pro"
                className="mt-4 inline-flex rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
              >
                See Pro plans
              </Link>
            </div>
          ) : (
            <>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label="Status" value={STATUS_LABEL[pro.status] ?? pro.status} />
                <Row
                  label="Next billing date"
                  value={
                    pro.current_period_end
                      ? pro.current_period_end.toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"
                  }
                />
              </dl>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-wn-charcoal/10 pt-5">
                {configured ? (
                  <PortalButton />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="rounded-md bg-wn-charcoal/15 px-4 py-2 text-sm font-semibold text-wn-charcoal/60"
                  >
                    Manage payment method
                  </button>
                )}
                <Link
                  href="/pro"
                  className="rounded-md border border-wn-charcoal/20 px-4 py-2 text-sm font-semibold text-wn-charcoal/80 transition hover:bg-wn-charcoal/5"
                >
                  See Pro features
                </Link>
              </div>
              <p className="mt-3 text-xs text-wn-charcoal/55">
                Cancellation, plan changes, and payment method updates are
                handled in the secure Stripe portal.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-wn-charcoal/55">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-wn-navy">{value}</dd>
    </div>
  );
}
