import { supabase } from "@/lib/supabase";
import MapView from "@/components/Map/MapView";
import { PASS_COLORS, PASS_LABELS } from "@/lib/passColors";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: resorts, error } = await supabase
    .from("resorts")
    .select("id, slug, name, state, region, latitude, longitude, pass")
    .eq("active", true)
    .order("name");

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <p className="rounded-md border border-wn-charcoal/20 bg-white px-4 py-2 font-mono text-sm text-wn-charcoal">
          db error: {error.message}
        </p>
      </main>
    );
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-wn-charcoal/10 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="text-xl font-extrabold tracking-tight text-wn-navy">
            Wynla
          </span>
          <span className="hidden text-xs text-wn-charcoal/50 sm:inline">
            Plan smart. Ride better.
          </span>
        </div>
        <span className="text-xs font-medium text-wn-charcoal/70">
          {resorts?.length ?? 0} resorts
        </span>
      </header>

      <MapView resorts={resorts ?? []} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4 sm:justify-start sm:pl-6">
        <div className="pointer-events-auto rounded-lg border border-wn-charcoal/10 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
            Pass
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {(Object.keys(PASS_LABELS) as Array<keyof typeof PASS_LABELS>)
              .filter((k) => k !== "mountain_collective")
              .map((key) => (
                <div key={key} className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PASS_COLORS[key] }}
                  />
                  <span className="text-wn-charcoal">{PASS_LABELS[key]}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
