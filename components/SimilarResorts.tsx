import Link from "next/link";
import { findSimilarResorts, type SimilarityResort } from "@/lib/similarity";
import { passColor, primaryPass } from "@/lib/passColors";

// Server-compatible section that renders "Mountains like X". Pure:
// receives the current resort + a pool of all active resorts, runs
// findSimilarResorts() in render, and emits 4 card links.
//
// Lives at the bottom of /resort/[slug] so it acts as a soft cross-sell:
// once someone's done reading about a resort, give them a clear next
// click instead of bouncing back to the map.

type Props = {
  currentResort: SimilarityResort;
  allResorts: SimilarityResort[];
};

export default function SimilarResorts({ currentResort, allResorts }: Props) {
  const similar = findSimilarResorts(currentResort, allResorts, 4);
  if (similar.length === 0) return null;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-wn-navy sm:text-xl">
          Similar mountains
        </h2>
        <p className="text-xs text-wn-charcoal/60">
          Resorts that match this one&apos;s size, difficulty, and pass affiliation.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {similar.map((r) => (
          <SimilarCard key={r.id} resort={r} />
        ))}
      </div>
    </section>
  );
}

function SimilarCard({ resort }: { resort: SimilarityResort }) {
  const primary = primaryPass(resort.passes);
  const stripColor = passColor(primary);
  return (
    <Link
      href={`/resort/${resort.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-wn-charcoal/10 bg-white shadow-sm transition hover:border-wn-navy hover:shadow-md"
    >
      <div
        aria-hidden="true"
        className="h-[5px] w-full"
        style={{ backgroundColor: stripColor }}
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="text-sm font-bold leading-tight text-wn-navy">
          {resort.name}
        </div>
        <div className="text-[11px] text-wn-charcoal/60">
          {resort.state}
          {resort.region ? ` · ${resort.region}` : ""}
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[11px] text-wn-charcoal/75">
          {resort.vertical_drop != null && (
            <span>
              <span className="font-semibold text-wn-charcoal">
                {resort.vertical_drop.toLocaleString()}
              </span>
              <span className="ml-0.5 text-wn-charcoal/55">ft drop</span>
            </span>
          )}
          {resort.total_trails != null && (
            <span>
              <span className="font-semibold text-wn-charcoal">
                {resort.total_trails}
              </span>
              <span className="ml-0.5 text-wn-charcoal/55">trails</span>
            </span>
          )}
        </div>
        <div className="mt-auto pt-2 text-[11px] font-semibold text-wn-navy/70 transition group-hover:text-wn-navy">
          View →
        </div>
      </div>
    </Link>
  );
}
