// Pro tier waitlist landing page. Pure email capture — no paywall yet.
// Goal: collect willingness-to-pay signal before a Pro product is built, so
// when we eventually scope features we know who actually wanted them.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function joinWaitlist(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const source = String(formData.get("source") ?? "/pro");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    redirect(`/pro?error=${encodeURIComponent("Enter a valid email")}`);
  }
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData.user?.id ?? null;

  const { error } = await supabase
    .from("pro_waitlist")
    .insert({ email, source, user_id });

  if (error) {
    // Unique violation (email already in list) is OK — surface it as success.
    if (error.code === "23505") {
      redirect("/pro?ok=already");
    }
    redirect(`/pro?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/pro");
  redirect("/pro?ok=new");
}

export default async function ProPage(props: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const sp = await props.searchParams;
  const ok = sp.ok;
  const error = sp.error;

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy">
          ← Map
        </Link>

        <header className="mt-6 mb-8">
          <span className="inline-flex items-center rounded bg-wn-gold/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
            ✨ Coming
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-wn-navy sm:text-4xl">
            Wynla Pro — Plan deeper, ride farther
          </h1>
          <p className="mt-2 text-sm text-wn-charcoal/75 sm:text-base">
            We&apos;re building a Pro tier for skiers and snowboarders who plan
            multi-day trips, chase storms, and want every detail in one place.
          </p>
        </header>

        <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Bullet title="Snow alerts" body="Push notifications when your favorites get fresh snow." />
          <Bullet title="Storm tracker" body="Live storm cell movement across multiple weather sources." />
          <Bullet title="Trip planner" body="Multi-resort itineraries with drive-time optimization." />
          <Bullet title="Snow report archive" body="Five years of historical snowfall per resort." />
          <Bullet title="Unlimited favorites" body="Save and organize without limits." />
          <Bullet title="No ads, ever" body="Wynla stays a planner — never a billboard." />
        </section>

        <div className="rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          {ok === "new" && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              ✓ You&apos;re on the list. We&apos;ll email when Pro launches — no spam in between.
            </div>
          )}
          {ok === "already" && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              ✓ You&apos;re already on the list — thanks for the patience.
            </div>
          )}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              {error}
            </div>
          )}

          <h2 className="text-base font-bold text-wn-navy">Get notified at launch</h2>
          <p className="mt-1 text-xs text-wn-charcoal/70">
            We&apos;ll email you once when Pro is live. Founder-direct, no marketing list.
          </p>

          <form action={joinWaitlist} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="hidden" name="source" value="/pro" />
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="flex-1 rounded-md border border-wn-charcoal/20 bg-white px-3 py-2.5 text-sm text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-sky/30"
            />
            <button
              type="submit"
              className="rounded-md bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Join the waitlist
            </button>
          </form>

          <p className="mt-3 text-[11px] text-wn-charcoal/55">
            Pro pricing isn&apos;t set yet. Joining the waitlist isn&apos;t a
            commitment — it just helps us know who&apos;s interested.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-wn-charcoal/55">
          The free Wynla map stays free, forever. Pro is for the serious planner.
        </p>
      </div>
    </main>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white p-3">
      <div className="text-sm font-bold text-wn-navy">{title}</div>
      <div className="mt-0.5 text-xs text-wn-charcoal/70">{body}</div>
    </div>
  );
}
