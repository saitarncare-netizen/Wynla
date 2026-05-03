"use client";

import { useMemo, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MapView from "./MapView";
import FilterBar from "./FilterBar";
import { originByCode } from "@/lib/origins";
import { PASS_COLORS, PASS_LABELS } from "@/lib/passColors";

type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  latitude: number | string;
  longitude: number | string;
  pass: string;
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

export default function MapPage({ resorts, driveTimes }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const passFilter = searchParams.get("pass");
  const fromCode = searchParams.get("from") ?? "nyc";
  const withinHours = Number(searchParams.get("within")) || 0;

  const origin = originByCode(fromCode);

  const driveTimeByResort = useMemo(() => {
    const map = new Map<number, Map<string, DriveTime>>();
    for (const dt of driveTimes) {
      if (!map.has(dt.resort_id)) map.set(dt.resort_id, new Map());
      map.get(dt.resort_id)!.set(dt.origin_name, dt);
    }
    return map;
  }, [driveTimes]);

  const filtered = useMemo(() => {
    return resorts.filter((r) => {
      if (passFilter && r.pass !== passFilter) return false;
      if (withinHours > 0) {
        const dt = driveTimeByResort.get(r.id)?.get(origin.name);
        if (!dt || dt.duration_seconds > withinHours * 3600) return false;
      }
      return true;
    });
  }, [resorts, passFilter, withinHours, origin, driveTimeByResort]);

  const passCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resorts) counts[r.pass] = (counts[r.pass] ?? 0) + 1;
    return counts;
  }, [resorts]);

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    });
  }

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
          <span className="text-xs font-medium text-wn-charcoal/70">
            {filtered.length} / {resorts.length} resorts
          </span>
        </div>
        <FilterBar
          passFilter={passFilter}
          fromCode={fromCode}
          withinHours={withinHours}
          onPassChange={(p) => updateParam("pass", p)}
          onFromChange={(f) => updateParam("from", f)}
          onWithinChange={(w) => updateParam("within", w)}
          counts={passCounts}
        />
      </header>

      <MapView
        resorts={filtered}
        originName={origin.name}
        driveTimeByResort={driveTimeByResort}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4 sm:justify-start sm:pl-6">
        <div className="pointer-events-auto rounded-lg border border-wn-charcoal/10 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
            Pass
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {(["epic", "ikon", "indy", "independent"] as const).map((key) => (
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
