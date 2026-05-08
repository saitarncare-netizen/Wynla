// /trips — list of the signed-in user's saved trips.
// Auth-guarded: redirects to /login?next=/trips if not signed in.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TripRow = {
  id: string;
  name: string | null;
  origin_label: string | null;
  resort_slugs: string[];
  lodging_mode: "basecamp" | "roadtrip";
  total_days: number;
  started_at: string | null;
  current_day: number | null;
  completed_days: number[];
  created_at: string;
};

export default async function TripsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login?next=/trips");
  }

  const { data, error } = await supabase
    .from("trips")
    .select(
      "id, name, origin_label, resort_slugs, lodging_mode, total_days, started_at, current_day, completed_days, created_at",
    )
    .order("created_at", { ascending: false })
    .returns<TripRow[]>();

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          Failed to load trips: {error.message}
        </p>
      </main>
    );
  }

  const trips = data ?? [];

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
            >
              ← Map
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-wn-navy sm:text-4xl">
              My trips
            </h1>
          </div>
          <Link
            href="/?days=3&plan=1"
            className="rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            + New trip
          </Link>
        </header>

        {trips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-wn-charcoal/20 bg-white p-10 text-center">
            <div className="mx-auto mb-3 text-4xl" aria-hidden="true">🗺️</div>
            <h2 className="mb-1 text-lg font-bold text-wn-navy">No trips yet</h2>
            <p className="mb-4 text-sm text-wn-charcoal/70">
              Plan a multi-day route from the map and save it here.
            </p>
            <Link
              href="/?days=3&plan=1"
              className="inline-block rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Plan a trip
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {trips.map((trip) => {
              const isActive = trip.started_at != null;
              const totalCompleted = trip.completed_days.length;
              const progress = trip.total_days
                ? Math.round((totalCompleted / trip.total_days) * 100)
                : 0;
              return (
                <li
                  key={trip.id}
                  className="rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:border-wn-navy/30"
                >
                  <Link href={`/trip/${trip.id}`} className="block p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-base font-bold text-wn-navy">
                        {trip.name ?? `${trip.total_days}-day trip`}
                      </h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          isActive
                            ? "bg-wn-navy/10 text-wn-navy"
                            : "bg-wn-charcoal/10 text-wn-charcoal/70"
                        }`}
                      >
                        {isActive
                          ? `Day ${trip.current_day ?? 1} of ${trip.total_days}`
                          : "Not started"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-wn-charcoal/65">
                      {trip.lodging_mode === "basecamp" ? "🏠 Basecamp" : "🛣️ Road trip"}
                      {" · "}
                      {trip.total_days} days
                      {trip.origin_label ? ` · from ${trip.origin_label}` : ""}
                    </p>
                    {isActive && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-wn-charcoal/10">
                        <div
                          className="h-full rounded-full bg-wn-navy transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

