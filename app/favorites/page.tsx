// /favorites — server-rendered grid of the signed-in user's saved resorts.
// Auth-guarded: redirects to /login?next=/favorites if not signed in.
// Shows the same hero/state/passes summary as the side panel.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, passLabel } from "@/lib/passColors";
import { staticMapUrl } from "@/lib/mapboxStatic";

export const dynamic = "force-dynamic";

type FavoriteRow = {
  resort_id: number;
  resorts: {
    id: number;
    slug: string;
    name: string;
    state: string;
    region: string | null;
    latitude: number | string;
    longitude: number | string;
    passes: string[];
    tier: "featured" | "listed";
    hero_image_url: string | null;
    vertical_drop: number | null;
  };
};

export default async function FavoritesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login?next=/favorites");
  }

  // RLS makes this implicitly user-scoped — no need to filter by user_id here.
  const { data, error } = await supabase
    .from("favorites")
    .select(
      "resort_id, resorts(id, slug, name, state, region, latitude, longitude, passes, tier, hero_image_url, vertical_drop)",
    )
    .order("created_at", { ascending: false })
    .returns<FavoriteRow[]>();

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          Failed to load favorites: {error.message}
        </p>
      </main>
    );
  }

  const favorites = (data ?? []).map((r) => r.resorts).filter(Boolean);

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-4 inline-block text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">
            ❤️ Your favorites
          </h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            {favorites.length === 0
              ? "Nothing saved yet — tap the heart on any resort to keep it here."
              : `${favorites.length} resort${favorites.length === 1 ? "" : "s"} saved.`}
          </p>
        </header>

        {favorites.length === 0 ? (
          <div className="rounded-xl border border-dashed border-wn-charcoal/20 bg-white p-8 text-center">
            <div className="mb-2 text-3xl">🏔️</div>
            <p className="text-sm text-wn-charcoal/70">
              Find resorts you like, hit the heart, come back here to plan.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Browse the map
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((r) => (
              <FavoriteCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function FavoriteCard({
  r,
}: {
  r: FavoriteRow["resorts"];
}) {
  const lng = Number(r.longitude);
  const lat = Number(r.latitude);
  const primaryPass = r.passes?.[0] ?? "independent";
  const heroUrl =
    r.hero_image_url ??
    staticMapUrl({
      lng,
      lat,
      zoom: 8,
      width: 600,
      height: 280,
      pinColor: passColor(primaryPass),
    });

  return (
    <Link
      href={`/resort/${r.slug}`}
      className="group overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative h-32 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroUrl}
          alt={r.name}
          className="h-full w-full object-cover transition group-hover:scale-105"
        />
        {r.tier === "featured" && (
          <span className="absolute left-2 top-2 inline-flex items-center rounded bg-wn-gold/95 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-wn-navy shadow-sm">
            ★ Featured
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-bold text-wn-navy">{r.name}</h3>
        <p className="text-xs text-wn-charcoal/60">
          {r.state}
          {r.region ? ` · ${r.region}` : ""}
          {r.vertical_drop ? ` · ${r.vertical_drop.toLocaleString()} ft vert` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {(r.passes ?? []).map((p) => (
            <span
              key={p}
              className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
              style={{ backgroundColor: passColor(p) }}
            >
              {passLabel(p)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
