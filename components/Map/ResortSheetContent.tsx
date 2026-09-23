"use client";

// Content pieces shared by the phone resort sheet and the desktop rail
// (both live in ResortPanel.tsx): hero header, 4-tile stat row, pass
// chips with per-product rules, docked action bar and the compact
// "Top picks nearby" strip. Every number carries its source label
// (Measured / Forecast / Reported / Estimated) and, when the row has a
// stamp, its age; nothing here claims more than the columns hold.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { passColor, passLabel } from "@/lib/passColors";
import { SURFACE_GLOSSARY, type SurfaceCode } from "@/lib/snowSurface";
import type { ResortStatus } from "@/lib/seasonDates";
import SurfaceIcon from "@/components/icons/SurfaceIcon";
import Icon from "@/components/icons/Icon";
import HeroImage from "@/components/HeroImage";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import CompareToggle from "@/components/CompareToggle";
import { ResortStatusPill } from "@/components/SeasonCountdown";
import NearbyGroup from "@/components/NearbyGroup";
import { fetchNearbyRestaurants, fetchNearbyActivities } from "@/lib/fetchNearby";
import type { NearbyRow } from "@/lib/nearbyCategories";
import type { Resort, WeatherSnapshot } from "./MapPage";
import { directionsUrl, formatRelativeAge } from "./ResortSheetMath";

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

/** Photo (or pass-colour gradient) layer with the film-grain overlay. */
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
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{ background: heroGradient(passHex), opacity }}
    >
      {resort.hero_image_url && (
        <HeroImage
          src={resort.hero_image_url}
          alt=""
          compact
          sizes={sizes}
        />
      )}
      <div
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

type Tile = {
  label: string;
  value: string;
  /** Source + age line, e.g. "Measured · 3h ago". */
  source: string;
  accent?: boolean;
  icon?: React.ReactNode;
};

/**
 * The same four tiles as the resort page's at-a-glance strip: new snow /
 * base (or status) / surface / temp. Fixed order so users learn the row
 * once (Slopes, Ikon home). Labels follow the page's wording; the age
 * comes from the row stamps the map already ships.
 */
export function buildStatTiles(
  resort: Resort,
  weather: WeatherSnapshot | null,
  status: ResortStatus,
  now: Date = new Date(),
): Tile[] {
  const reported = resort.snow_report_status === "reported";
  const reportAge = reported ? formatRelativeAge(resort.snow_report_updated_at, now) : null;
  const weatherAge = formatRelativeAge(weather?.fetched_at ?? null, now);
  const withAge = (source: string, age: string | null) => (age ? `${source} · ${age}` : source);

  const tiles: Tile[] = [];

  // 1. New snow. resorts.snow_new_24h_in is written either by a licensed
  //    resort report (Reported) or by the daily NOHRSC / SNOTEL analysis
  //    (Measured, stamped by the same weather sync).
  const snow = resort.snow_new_24h_in;
  tiles.push({
    label: "New snow 24h",
    value: snow != null ? `${snow}"` : "—",
    source:
      snow == null
        ? "Not reported"
        : reported
          ? withAge("Reported", reportAge)
          : withAge("Measured", weatherAge ?? "daily"),
    accent: snow != null && snow > 0,
  });

  // 2. Base depth when the resort reports one, otherwise the derived
  //    open / opens-on status so the tile never sits empty off-season.
  if (resort.snow_base_depth_in != null) {
    tiles.push({
      label: "Base depth",
      value: `${resort.snow_base_depth_in}"`,
      source: withAge("Reported", reportAge),
    });
  } else {
    tiles.push({
      label: "Status",
      value: status.label,
      source: status.detail ?? (status.kind === "unknown" ? "Check the resort" : "Season dates"),
    });
  }

  // 3. Surface class: written by the daily forecast run, null while the
  //    surface model is dormant (closed / off-season / no evidence).
  const code = resort.current_surface_class as SurfaceCode | null;
  const glossary = code ? SURFACE_GLOSSARY[code] : undefined;
  tiles.push(
    glossary
      ? {
          label: "Surface",
          value: glossary.label,
          source: withAge("Forecast", weatherAge ?? "today"),
          icon: <SurfaceIcon code={code as SurfaceCode} className="h-4 w-4 text-wn-navy" />,
        }
      : {
          label: "Surface",
          value: "Paused",
          source: status.dormant ? "Until lifts run" : "No forecast yet",
        },
  );

  // 4. Today's high from weather_cache (the forecast row).
  tiles.push({
    label: weather?.conditions_short ? weather.conditions_short : "High today",
    value: weather?.temp_high_f != null ? `${weather.temp_high_f}°F` : "—",
    source: weather?.temp_high_f != null ? withAge("Forecast", weatherAge ?? "today") : "Not synced",
  });

  return tiles;
}

export function StatRow({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="grid grid-cols-4 gap-1.5" aria-label="Conditions at a glance">
      {tiles.map((t) => (
        <div key={t.label} className="min-w-0 rounded-xl bg-wn-navy/5 px-2 py-2">
          <dt className="truncate text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            {t.label}
          </dt>
          <dd
            className={[
              "mt-0.5 flex items-center gap-1 truncate text-[17px] font-extrabold leading-tight tracking-tight tabular-nums",
              t.accent ? "text-wn-sky" : "text-wn-navy",
            ].join(" ")}
          >
            {t.icon}
            <span className="truncate">{t.value}</span>
          </dd>
          <dd className="truncate text-[10px] leading-tight text-wn-charcoal/55">{t.source}</dd>
        </div>
      ))}
    </dl>
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
      <div className="flex flex-wrap gap-1.5">
        {resort.passes.map((p) => {
          const fg = p === "ikon" ? "#1E2952" : "#FFFFFF";
          if (!PASS_FAMILIES_WITH_RULES.has(p)) {
            return (
              <span
                key={p}
                className="inline-flex h-7 items-center rounded-md px-2 text-[11px] font-semibold"
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
              className={`inline-flex h-7 items-center rounded-md px-2 text-[11px] font-semibold transition ${
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
 * · Save · Share. Google Maps pinned the same row to the bottom of its
 * place sheet in Sept 2025 so the main action never scrolls away.
 */
export function ActionBar({
  resort,
  lat,
  lng,
  onPlanTrip,
  safeArea = true,
}: {
  resort: Resort;
  lat: number;
  lng: number;
  onPlanTrip: () => void;
  safeArea?: boolean;
}) {
  const [shared, setShared] = useState<"idle" | "copied" | "failed">("idle");
  const canDirect = Number.isFinite(lat) && Number.isFinite(lng);

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
    "inline-flex h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-[10px] font-semibold text-wn-navy transition hover:bg-wn-navy/5 active:scale-95";

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
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-wn-gold px-4 text-sm font-bold text-wn-navy shadow-sm transition hover:bg-wn-gold/90 active:scale-[0.98]"
        >
          <Icon name="trips" className="h-4 w-4" />
          Plan trip
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
        <div className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-wn-navy">
          <FavoriteToggle resortId={resort.id} />
          <span aria-hidden="true">Save</span>
        </div>
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
// (recommended first, then nearest) capped at 6, with a link to the full
// section on the resort page.
const TOP_PICKS_LIMIT = 6;

function rankNearby(rows: NearbyRow[]): NearbyRow[] {
  return [...rows].sort(
    (a, b) =>
      Number(!!b.is_recommended) - Number(!!a.is_recommended) ||
      (a.distance_km ?? Number.POSITIVE_INFINITY) - (b.distance_km ?? Number.POSITIVE_INFINITY),
  );
}

export function NearbyInPanel({ resortId, slug }: { resortId: number; slug: string }) {
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
      {rows.length > picks.length && (
        <Link
          href={`/resort/${slug}#around-the-resort`}
          className="mt-1 inline-block text-[12px] font-semibold text-wn-navy underline-offset-2 hover:underline"
        >
          See all {rows.length} places nearby →
        </Link>
      )}
    </div>
  );
}
