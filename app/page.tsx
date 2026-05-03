import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { count, error } = await supabase
    .from("resorts")
    .select("*", { count: "exact", head: true });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-wn-offwhite px-6 py-24">
      <div className="flex max-w-2xl flex-col items-center text-center">
        <span className="mb-6 inline-flex items-center rounded-full bg-wn-sky/15 px-3 py-1 text-sm font-medium text-wn-navy">
          Coming soon
        </span>

        <h1 className="text-6xl font-extrabold tracking-tight text-wn-navy sm:text-7xl">
          Wynla
        </h1>

        <p className="mt-6 text-xl font-semibold text-wn-charcoal sm:text-2xl">
          Plan smart. Ride better.
        </p>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-wn-charcoal/70">
          Map, weather, and pass info for ski and snowboard trips —
          all in one place.
        </p>

        <p className="mt-8 text-sm text-wn-charcoal/50">
          Northeast US · Launching this season
        </p>

        <p className="mt-8 rounded-md border border-wn-charcoal/10 bg-white px-3 py-1.5 font-mono text-xs text-wn-charcoal/60">
          {error
            ? `db error: ${error.message}`
            : count === null
              ? "table 'resorts' not found — run seed.sql"
              : `${count} resort${count === 1 ? "" : "s"} in database`}
        </p>
      </div>
    </main>
  );
}
