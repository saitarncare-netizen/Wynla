// Account index page. Auth-required.
//
// Renders four islands:
//   1. ProfileForm     — edit display_name + preferred_origin (29 cities)
//   2. Your stuff      — Today / Saturday / Favorites / Trips / Digest / Install
//   3. SignOutButtons  — this browser, or every device
//   4. DeleteAccount   — permanent self-service account deletion
//
// All writes go through /api/account/* or the user's own Supabase
// session; the service-role key never reaches the browser.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { launchCityByCode } from "@/lib/origins";
import ProfileForm from "./ProfileForm";
import DeleteAccount from "./DeleteAccount";
import SignOutButtons from "./SignOutButtons";
import { InstallRow } from "@/components/InstallPrompt";
import Card from "@/components/ui/Card";
import Icon, { type IconName } from "@/components/icons/Icon";
import PageHeader from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

type ProfileRow = {
  display_name: string | null;
  preferred_origin: string | null;
};

const ROW_CLASS =
  "flex min-h-11 items-center justify-between py-3 text-sm text-wn-charcoal transition hover:text-wn-navy";

function Row({ href, icon, label, hint }: { href: string; icon: IconName; label: string; hint?: string }) {
  return (
    <li>
      <Link href={href} className={ROW_CLASS}>
        <span className="min-w-0">
          <span className="inline-flex items-center gap-2 font-medium">
            <Icon name={icon} className="h-4 w-4 shrink-0 text-wn-navy" /> {label}
          </span>
          {hint && <span className="block text-xs text-wn-muted">{hint}</span>}
        </span>
        <span className="text-wn-subtle" aria-hidden="true">
          →
        </span>
      </Link>
    </li>
  );
}

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, preferred_origin")
    .eq("id", user.id)
    .maybeSingle();
  const p = (profile as ProfileRow | null) ?? null;
  // /go only answers for its launch cities; a saved Denver default opens
  // the page without a city rather than with one it would reject.
  const goCity = launchCityByCode(p?.preferred_origin);

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        title="Account"
        width="max-w-2xl"
        description={
          <>
            Signed in as <span className="font-semibold text-wn-charcoal">{user.email ?? "—"}</span>
          </>
        }
      />
      <div className="mx-auto max-w-2xl space-y-8 px-4 pb-10 pt-6 sm:px-6 sm:pb-16">
        {/* Profile editor */}
        <Card padding="lg">
          <section>
            <h2 className="mb-4 text-base font-bold text-wn-navy">Profile</h2>
            <ProfileForm
              initialDisplayName={p?.display_name ?? ""}
              initialPreferredOrigin={p?.preferred_origin ?? ""}
            />
          </section>
        </Card>

        {/* Quick links */}
        <Card padding="lg">
          <section>
          <h2 className="mb-3 text-base font-bold text-wn-navy">Your stuff</h2>
          <ul className="divide-y divide-wn-line">
            <Row href="/today" icon="sun" label="Today" hint="Go / Wait / Skip for your favorites" />
            <Row
              href={goCity ? `/go?city=${goCity.code}` : "/go"}
              icon="mountain"
              label="Saturday"
              hint={goCity ? `Where to ride this Saturday from ${goCity.short}` : "Where to ride this Saturday"}
            />
            <Row href="/favorites" icon="heart" label="Favorites" />
            <Row href="/trips" icon="skier" label="My trips" />
            <Row href="/account/digest" icon="bell" label="Email digest" hint="Daily or weekly snow email, plus the Thursday picks" />
            {/* Permanent install entry point for people who dismissed the
                nudge. Renders nothing inside the installed app. */}
            <InstallRow />
            {/* Admin-only feedback inbox — only shown to the founder. */}
            {user.email === "saitarncare@gmail.com" && (
              <Row href="/account/feedback" icon="list" label="Feedback inbox" />
            )}
          </ul>
          </section>
        </Card>

        {/* Sessions */}
        <Card padding="lg">
          <section>
            <h2 className="mb-3 text-base font-bold text-wn-navy">Sessions</h2>
            <SignOutButtons />
          </section>
        </Card>

        {/* Danger zone — kept visually separate + low-contrast until hover so
            it's never the most prominent thing on the page. */}
        <section className="rounded-wn-md border border-wn-danger/30 bg-white p-5 shadow-wn-sm sm:p-6">
          <h2 className="mb-1 text-base font-bold text-wn-danger">Delete account</h2>
          <p className="mb-4 text-xs text-wn-muted">
            Permanently removes your favorites, trips, snow alerts, digest subscription and any
            Stripe subscription. This can&rsquo;t be undone.
          </p>
          <DeleteAccount />
        </section>
      </div>
    </main>
  );
}
