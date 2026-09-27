// /go — "With my pass, from my city, where should I ride this Saturday,
// and how will the snow feel?" No login. The whole state is in the URL
// (?city=&pass=&product=&max=&day=) so a result is a link, the share
// card (app/go/og) renders the same picks, and the Thursday email deep
// links to the same view.
//
// Data: lib/saturday/cached.ts (lib/saturday/load.ts cached 10 minutes
// per origin + radius, shared with the share card) → lib/saturday/rank.ts
// (pure). The auth read is per request and stays outside the cache.

import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/cronRun";
import { PASS_FAMILIES, productsFor, type PassFamily } from "@/lib/passAccess";
import { passLabel } from "@/lib/passColors";
import { loadCachedSaturdayData } from "@/lib/saturday/cached";
import {
  cityOptions,
  originLabel,
  originTimeZone,
  plannerOriginParams,
  resolveGoOrigin,
  type GoOrigin,
} from "@/lib/saturday/cities";
import { formatTargetDate, upcomingWeekendDate } from "@/lib/saturday/dates";
import { rankInputsFrom } from "@/lib/saturday/load";
import { parsePassProduct, passChoiceLabel } from "@/lib/saturday/passProduct";
import { rankForSaturday, type RankResult } from "@/lib/saturday/rank";
import { goPath, goQuery, goUrl, parseGoParams, type GoState } from "@/lib/saturday/url";
import Card from "@/components/ui/Card";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";
import GoForm from "./GoForm";
import ShareButton from "./ShareButton";
import ThursdayOptIn from "./ThursdayOptIn";
import { CountdownCard, ExcludedList, PickCard, RunnerUpRow, WhyThese } from "./PickCards";

export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app").replace(/\/+$/, "");

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function describe(state: GoState, origin: GoOrigin | null, targetDate: string): { title: string; description: string } {
  const pass = passChoiceLabel({ family: state.pass, product: state.product });
  const from = origin ? originLabel(origin) : "your city";
  return {
    title: `Where to ride ${formatTargetDate(targetDate)} from ${from}`,
    description: `The three best mountains for ${pass} within ${state.max} h of ${from} on ${formatTargetDate(targetDate)}: forecast snow, the surface you will ski, drive time, wind and crowds, with honest confidence.`,
  };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const state = parseGoParams(await searchParams);
  const origin = resolveGoOrigin(state.city, state.lat, state.lng);
  const targetDate = upcomingWeekendDate(new Date(), state.day, origin ? originTimeZone(origin) : undefined);
  const { title, description } = describe(state, origin, targetDate);
  const query = goQuery(state);
  return {
    title,
    description,
    alternates: { canonical: goPath(state) },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${goPath(state)}`,
      images: [{ url: `/go/og?${query}`, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [`/go/og?${query}`] },
  };
}

type Viewer = {
  signedIn: boolean;
  optedIn: boolean;
};

async function readViewer(): Promise<Viewer> {
  try {
    const ssr = await createSupabaseServerClient();
    const { data } = await ssr.auth.getUser();
    const user = data.user;
    if (!user) return { signedIn: false, optedIn: false };
    // profiles.pass_product is the Thursday list (NULL = not opted in);
    // it is added by handoff-docs/sql/2026-09-23-go.sql, and before that
    // the read fails with 42703 and nobody can be opted in. The weekly
    // digest's enabled flag is a separate list and is not consulted.
    const prof = await ssr.from("profiles").select("pass_product").eq("id", user.id).maybeSingle();
    const passProduct =
      prof.error && isMissingSchemaError(prof.error)
        ? null
        : ((prof.data as { pass_product?: string | null } | null)?.pass_product ?? null);
    return { signedIn: true, optedIn: parsePassProduct(passProduct) !== null };
  } catch {
    return { signedIn: false, optedIn: false };
  }
}

export default async function GoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const state = parseGoParams(sp);
  const rawCity = Array.isArray(sp.city) ? sp.city[0] : sp.city;
  const origin = resolveGoOrigin(state.city, state.lat, state.lng);
  const unknownCity = !origin && !!rawCity;
  const now = new Date();
  const tz = origin ? originTimeZone(origin) : undefined;
  const targetDate = upcomingWeekendDate(now, state.day, tz);

  const families = PASS_FAMILIES.map((code) => ({ code, label: passLabel(code) }));
  const productsByFamily = Object.fromEntries(PASS_FAMILIES.map((f) => [f, productsFor(f)])) as Record<
    PassFamily,
    Array<{ productKey: string; product: string }>
  >;

  let result: RankResult | null = null;
  let loadError: string | null = null;
  if (origin) {
    try {
      const data = await loadCachedSaturdayData(origin, state.max);
      result = rankForSaturday({
        ...rankInputsFrom(data),
        passFamily: state.pass,
        product: state.product,
        origin: { lat: origin.lat, lon: origin.lon, name: originLabel(origin) },
        targetDate,
        maxDriveHours: state.max,
        timeZone: tz,
        now,
      });
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
      console.error("[go] load failed", e);
    }
  }
  const viewer = await readViewer();

  const passText = passChoiceLabel({ family: state.pass, product: state.product });
  const fromText = origin ? originLabel(origin) : "your city";
  const summary = `${passText} from ${fromText}`;
  const shareUrl = goUrl(state, SITE_URL);
  const returnPath = goPath(state);
  const dateLong = formatTargetDate(targetDate);
  const planHref = (slug: string) =>
    origin ? `/?plan=1&route=${encodeURIComponent(slug)}&days=1&${plannerOriginParams(origin)}` : `/?plan=1&route=${encodeURIComponent(slug)}`;

  return (
    <main className="min-h-dvh bg-wn-offwhite pb-[max(2rem,env(safe-area-inset-bottom))]">
      <PageHeader
        tone="navy"
        width="max-w-3xl"
        title={`Where to ride ${dateLong}`}
        description="Your pass, your city, the three best mountains for the day, and how the snow will feel. No sign-in."
      />

      <div className="mx-auto -mt-4 max-w-3xl space-y-5 px-4 sm:px-6">
        <Card className="relative z-10">
          <GoForm
            state={state}
            cities={cityOptions()}
            families={families}
            productsByFamily={productsByFamily}
            unknownCity={unknownCity}
          />
        </Card>

        {!origin && (
          <Card className="text-sm text-wn-muted">
            {unknownCity
              ? "That city is not on the launch list yet. Pick one above or use your location."
              : "Pick a city to see this Saturday's picks."}
          </Card>
        )}

        {origin && loadError && (
          <Notice tone="danger" title="The picks could not be loaded right now.">
            Refresh in a moment. The map and resort pages still work.
          </Notice>
        )}

        {origin && result && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-wn-muted">
                <span className="font-semibold text-wn-charcoal">{summary}</span> · within {state.max} h ·{" "}
                {result.horizonDays === 0
                  ? "today"
                  : `${result.horizonDays} day${result.horizonDays === 1 ? "" : "s"} out`}
              </div>
              <ShareButton
                url={shareUrl}
                title={`Where to ride ${dateLong} from ${fromText}`}
                text={
                  result.mode === "picks"
                    ? `${dateLong} · ${passText} from ${fromText} · ${result.picks.map((p) => `${p.rank} ${p.resort.name}`).join(" · ")}`
                    : `${dateLong} · ${passText} from ${fromText}`
                }
              />
            </div>

            {result.mode === "picks" && (
              <>
                <div className="space-y-4">
                  {result.picks.map((p) => (
                    <PickCard key={p.resort.id} pick={p} now={now} planHref={planHref(p.resort.slug)} />
                  ))}
                </div>
                {result.runnersUp.length > 0 && (
                  <Card padding="none" className="px-4 py-2 sm:px-5">
                    <h2 className="pt-2 text-eyebrow font-bold uppercase text-wn-muted">Runners-up</h2>
                    <ul className="divide-y divide-wn-line">
                      {result.runnersUp.map((p) => (
                        <RunnerUpRow key={p.resort.id} pick={p} />
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}

            {result.mode === "no-picks" && (
              <Card>
                <h2 className="text-base font-bold text-wn-navy">Nothing fits {passText} on {dateLong}</h2>
                <p className="mt-1 text-sm text-wn-muted">
                  Mountains within {state.max} h are running, but each one is ruled out for that day. Try the other
                  weekend day, another product, or a wider radius.
                </p>
                <div className="mt-3">
                  <ExcludedList items={result.excluded.slice(0, 12)} />
                </div>
              </Card>
            )}

            {result.mode === "off-season" && (
              <>
                <Card>
                  <h2 className="text-base font-bold text-wn-navy">
                    {result.seasonPhase === "after"
                      ? `The season is over within ${state.max} h of ${fromText}`
                      : `The season has not started within ${state.max} h of ${fromText}`}
                  </h2>
                  <p className="mt-1 text-sm text-wn-muted">
                    No picks until lifts spin: a surface call on a closed mountain would be a guess.{" "}
                    {result.seasonPhase === "after"
                      ? result.countdown.length > 0
                        ? `The mountains ${state.pass ? `on the ${passLabel(state.pass)}` : "within reach"} that have already announced next season:`
                        : "Next season's opening dates are not announced yet."
                      : `These are the first mountains ${state.pass ? `on the ${passLabel(state.pass)}` : "within reach"} to open, by announced date.`}
                  </p>
                </Card>
                {result.countdown.length > 0 ? (
                  <div className="space-y-4">
                    {result.countdown.slice(0, 3).map((c) => (
                      <CountdownCard key={c.resort.id} entry={c} />
                    ))}
                  </div>
                ) : (
                  <Card className="text-sm text-wn-muted">
                    No opening dates published yet for resorts within reach. Check back in the autumn.
                  </Card>
                )}
              </>
            )}

            {result.mode === "none" && (
              <Card className="text-sm text-wn-muted">
                No resort is within {state.max} h of {fromText}. Widen the drive radius above.
              </Card>
            )}

            {result.mode === "picks" && result.excluded.length > 0 && (
              <details className="rounded-wn-md border border-wn-line bg-white p-4 shadow-wn-sm sm:p-5">
                <summary className="min-h-11 cursor-pointer list-none text-base font-bold text-wn-navy marker:content-none">
                  Also within reach, but not on {dateLong} ({result.excluded.length})
                </summary>
                <div className="mt-2">
                  <ExcludedList items={result.excluded.slice(0, 12)} />
                </div>
              </details>
            )}

            {(result.mode === "picks" || result.mode === "no-picks") && (
              <WhyThese result={result} title={result.mode === "picks" ? "Why these three" : "How the picks are chosen"} />
            )}

            <Card className="text-xs leading-relaxed text-wn-muted">
              <h2 className="text-sm font-bold text-wn-navy">About the confidence</h2>
              <p className="mt-1">
                Confidence reflects how far out the day is and how fresh the data is, not how good a pick looks. Two
                days out a snow forecast is often off by a few inches; the surface call is an estimate from the
                weather, not a resort report; crowds are estimates. Every number here names its source and time. Check
                the resort&rsquo;s own report and your pass&rsquo;s blackout dates before you drive.
              </p>
            </Card>

            <ThursdayOptIn
              signedIn={viewer.signedIn}
              optedIn={viewer.optedIn}
              state={state}
              returnPath={returnPath}
              summary={summary}
            />
          </>
        )}
      </div>
    </main>
  );
}
