// Stage 28 — public read-only view of a shared trip. Anyone with the
// token URL can see the trip name + origin + ordered stops. No login
// required; no edit actions.

import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { passColor, primaryPass } from "@/lib/passColors";
import { formatDriveTime } from "@/lib/origins";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Icon from "@/components/icons/Icon";

export const dynamic = "force-dynamic";

// Share links are meant for the people the owner sent them to, not for
// search engines: NOINDEX. app/robots.ts explicitly ALLOWS /trip/share/
// so crawlers can fetch the page and read that tag (a disallowed URL can
// still be indexed title-less from an inbound link). The title still
// names the trip so the link previews nicely in iMessage / Slack (audit
// finding content-seo-8).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const data = await getData(token);
  const robots = { index: false, follow: false };
  if (!data) return { title: "Shared trip", robots };
  const { trip, bySlug } = data;
  const stops = Array.from(new Set(trip.resort_slugs ?? []))
    .map((s) => bySlug.get(s)?.name)
    .filter((n): n is string => Boolean(n));
  const dayWord = trip.total_days === 1 ? "day" : "days";
  const description = [
    `${trip.total_days} ${dayWord}`,
    trip.origin_label ? `from ${trip.origin_label}` : null,
    stops.length ? `stops: ${stops.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    title: `${trip.name} — shared trip`,
    description,
    robots,
    openGraph: {
      title: `${trip.name} — shared trip · Wynla`,
      description,
      images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
    },
  };
}

type Trip = {
  id: string;
  name: string | null;
  origin_lat: number;
  origin_lng: number;
  origin_label: string | null;
  resort_slugs: string[];
  days_per_resort: number[] | null;
  total_days: number;
  created_at: string;
  /** date (YYYY-MM-DD); absent until the start_date DDL has run. */
  start_date?: string | null;
};

type ResortRow = {
  id: number;
  slug: string;
  name: string;
  state: string;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
};

// React cache() dedupes the lookup between generateMetadata and the page
// within one request, so the view_count bump below runs once per view.
const getData = cache(async function getData(token: string) {
  // Resolve the token then read the user-owned trips table with a SERVICE-ROLE
  // client so the anon client never touches trips directly (no id-enumeration
  // outside the token flow, regardless of RLS). Falls back to the anon client
  // if the service key isn't configured, keeping the feature working — note
  // that once handoff-docs/sql/2026-09-23-hygiene.sql makes trip_shares
  // owner-only, that fallback returns 404 for every link, so the service
  // key is effectively required in every environment.
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const db =
    svcKey && url
      ? createClient(url, svcKey, { auth: { persistSession: false } })
      : supabase;

  const { data: share } = await db
    .from("trip_shares")
    .select("trip_id, view_count")
    .eq("share_token", token)
    .maybeSingle();
  if (!share) return null;
  // Bump view count. Awaited on purpose: a supabase-js query builder only
  // sends its request when awaited/then-ed, so a bare `void db.from(...)`
  // never hit the network and the counter stayed at 0. Errors are ignored
  // because the counter is informational and must never block the page.
  await db
    .from("trip_shares")
    .update({ view_count: ((share as { view_count: number }).view_count ?? 0) + 1 })
    .eq("share_token", token)
    .then(() => undefined, () => undefined);

  const tripId = (share as { trip_id: string }).trip_id;
  // select("*") feature-detects trips.start_date for free: before the
  // DDL runs the key is simply absent from the row (no 42703, no second
  // round-trip). The row is filtered by id, so nothing extra leaks.
  const { data: trip } = await db
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;
  const t = trip as Trip;

  const slugs = Array.from(new Set(t.resort_slugs ?? []));
  const { data: resorts } = await supabase
    .from("resorts")
    .select("id, slug, name, state, latitude, longitude, passes")
    .in("slug", slugs);
  const bySlug = new Map((resorts as ResortRow[] | null ?? []).map((r) => [r.slug, r]));
  return { trip: t, bySlug };
});

// Calendar date for ski day N when the trip has a start date. Parsed
// part-by-part so a bare date stays on that day in every time zone.
function dateForDay(startDate: string, dayIndex: number): Date {
  const [y, m, d] = startDate.split("-").map(Number);
  return new Date(y, m - 1, d + dayIndex);
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getData(token);
  if (!data) notFound();
  const { trip, bySlug } = data;

  const tripName = trip.name?.trim() || "Ski trip";
  const startDate =
    typeof trip.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(trip.start_date)
      ? trip.start_date
      : null;

  // Expand resort_slugs by days_per_resort into the day-by-day plan,
  // then compute drive legs between consecutive resorts.
  const days: { day: number; resort: ResortRow | null; slug: string }[] = [];
  if (trip.days_per_resort && trip.days_per_resort.length === trip.resort_slugs.length) {
    let dayN = 1;
    for (let i = 0; i < trip.resort_slugs.length; i++) {
      const slug = trip.resort_slugs[i];
      const resort = bySlug.get(slug) ?? null;
      const repeat = Math.max(1, trip.days_per_resort[i] ?? 1);
      for (let d = 0; d < repeat; d++) {
        days.push({ day: dayN++, resort, slug });
      }
    }
  } else {
    trip.resort_slugs.forEach((slug, i) =>
      days.push({ day: i + 1, resort: bySlug.get(slug) ?? null, slug }),
    );
  }

  // Drive legs (origin → first, between consecutive, last → home).
  // Consecutive repeats of the same resort are one stop, not a
  // zero-length "Vail → Vail" leg — trips edited from the trip page
  // are stored one slug per day, so the raw list repeats a lot.
  const legStops: ResortRow[] = [];
  for (const d of days) {
    if (!d.resort) continue;
    if (legStops[legStops.length - 1]?.slug === d.resort.slug) continue;
    legStops.push(d.resort);
  }
  const legs: number[] = [];
  let prevLat = trip.origin_lat;
  let prevLng = trip.origin_lng;
  for (const r of legStops) {
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    legs.push(estimateDriveSeconds(haversineMeters(prevLat, prevLng, lat, lng)));
    prevLat = lat;
    prevLng = lng;
  }
  const homeLeg = estimateDriveSeconds(
    haversineMeters(prevLat, prevLng, trip.origin_lat, trip.origin_lng),
  );

  const firstResort = legStops[0];
  const heroPrimary = firstResort ? primaryPass(firstResort.passes) : "indy";
  const heroAccent = passColor(heroPrimary);
  const dateFormat: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const startLabel = startDate
    ? dateForDay(startDate, 0).toLocaleDateString("en-US", { ...dateFormat, year: "numeric" })
    : null;
  const endLabel =
    startDate && days.length > 1
      ? dateForDay(startDate, days.length - 1).toLocaleDateString("en-US", { ...dateFormat, year: "numeric" })
      : null;

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      {/* No back link here: the AppShell bar already links to the map. */}
      <PageHeader
        tone="navy"
        accent={heroAccent}
        width="max-w-3xl"
        eyebrow={
          <>
            🛣️ Shared trip · {trip.total_days} day{trip.total_days === 1 ? "" : "s"}
            {trip.origin_label ? " · from " + trip.origin_label : ""}
          </>
        }
        title={tripName}
        meta={`Shared ${new Date(trip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
      >
        {startLabel && (
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/95 backdrop-blur-sm">
            <Icon name="calendar" className="h-3.5 w-3.5" />
            <span>{endLabel ? `${startLabel} – ${endLabel}` : startLabel}</span>
          </p>
        )}
      </PageHeader>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h2 className="mb-3 text-eyebrow font-bold uppercase text-wn-muted">Day-by-day</h2>
        <ol className="flex flex-col gap-2">
          {days.map((d) => (
            <li
              key={d.day}
              className="flex items-center gap-3 rounded-wn-sm border border-wn-line bg-white p-3"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wn-navy text-xs font-bold text-white tabular-nums">
                {d.day}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-wn-navy">
                  {d.resort?.name ?? d.slug}
                </div>
                <div className="text-xs text-wn-muted">
                  {startDate
                    ? dateForDay(startDate, d.day - 1).toLocaleDateString("en-US", dateFormat)
                    : `Day ${d.day}`}
                  {d.resort?.state ? ` · ${d.resort.state}` : ""}
                </div>
              </div>
              {d.resort && (
                <Link
                  href={`/resort/${d.slug}`}
                  className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-wn-muted underline-offset-2 hover:text-wn-navy hover:underline"
                >
                  View
                </Link>
              )}
            </li>
          ))}
        </ol>

        <Card className="mt-6">
          <h3 className="mb-2 text-eyebrow font-bold uppercase text-wn-muted">Drive summary</h3>
          <ul className="space-y-1 text-sm text-wn-charcoal">
            {legStops.map((r, i) => (
              <li key={`${r.slug}-${i}`} className="flex justify-between gap-3">
                <span>
                  {i === 0 ? "Home" : legStops[i - 1].name} → {r.name}
                </span>
                <span className="font-semibold text-wn-navy">
                  ≈ {formatDriveTime(legs[i])}
                </span>
              </li>
            ))}
            {legStops.length > 0 && (
              <li className="flex justify-between gap-3">
                <span>{legStops[legStops.length - 1].name} → Home</span>
                <span className="font-semibold text-wn-navy">≈ {formatDriveTime(homeLeg)}</span>
              </li>
            )}
          </ul>
          <p className="mt-2 text-xs text-wn-muted">
            Drive times are straight-line estimates, not live traffic.
          </p>
        </Card>

        <p className="mt-6 text-center text-xs text-wn-muted">
          This is a read-only view of someone&apos;s trip plan.{" "}
          <Link href="/" className="font-semibold text-wn-navy underline">
            Plan your own at Wynla
          </Link>
        </p>
      </div>
    </main>
  );
}
