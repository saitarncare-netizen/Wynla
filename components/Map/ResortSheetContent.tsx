"use client";

// Content pieces shared by the phone resort sheet and the desktop rail
// (both live in ResortPanel.tsx): hero header, 2x2 conditions tiles,
// "The mountain" facts (difficulty mix, elevations, trails, lifts), the
// full-page button, pass chips with per-product rules, docked action bar
// and the compact "Top picks nearby" strip. Every condition number
// carries its source label (Measured / Forecast / Reported / Estimated)
// and, when the row has a stamp, its age; nothing here claims more than
// the columns hold.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { passColor, passLabel } from "@/lib/passColors";
import { textOn } from "@/lib/contrast";
import { SURFACE_GLOSSARY, type SurfaceCode } from "@/lib/snowSurface";
import type { ResortStatus } from "@/lib/seasonDates";
import { getDifficultyMix } from "@/lib/difficulty";
import { timeZoneForResort } from "@/lib/sunTimes";
import SurfaceIcon from "@/components/icons/SurfaceIcon";
import Icon from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import HeroImage from "@/components/HeroImage";
import { heroSourceFor } from "@/lib/heroSource";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import CompareToggle from "@/components/CompareToggle";
import { ResortStatusPill } from "@/components/SeasonCountdown";
import NearbyGroup from "@/components/NearbyGroup";
import { fetchNearbyRestaurants, fetchNearbyActivities } from "@/lib/fetchNearby";
import { fetchResortWeather, type ResortWeatherExtras } from "@/lib/fetchResortWeather";
import type { NearbyRow } from "@/lib/nearbyCategories";
import type { Resort, WeatherSnapshot } from "./MapPage";
import DifficultyBar from "./DifficultyBar";
import { directionsUrl } from "./ResortSheetMath";
import { buildMountainFacts, buildSheetTiles, type GlanceTile } from "@/lib/glanceTiles";
import { HIT_AREA_44_FROM_32 } from "@/lib/hitArea";
import { usePlannerDraftSlugs } from "@/lib/plannerDraft";

// Families that have per-product rules in lib/data/passAccess.json. Kept
// local (not imported from lib/passAccess) so the map bundle does not pull
// the dataset in; the dynamic import below loads it on first tap.
const PASS_FAMILIES_WITH_RULES = new Set(["epic", "ikon", "indy", "mountain_collective"]);

/** Drive-from-origin display, resolved once in ResortPanel. */
export type DriveDisplay = {
  /** "2h 10m" or, past the 10 h drive ceiling, "1,940 mi". */
  value: string;
  /** "from NYC" / "fly · your location". */
  label: string;
  /** Haversine estimate (≈) rather than a cached or Matrix road time. */
  estimate: boolean;
  fly: boolean;
};

// ---------- Hero ----------

export function heroGradient(passHex: string): string {
  return `linear-gradient(135deg, ${passHex} 0%, #1E2952 100%)`;
}

const NOISE_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.85'/></svg>\")";

/**
 * Photo, terrain card or pass-colour gradient layer with the film-grain
 * overlay. What to show comes from lib/heroSource (the same vetting and
 * denylist policy as the resort page), so a resort without a vetted photo
 * gets its terrain card instead of a bare gradient. HeroImage in `compact`
 * mode prints the credit itself as a small pill top-left that links to
 * /credits (CC BY / BY-SA photos require a visible credit); the sheet puts
 * the resort name bottom-left and its buttons top-right. The whole layer
 * fades with the sheet as it collapses to its title bar, and once it is
 * effectively invisible it goes inert so the hidden credit link cannot
 * take a tap or keyboard focus.
 */
export function HeroBackdrop({
  resort,
  passHex,
  sizes,
  opacity = 1,
}: {
  resort: Resort;
  passHex: string;
  sizes: string;
  opacity?: number;
}) {
  // Decorative here: the sheet's heading already names the resort, so the
  // image itself carries an empty alt; the credit pill stays readable.
  const hero = { ...heroSourceFor(resort), alt: "" };
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: heroGradient(passHex), opacity }}
      inert={opacity <= 0.05 ? true : undefined}
    >
      <HeroImage key={hero.src ?? "none"} source={hero} compact sizes={sizes} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{ backgroundImage: NOISE_BG, backgroundSize: "160px 160px" }}
      />
    </div>
  );
}

/** Peek-line stat: fresh snow beats % open beats vertical beats trails. */
export function pickKeyStat(resort: {
  snow_new_24h_in: number | null;
  trails_open_today: number | null;
  total_trails: number | null;
  currently_open: boolean | null;
  snow_report_status: string | null;
  vertical_drop: number | null;
}): { emoji: string; text: string } {
  if (resort.snow_new_24h_in != null && resort.snow_new_24h_in > 0) {
    return { emoji: "❄️", text: `${resort.snow_new_24h_in}" new` };
  }
  // trails_open_today only means "today" when a licensed report wrote it.
  if (
    resort.currently_open === true &&
    resort.snow_report_status === "reported" &&
    resort.trails_open_today != null &&
    resort.total_trails != null &&
    resort.total_trails > 0
  ) {
    const pct = Math.round((resort.trails_open_today / resort.total_trails) * 100);
    return { emoji: "🟢", text: `${pct}% open` };
  }
  if (resort.vertical_drop != null) {
    return { emoji: "⛰", text: `${resort.vertical_drop.toLocaleString()} ft vertical` };
  }
  return {
    emoji: "⛷️",
    text: resort.total_trails != null ? `${resort.total_trails} trails` : "Details on the resort page",
  };
}

// ---------- Stat row ----------

type Tile = GlanceTile & { icon?: React.ReactNode };

/**
 * The sheet's 2x2 conditions: new snow / high-low today / base depth (or
 * status) / surface (or snow next 3 days). Built by lib/glanceTiles so
 * the labels and the source words (Measured / Reported / Forecast) match
 * the resort page's strip; the map only adds the surface icon. `extras`
 * is the lazy per-resort read: undefined while it is in flight (the
 * next-3-days tile says so), null when it failed.
 */
export function buildStatTiles(
  resort: Resort,
  weather: WeatherSnapshot | null,
  status: ResortStatus,
  opts: { extras?: ResortWeatherExtras | null; openProjected?: boolean; now?: Date } = {},
): Tile[] {
  // Surface class: written by the daily forecast run, null while the
  // surface model is dormant (closed / off-season / no evidence). The
  // map row carries no confidence, so the tile says Forecast + age only.
  const code = resort.current_surface_class as SurfaceCode | null;
  const glossary = code ? SURFACE_GLOSSARY[code] : undefined;
  const tiles: Tile[] = buildSheetTiles({
    resort,
    weather,
    status,
    surface: glossary ? { kind: "active", label: glossary.label } : null,
    openProjected: opts.openProjected,
    extras: opts.extras,
    now: opts.now,
  });
  if (glossary && code) {
    const surface = tiles.find((t) => t.key === "surface");
    if (surface) surface.icon = <SurfaceIcon code={code} className="h-4 w-4 shrink-0 text-wn-navy" />;
  }
  return tiles;
}

export function StatRow({ tiles }: { tiles: Tile[] }) {
  // Two columns, so each tile gets ~170 px on a 390 px phone (the old
  // four-up row gave ~69 px and cut values to "Opens…" / "Slight chan…").
  // Nothing truncates: a long status or condition wraps to a second line
  // instead of losing its meaning. Label and source lines are load-bearing
  // (they say which numbers are measured and which are forecast), so they
  // use wn-muted: about 6.2:1 on the tinted tile, AA for small text.
  return (
    <dl className="grid grid-cols-2 gap-2" aria-label="Conditions at a glance">
      {tiles.map((t) => (
        <div key={t.key} className="min-w-0 rounded-wn-sm bg-wn-navy/5 px-3 py-2">
          <dt className="text-eyebrow font-semibold uppercase text-wn-muted">{t.label}</dt>
          <dd
            className={[
              "mt-0.5 flex items-center gap-1.5 text-lg font-extrabold leading-tight tracking-tight tabular-nums",
              t.accent ? "text-wn-info" : "text-wn-navy",
            ].join(" ")}
          >
            {t.icon}
            <span className="min-w-0 break-words">{t.value}</span>
          </dd>
          {t.detail && <dd className="mt-0.5 text-xs font-medium text-wn-charcoal">{t.detail}</dd>}
          <dd className="text-xs text-wn-muted">{t.source}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * The conditions tiles plus the lazy per-resort weather read (next 3
 * days of snow, today's forecast wind, the low as a fallback). Fetched
 * when a resort opens, like NearbyInPanel; a result is tagged with its
 * resort id so a slow answer for the previous pin is never shown on the
 * next one.
 */
export function ConditionsGlance({
  resort,
  weather,
  status,
  openProjected,
}: {
  resort: Resort;
  weather: WeatherSnapshot | null;
  status: ResortStatus;
  /** SeasonInfo.openProjected for this resort (lib/seasonDates). */
  openProjected: boolean;
}) {
  type Loaded = { id: number; extras: ResortWeatherExtras | null };
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  // Legacy v1 forecast rows carry no zone; the resort's own zone decides
  // which forecast day is "today" for those.
  const timeZone =
    timeZoneForResort({
      slug: resort.slug,
      state: resort.state,
      latitude: resort.latitude,
      longitude: resort.longitude,
    }) ?? null;
  useEffect(() => {
    let cancelled = false;
    const id = resort.id;
    fetchResortWeather(id, { timeZone }).then(
      (extras) => {
        if (!cancelled) setLoaded({ id, extras });
      },
      () => {
        if (!cancelled) setLoaded({ id, extras: null });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [resort.id, timeZone]);
  const extras = loaded?.id === resort.id ? loaded.extras : undefined;
  const tiles = useMemo(
    () => buildStatTiles(resort, weather, status, { extras, openProjected }),
    [resort, weather, status, extras, openProjected],
  );
  return <StatRow tiles={tiles} />;
}

// ---------- The mountain ----------

/**
 * What kind of mountain this is, at a glance: the difficulty mix bar
 * (nothing when the mix is unverified, lib/difficulty) and one wrapped
 * line of facts from the resort row (lib/glanceTiles buildMountainFacts).
 * Renders nothing when the row has neither.
 */
export function MountainFacts({ resort }: { resort: Resort }) {
  const mix = getDifficultyMix(resort);
  const facts = buildMountainFacts(resort);
  if (!mix && facts.length === 0) return null;
  const headingId = `mountain-facts-${resort.id}`;
  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <h3 id={headingId} className="text-sm font-bold text-wn-navy">
        The mountain
      </h3>
      {mix && <DifficultyBar mix={mix} size="compact" />}
      {facts.length > 0 && (
        // Inline items, each kept whole, with the separator dot glued to
        // the item before it: a wrapped line never starts with "·" and
        // never splits "11,570 ft".
        <ul className="text-sm leading-6 text-wn-charcoal">
          {facts.map((f, i) => (
            <li key={f.key} className="inline">
              <span className="whitespace-nowrap">
                {f.text}
                {i < facts.length - 1 && (
                  <span aria-hidden="true" className="text-wn-subtle">
                    {" ·"}
                  </span>
                )}
              </span>{" "}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The one way from the sheet to the full resort page: a full-width
 *  44 px navy-outline button (Button "outline"). Not "secondary": its
 *  #e5e5e5 edge is ~1.3:1 on the white sheet and only turns navy on
 *  hover, which a phone never has, so it read as loose navy text. Not
 *  gold either: gold is reserved for Plan trip in the action bar. */
export function FullPageButton({ slug }: { slug: string }) {
  return (
    <Button href={`/resort/${slug}`} variant="outline" block iconRight={<Icon name="arrow-right" />}>
      See full mountain page
    </Button>
  );
}

// ---------- Pass chips ----------

/**
 * Pass badges. Multi-resort passes are buttons: tap (touch, click, Enter /
 * Space) or mouse hover shows the per-product summary line under the row
 * ("Ikon: unlimited · Ikon Base: 5 days, blackouts Dec 26-30"). The
 * ~500 KB rules dataset is dynamically imported on first use.
 */
export function PassChips({ resort }: { resort: Resort }) {
  // `line` is undefined while loading, null when the family has no
  // verified rows. `openedBy` records hover vs tap: a mouse click lands
  // on a chip hover already opened, so a click only CLOSES a detail a
  // tap opened, or the first desktop click would open then hide it.
  type PassDetail = { id: number; family: string; line: string | null | undefined; openedBy: "hover" | "tap" };
  const [passDetail, setPassDetail] = useState<PassDetail | null>(null);
  const cache = useRef(new Map<string, string | null>());
  const loadSummary = useCallback(
    async (family: string): Promise<string | null> => {
      const key = `${resort.slug}|${family}`;
      const cached = cache.current.get(key);
      if (cached !== undefined) return cached;
      const mod = await import("@/lib/passAccess");
      const line = mod.isPassFamily(family) ? mod.summaryLine(resort.slug, family) : null;
      cache.current.set(key, line);
      return line;
    },
    [resort.slug],
  );
  const openDetail = useCallback(
    (family: string, openedBy: "hover" | "tap") => {
      const id = resort.id;
      setPassDetail({ id, family, line: cache.current.get(`${resort.slug}|${family}`), openedBy });
      void loadSummary(family).then((line) => {
        setPassDetail((cur) => (cur && cur.id === id && cur.family === family ? { ...cur, line } : cur));
      });
    },
    [resort.id, resort.slug, loadSummary],
  );
  // Hover only for a real mouse: a finger's pointerenter is the start of
  // a tap and the click handler owns that. No onFocus on purpose (Android
  // Chrome focuses before click, which used to open then close in one tap).
  const hover = (family: string, pointerType: string) => {
    if (pointerType !== "mouse") return;
    if (passDetail && passDetail.id === resort.id && passDetail.family === family) return;
    openDetail(family, "hover");
  };
  const tap = (family: string) => {
    const same = passDetail !== null && passDetail.id === resort.id && passDetail.family === family;
    if (same && passDetail.openedBy === "tap") setPassDetail(null);
    else if (same) setPassDetail({ ...passDetail, openedBy: "tap" });
    else openDetail(family, "tap");
  };
  const active = passDetail && passDetail.id === resort.id ? passDetail : null;
  const detailId = `pass-detail-${resort.id}`;

  if (!resort.passes || resort.passes.length === 0) return null;
  return (
    <div>
      {/* 32 px badges; the buttons get a 44 px hit area (6 px above and
          below), which is why wrapped rows are 12 px apart. */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-3">
        {resort.passes.map((p) => {
          const fg = textOn(passColor(p));
          if (!PASS_FAMILIES_WITH_RULES.has(p)) {
            return (
              <span
                key={p}
                className="inline-flex h-8 items-center rounded-md px-2.5 text-[12px] font-semibold"
                style={{ backgroundColor: passColor(p), color: fg }}
              >
                {passLabel(p)}
              </span>
            );
          }
          const open = active?.family === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => tap(p)}
              onPointerEnter={(e) => hover(p, e.pointerType)}
              aria-expanded={open}
              aria-controls={active ? detailId : undefined}
              title={`${passLabel(p)}: days and blackout dates here`}
              className={`${HIT_AREA_44_FROM_32} inline-flex h-8 items-center rounded-md px-2.5 text-[12px] font-semibold transition ${
                open ? "ring-2 ring-wn-navy/40 ring-offset-1" : "hover:brightness-110"
              }`}
              style={{ backgroundColor: passColor(p), color: fg }}
            >
              {passLabel(p)}
            </button>
          );
        })}
      </div>
      {active && (
        <p id={detailId} className="mt-1.5 text-[11px] leading-snug text-wn-charcoal/80" aria-live="polite">
          {active.line === undefined
            ? "Loading pass rules…"
            : active.line ?? `${passLabel(active.family)} rules for this resort are not verified yet.`}{" "}
          <Link
            href={`/resort/${resort.slug}#pass-access`}
            className="whitespace-nowrap font-semibold text-wn-navy underline underline-offset-2"
          >
            Full rules →
          </Link>
        </p>
      )}
    </div>
  );
}

// ---------- Action bar ----------

/**
 * Docked action bar: Plan trip (gold, the one primary action) · Directions
 * · Save · Compare · Share. Google Maps pinned the same row to the bottom
 * of its place sheet in Sept 2025 so the main action never scrolls away.
 * Compare lives here on phones (the desktop rail keeps it in the hero,
 * RailControls), so the map's compare flow works on every width.
 *
 * The gold button follows the trip being planned in this tab (the
 * planner's sessionStorage draft): "Plan trip" with no draft, "Add to
 * trip" when this resort would be a new stop, "View trip" when it
 * already is one. onPlanTrip is the same in all three (MapPage sends
 * ?add=<slug>, which appends, starts or just opens the trip), so the
 * label is a promise about what the tap does, never a different code path.
 */
export function ActionBar({
  resort,
  lat,
  lng,
  onPlanTrip,
  safeArea = true,
  showCompare = false,
}: {
  resort: Resort;
  lat: number;
  lng: number;
  onPlanTrip: () => void;
  safeArea?: boolean;
  /** Phone sheet only: the rail already has CompareToggle in its hero. */
  showCompare?: boolean;
}) {
  const [shared, setShared] = useState<"idle" | "copied" | "failed">("idle");
  const canDirect = Number.isFinite(lat) && Number.isFinite(lng);
  const draftSlugs = usePlannerDraftSlugs();
  const inTrip = draftSlugs.includes(resort.slug);
  const planLabel = draftSlugs.length === 0 ? "Plan trip" : inTrip ? "View trip" : "Add to trip";

  async function share() {
    const url = `${window.location.origin}/resort/${resort.slug}`;
    const title = `${resort.name} on Wynla`;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared("copied");
    } catch (e) {
      // A dismissed share sheet rejects with AbortError: not a failure.
      if (e instanceof DOMException && e.name === "AbortError") return;
      setShared("failed");
    }
    window.setTimeout(() => setShared("idle"), 2000);
  }

  const secondary =
    "inline-flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 text-[10px] font-semibold text-wn-navy transition hover:bg-wn-navy/5 active:scale-95";

  return (
    <div
      className="border-t border-wn-charcoal/10 bg-white px-3 pt-2"
      style={{
        paddingBottom: safeArea ? "calc(env(safe-area-inset-bottom, 0px) + 8px)" : "8px",
      }}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPlanTrip}
          className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-wn-gold px-3 text-sm font-bold text-wn-navy shadow-sm transition hover:bg-wn-gold/90 active:scale-[0.98]"
        >
          <Icon name={inTrip ? "check" : "trips"} className="h-4 w-4" />
          {planLabel}
        </button>
        {canDirect && (
          <a
            href={directionsUrl(lat, lng)}
            target="_blank"
            rel="noopener noreferrer"
            className={secondary}
            aria-label={`Directions to ${resort.name} (opens Google Maps)`}
          >
            <Icon name="pin" className="h-5 w-5" />
            Directions
          </a>
        )}
        {/* FavoriteToggle is a 36 px circle; the ::before on its button
            grows the hit area over the whole 44 x 52 column, "Save"
            label included, without changing the shared component. */}
        <div className="flex min-w-11 flex-col items-center gap-0.5 text-[10px] font-semibold text-wn-navy [&>button:first-child]:relative [&>button:first-child]:before:absolute [&>button:first-child]:before:-inset-x-1 [&>button:first-child]:before:-top-1 [&>button:first-child]:before:-bottom-4 [&>button:first-child]:before:content-['']">
          <FavoriteToggle resortId={resort.id} />
          <span aria-hidden="true">Save</span>
        </div>
        {showCompare && <CompareToggle resortId={resort.id} variant="action" />}
        <button
          type="button"
          onClick={share}
          className={secondary}
          aria-label={`Share ${resort.name}`}
          aria-live="polite"
        >
          <span aria-hidden="true" className="text-base leading-none">⤴</span>
          {shared === "copied" ? "Copied" : shared === "failed" ? "Try again" : "Share"}
        </button>
      </div>
    </div>
  );
}

// ---------- Hero status ----------

const HERO_DOT: Record<ResortStatus["tone"], string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  navy: "bg-wn-sky",
  muted: "bg-wn-charcoal/40",
};

/** Status pill styled for the photo hero: white chip, navy text, tone dot.
 *  Same ResortStatus as the page's pill, so the wording is identical. */
export function HeroStatusPill({ status }: { status: ResortStatus }) {
  return (
    <span className="inline-flex max-w-[60%] shrink-0 items-center gap-1.5 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-wn-navy">
      <span className={`block h-2 w-2 shrink-0 rounded-full ${HERO_DOT[status.tone]}`} aria-hidden="true" />
      <span className="truncate">{status.label}</span>
    </span>
  );
}

// ---------- Status row ----------

export function StatusRow({
  status,
  countdown,
}: {
  status: ResortStatus;
  countdown?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ResortStatusPill status={status} />
      {countdown}
    </div>
  );
}

// ---------- Compare + close cluster (desktop rail) ----------

export function RailControls({ resortId, onClose }: { resortId: number; onClose: () => void }) {
  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
      <CompareToggle resortId={resortId} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-wn-navy shadow-md backdrop-blur-sm transition hover:bg-white"
      >
        <span aria-hidden="true" className="text-lg leading-none">×</span>
      </button>
    </div>
  );
}

// ---------- Nearby ----------

// Round 9 (2026-06) — lazy-loads nearby_restaurants + nearby_activities
// for the open resort so the homepage SSR payload stays small. Audit
// round 2 (resort-panel-detail-10): ONE merged "Top picks nearby" strip
// (recommended first, then nearest) capped at 6. The "See all N places
// nearby" link under it was removed on the founder's call (2026-09-27):
// the full list lives on the resort page, which the sheet's "See full
// mountain page" button already opens.
const TOP_PICKS_LIMIT = 6;

function rankNearby(rows: NearbyRow[]): NearbyRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(!!b.is_recommended) - Number(!!a.is_recommended) ||
      (a.distance_km ?? Number.POSITIVE_INFINITY) - (b.distance_km ?? Number.POSITIVE_INFINITY),
  );
}

export function NearbyInPanel({ resortId }: { resortId: number }) {
  const [rows, setRows] = useState<NearbyRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [r, a] = await Promise.all([fetchNearbyRestaurants(resortId), fetchNearbyActivities(resortId)]);
      if (cancelled) return;
      setRows(rankNearby([...r, ...a]));
    })();
    return () => {
      cancelled = true;
    };
  }, [resortId]);
  if (rows.length === 0) return null;
  const picks = rows.slice(0, TOP_PICKS_LIMIT);
  return (
    <div className="border-t border-wn-charcoal/10 pt-1">
      <NearbyGroup emoji="⭐" label="Top picks nearby" rows={picks} variant="compact" />
    </div>
  );
}
