// Wynla Pro manage page. Auth-required.
// Shows the subscription's current status + next billing date, and
// hands off cancellation / payment-method updates to the Stripe
// Customer Portal (Stripe handles all the legal UX, dunning, etc.).
//
// On `?status=success` we surface a confirmation banner — the webhook
// upserts pro_subscriptions, but Stripe's redirect happens before the
// webhook fires in some cases, so this page may briefly show
// "Processing…" until the row exists. That's intentional.

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProStatus, isStripeConfigured } from "@/lib/pro";
import PortalButton from "./PortalButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";

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
    <main className="min-h-dvh bg-wn-offwhite">
      {/* Back to Account comes from the AppShell bar (lib/nav backLinkFor). */}
      {/* Phones: back to Account comes from the AppShell bar (md:hidden). */}
      <PageHeader
        title="Wynla Pro"
        width="max-w-2xl"
        description="Manage your subscription."
        back={{ href: "/account", label: "Account" }}
        className="max-md:[&>div>a:first-child]:hidden"
      />
      <div className="mx-auto max-w-2xl px-4 pb-10 pt-6 sm:px-6 sm:pb-16">
        {justSucceeded && (
          <Notice tone="success" className="mb-6">
            🎉 You&apos;re in. If anything looks off below, give it a few
            seconds — Stripe confirms in the background.
          </Notice>
        )}

        <Card padding="lg">
          {!pro ? (
            <div>
              <div className="text-sm font-semibold text-wn-muted">
                No active subscription
              </div>
              <p className="mt-1 text-sm text-wn-muted">
                You&apos;re on the free plan. Upgrade to unlock alerts,
                history, and bigger comparisons.
              </p>
              <Button href="/pro" className="mt-4">
                See Pro plans
              </Button>
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

              <div className="mt-5 flex flex-wrap items-start gap-2 border-t border-wn-line pt-5">
                {configured ? (
                  <PortalButton />
                ) : (
                  <Button disabled>Manage payment method</Button>
                )}
                <Button variant="secondary" href="/pro">
                  See Pro features
                </Button>
              </div>
              <p className="mt-3 text-xs text-wn-muted">
                Cancellation, plan changes, and payment method updates are
                handled in the secure Stripe portal.
              </p>
            </>
          )}
        </Card>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-eyebrow font-semibold uppercase text-wn-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-wn-navy">{value}</dd>
    </div>
  );
}
