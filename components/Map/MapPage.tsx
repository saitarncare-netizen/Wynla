"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MapView from "./MapView";
import AlaskaInset from "./AlaskaInset";
import FilterBar from "./FilterBar";
import ResortPanel from "./ResortPanel";
import AuthButton from "@/components/auth/AuthButton";
import Link from "next/link";
import { originByCode } from "@/lib/origins";
import { PASS_COLORS, PASS_LABELS, PASS_KEYS } from "@/lib/passColors";
import { sizeTier, matchesSizeFilter, type SizeTier } from "@/lib/sizeTier";

export type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
  tier: "featured" | "listed";
  vertical_drop: number | null;
  hero_image_url: string | null;
  total_trails: number | null;
  total_acres: number | null;
  website_url: string | null;
};

type DriveTime = {
  resort_id: number;
  origin_name: string;
  duration_seconds: number;
  distance_meters: number | null;
};

type Props = {
  resorts: Resort[];
  driveTimes: DriveTime[];
};

function isSizeTier(v: string | null): v is SizeTier {
  return v === "small" || v === "medium" || v === "large";
}

export default function MapPage({ resorts, driveTimes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const passFilter = searchParams.get("pass");
  const sizeParam = searchParams.get("size");
  const sizeFilter: SizeTier | null = isSizeTier(sizeParam) ? sizeParam : null;
  const fromCode = searchParams.get("from") ?? "nyc";
  const withinHours = Number(searchParams.get("within")) || 0;
  const featuredOnly = searchParams.get("featured") === "1";

  const origin = originByCode(fromCode);

  const driveTimeByResort = useMemo(() => {
    const map = new Map<number, Map<string, DriveTime>>();
    for (const dt of driveTimes) {
      if (!map.has(dt.resort_id)) map.set(dt.resort_id, new Map());
      map.get(dt.resort_id)!.set(dt.origin_name, dt);
    }
    return map;
  }, [driveTimes]);

  // Resorts that pass every filter EXCEPT size — used to compute the
  // "X with unknown size hidden" caption when the size chip is active.
  const filteredIgnoringSize = useMemo(() => {
    return resorts.filter((r) => {
      if (featuredOnly && r.tier !== "featured") return false;
      if (passFilter && !(r.passes ?? []).includes(passFilter)) return false;
      if (withinHours > 0) {
        const dt = driveTimeByResort.get(r.id)?.get(origin.name);
        if (!dt || dt.duration_seconds > withinHours * 3600) return false;
      }
      return true;
    });
  }, [resorts, featuredOnly, passFilter, withinHours, origin, driveTimeByResort]);

  const filtered = useMemo(() => {
    return filteredIgnoringSize.filter((r) => matchesSizeFilter(r.vertical_drop, sizeFilter));
  }, [filteredIgnoringSize, sizeFilter]);

  // Count of resorts hidden specifically because they have NULL vertical_drop
  // and a size filter is active. 0 when no filter active or no NULL hits.
  const hiddenByNullSize = useMemo(() => {
    if (sizeFilter === null) return 0;
    return filteredIgnoringSize.filter((r) => r.vertical_drop == null).length;
  }, [filteredIgnoringSize, sizeFilter]);

  // Pass counts respect the featured-only toggle so chip numbers match what's visible.
  // A resort with multiple passes is counted in each.
  const passCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const pool = featuredOnly ? resorts.filter((r) => r.tier === "featured") : resorts;
    for (const r of pool) {
      for (const p of r.passes ?? []) {
        counts[p] = (counts[p] ?? 0) + 1;
      }
    }
    return counts;
  }, [resorts, featuredOnly]);

  // Size counts for the size chips (NULL excluded — those just stay always-visible)
  const sizeCounts = useMemo(() => {
    const counts: Record<string, number> = { small: 0, medium: 0, large: 0 };
    const pool = featuredOnly ? resorts.filter((r) => r.tier === "featured") : resorts;
    for (const r of pool) {
      const t = sizeTier(r.vertical_drop);
      if (t) counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [resorts, featuredOnly]);

  const featuredCount = useMemo(
    () => resorts.filter((r) => r.tier === "featured").length,
    [resorts],
  );

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  }

  // Resolve the currently-selected resort once per render (not in click
  // handler) so the panel always reflects the latest data — e.g. drive-time
  // updates when the user changes the From-city filter.
  const selectedResort = useMemo(
    () => (selectedId == null ? null : resorts.find((r) => r.id === selectedId) ?? null),
    [selectedId, resorts],
  );

  // ESC key closes the panel — keyboard parity with the X button.
  useEffect(() => {
    if (selectedId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-10 border-b border-wn-charcoal/10 bg-white/95 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-extrabold tracking-tight text-wn-navy">
              Wynla
            </span>
            <span className="hidden text-xs text-wn-charcoal/50 sm:inline">
              Plan smart. Ride better.
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateParam("featured", featuredOnly ? null : "1")}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                featuredOnly
                  ? "border-wn-gold bg-wn-gold/15 text-wn-charcoal"
                  : "border-wn-charcoal/20 bg-white text-wn-charcoal/70 hover:border-wn-charcoal/40"
              }`}
              title={`Show only the ${featuredCount} deeply-detailed resorts`}
            >
              ★ Featured {featuredOnly ? "ON" : "OFF"}
            </button>
            <span className="text-xs font-medium text-wn-charcoal/70">
              {filtered.length} / {resorts.length}
            </span>
            <Link
              href="/pro"
              className="hidden rounded-md border border-wn-gold/60 bg-wn-gold/10 px-2.5 py-1 text-xs font-semibold text-wn-navy transition hover:bg-wn-gold/25 sm:inline-block"
              title="Wynla Pro — coming soon"
            >
              ✨ Pro
            </Link>
            <AuthButton />
          </div>
        </div>
        <FilterBar
          passFilter={passFilter}
          sizeFilter={sizeFilter}
          fromCode={fromCode}
          withinHours={withinHours}
          onPassChange={(p) => updateParam("pass", p)}
          onSizeChange={(s) => updateParam("size", s)}
          onFromChange={(f) => updateParam("from", f)}
          onWithinChange={(w) => updateParam("within", w)}
          passCounts={passCounts}
          sizeCounts={sizeCounts}
          hiddenByNullSize={hiddenByNullSize}
        />
      </header>

      <MapView
        resorts={filtered}
        originName={origin.name}
        driveTimeByResort={driveTimeByResort}
        selectedId={selectedId}
        onResortClick={setSelectedId}
      />

      <AlaskaInset resorts={filtered} />

      {/* Empty state — only when filters return zero. The Alaska inset
          handles its own emptiness; this banner is for the main map. */}
      {filtered.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4">
          <div className="pointer-events-auto max-w-sm rounded-xl border border-wn-charcoal/10 bg-white/95 p-5 text-center shadow-lg backdrop-blur-sm">
            <div className="mb-2 text-2xl" aria-hidden="true">🔍</div>
            <h2 className="mb-1 text-base font-bold text-wn-navy">No resorts match</h2>
            <p className="mb-3 text-xs text-wn-charcoal/70">
              Try removing a filter — your current selection has nothing in common.
            </p>
            <button
              type="button"
              onClick={() => router.replace("?", { scroll: false })}
              className="inline-flex items-center gap-1 rounded-md bg-wn-navy px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Reset all filters
            </button>
          </div>
        </div>
      )}

      {selectedResort && (
        <ResortPanel
          resort={selectedResort}
          driveTime={driveTimeByResort.get(selectedResort.id)?.get(origin.name)}
          originShort={origin.short}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4 sm:justify-end sm:pr-6">
        <div className="pointer-events-auto rounded-lg border border-wn-charcoal/10 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
            Pass
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {PASS_KEYS.map((key) => (
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
