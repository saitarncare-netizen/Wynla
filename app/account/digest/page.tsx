// Email digest preferences. Auth-required.
//
// Lets the user choose between daily / weekly cadence, set a minimum
// "new snow" threshold (so the cron skips emails on dead-quiet days),
// and unsubscribe. The actual sending happens server-side in
// `/api/cron/daily-digest` — this page just edits the digest_subscriptions
// row for the current user via `/api/digest/subscribe`.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import DigestPreferencesForm from "./DigestPreferencesForm";

export const dynamic = "force-dynamic";

type DigestRow = {
  frequency: "daily" | "weekly";
  threshold_in: number;
  enabled: boolean;
  last_sent_at: string | null;
};

export default async function AccountDigestPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/login?next=/account/digest");
  }

  const { data: row } = await supabase
    .from("digest_subscriptions")
    .select("frequency, threshold_in, enabled, last_sent_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const sub = (row as DigestRow | null) ?? null;

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
            Get a snow + conditions summary for your favorited resorts.
            Sent to <span className="font-semibold">{user.email ?? "—"}</span>.
          </p>
        </header>

        <section className="rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <DigestPreferencesForm
            initialEnabled={sub?.enabled ?? false}
            initialFrequency={sub?.frequency ?? "daily"}
            initialThreshold={sub?.threshold_in ?? 0}
            lastSentAt={sub?.last_sent_at ?? null}
          />
        </section>

        <p className="mt-4 text-xs text-wn-charcoal/55">
          You can unsubscribe any time — your favorites stay saved.
        </p>
      </div>
    </main>
  );
}
