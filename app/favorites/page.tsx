// /favorites — server-rendered grid of the signed-in user's saved resorts.
// Signed out, the page hands off to GuestFavorites (the device list from
// lib/guestFavorites) with a sign-in banner instead of a login wall.
// Shows the same hero/state/passes summary as the side panel, plus the
// day's Go / Wait / Skip pill from the same loader /today uses, and a
// link to /today so the grid is a doorway rather than a dead end.

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, passLabel } from "@/lib/passColors";
import { accentOnNavy, textOn } from "@/lib/contrast";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/icons/Icon";
import { loadTodayRows, type TodayRow } from "@/app/today/data";
import VerdictPill from "@/app/today/VerdictPill";
import GuestFavorites from "./GuestFavorites";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return <GuestFavorites />;
  }

  // RLS makes this implicitly user-scoped. History is loaded here too
  // (one indexed query) so the surface classifier sees the same week as
  // /today and the two pages never disagree on the same resort.
  const { rows, error } = await loadTodayRows(supabase, { now: new Date(), withHistory: true });

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <Notice tone="danger">Failed to load favorites: {error}</Notice>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        title="❤️ Your favorites"
        description={
          rows.length === 0
            ? "Nothing saved yet — tap the heart on any resort to keep it here."
            : `${rows.length} resort${rows.length === 1 ? "" : "s"} saved.`
        }
        actions={
          rows.length > 0 ? (
            <Button href="/today" iconLeft={<Icon name="sun" />}>
              Today&rsquo;s call
            </Button>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-5xl px-4 pb-8 pt-4 sm:px-6 sm:pb-12">
        {rows.length === 0 ? (
          <EmptyState
            icon="mountain"
            title="Find resorts you like, hit the heart, come back here to plan."
            action={<Button href="/">Browse the map</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((row) => (
              <FavoriteCard key={row.resort.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function FavoriteCard({ row }: { row: TodayRow }) {
  const { resort: r, verdict: v } = row;
  const primary = r.passes?.[0] ?? "independent";
  const bg = passColor(primary);

  return (
    <Link
      href={`/resort/${r.slug}`}
      className="group overflow-hidden rounded-wn-md border border-wn-line bg-white shadow-wn-sm transition hover:border-wn-navy/40 hover:shadow-wn-md"
    >
      <div
        className="relative flex h-28 items-center justify-center overflow-hidden px-4"
        style={{
          // accentOnNavy: raw Ikon yellow / Epic orange put the white
          // name at 1.7:1 / 2.9:1.
          background: `linear-gradient(135deg, ${accentOnNavy(bg)} 0%, var(--color-wn-navy) 100%)`,
        }}
      >
        <h3 className="line-clamp-2 text-center text-base font-extrabold leading-tight text-white drop-shadow-sm sm:text-lg">
          {r.name}
        </h3>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-wn-muted">
            {r.state}
            {r.region ? ` · ${r.region}` : ""}
            {r.vertical_drop ? ` · ${r.vertical_drop.toLocaleString()} ft vert` : ""}
          </p>
          <VerdictPill v={v} />
        </div>
        {/* The one-line reason, so the pill is never a bare word. */}
        <p className="mt-1.5 line-clamp-2 text-xs text-wn-muted">
          {v.dormant ? v.reasons[0] : `${v.headline}. ${v.reasons[0]}`}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(r.passes ?? []).map((p) => (
            <span
              key={p}
              className="inline-block rounded-wn-sm px-1.5 py-0.5 text-eyebrow font-semibold"
              style={{
                backgroundColor: passColor(p),
                color: textOn(passColor(p)),
              }}
            >
              {passLabel(p)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
