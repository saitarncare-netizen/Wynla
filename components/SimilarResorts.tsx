import Link from "next/link";
import { findSimilarResorts, type SimilarityResort } from "@/lib/similarity";
import { passColor, primaryPass } from "@/lib/passColors";
import Icon from "@/components/icons/Icon";
import Section from "@/components/ui/Section";

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
    <Section
      id="similar-mountains"
      title="Similar mountains"
      description="Resorts that match this one's size, difficulty, and pass affiliation."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {similar.map((r) => (
          <SimilarCard key={r.id} resort={r} />
        ))}
      </div>
    </Section>
  );
}

function SimilarCard({ resort }: { resort: SimilarityResort }) {
  const primary = primaryPass(resort.passes);
  const stripColor = passColor(primary);
  return (
    <Link
      href={`/resort/${resort.slug}`}
      className="group flex flex-col overflow-hidden rounded-wn-md border border-wn-line bg-white shadow-wn-sm transition hover:border-wn-navy hover:shadow-wn-md"
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
        <div className="text-xs text-wn-muted">
          {resort.state}
          {resort.region ? ` · ${resort.region}` : ""}
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-wn-muted">
          {resort.vertical_drop != null && (
            <span>
              <span className="font-semibold text-wn-charcoal">
                {resort.vertical_drop.toLocaleString()}
              </span>
              <span className="ml-0.5 text-wn-muted">ft drop</span>
            </span>
          )}
          {resort.total_trails != null && (
            <span>
              <span className="font-semibold text-wn-charcoal">
                {resort.total_trails}
              </span>
              <span className="ml-0.5 text-wn-muted">trails</span>
            </span>
          )}
        </div>
        <div className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold text-wn-navy">
          View
          <Icon name="arrow-right" className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
