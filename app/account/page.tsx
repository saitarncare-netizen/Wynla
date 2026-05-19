// Account index page. Auth-required. Stage 36.
//
// Renders three islands:
//   1. ProfileForm     — edit display_name + preferred_origin
//   2. Links to /account/digest, /account/pro, /favorites, /trips
//   3. DeleteAccount   — permanent self-service account deletion
//
// All writes go through /api/account/* — kept on the server so we never
// hand the service-role key to the browser.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ORIGINS } from "@/lib/origins";
import ProfileForm from "./ProfileForm";
import DeleteAccount from "./DeleteAccount";

export const dynamic = "force-dynamic";

type ProfileRow = {
  display_name: string | null;
  preferred_origin: string | null;
};

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

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link
          href="/"
          className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <header>
          <h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">
            Account
          </h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Signed in as{" "}
            <span className="font-semibold text-wn-charcoal">
              {user.email ?? "—"}
            </span>
          </p>
        </header>

        {/* Profile editor */}
        <section className="rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-wn-navy">Profile</h2>
          <ProfileForm
            initialDisplayName={p?.display_name ?? ""}
            initialPreferredOrigin={p?.preferred_origin ?? ""}
            originOptions={ORIGINS.map((o) => ({ code: o.code, label: o.name }))}
          />
        </section>

        {/* Quick links */}
        <section className="rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-base font-bold text-wn-navy">
            Your stuff
          </h2>
          <ul className="divide-y divide-wn-charcoal/10">
            <li>
              <Link
                href="/favorites"
                className="flex items-center justify-between py-3 text-sm text-wn-charcoal transition hover:text-wn-navy"
              >
                <span className="font-medium">❤️ Favorites</span>
                <span className="text-wn-charcoal/50">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/trips"
                className="flex items-center justify-between py-3 text-sm text-wn-charcoal transition hover:text-wn-navy"
              >
                <span className="font-medium">🗺️ My trips</span>
                <span className="text-wn-charcoal/50">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/account/digest"
                className="flex items-center justify-between py-3 text-sm text-wn-charcoal transition hover:text-wn-navy"
              >
                <span className="font-medium">📬 Email digest</span>
                <span className="text-wn-charcoal/50">→</span>
              </Link>
            </li>
            {/* Inaugural Season 2026 — "Wynla Pro" account section is
                hidden during the Founder Season. /account/pro route
                still exists for the few users who had pre-launch Pro
                subs (test mode) but doesn't get a discoverable link
                from /account. Re-surface for Season 2. */}
          </ul>
        </section>

        {/* Danger zone — kept visually separate + low-contrast until hover so
            it's never the most prominent thing on the page. */}
        <section className="rounded-xl border border-red-200/70 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 text-base font-bold text-red-900">
            Delete account
          </h2>
          <p className="mb-4 text-xs text-wn-charcoal/65">
            Permanently removes your favorites, trips, reviews, and digest
            subscription. This can&rsquo;t be undone.
          </p>
          <DeleteAccount />
        </section>
      </div>
    </main>
  );
}
