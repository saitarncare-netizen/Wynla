// Stage 8 — Editorial guides. Long-form static content (not user-generated)
// that answers high-intent search queries: "Ikon vs Epic 2026-27", "best
// beginner Colorado", etc. Each guide is a server-rendered React node so
// we can mix paragraphs, headers, lists, tables, and internal links to
// /resort/[slug] pages without bringing in MDX or a CMS.
//
// Keep voice plain-English and resort-knowledgeable. Internal links to
// resorts use slugs that exist in the DB (audited 2026-05-14).

import type { ReactNode } from "react";
import React from "react";
import Link from "next/link";

export type Guide = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  publishedAt: string;
  readingMinutes: number;
  body: ReactNode;
};

// Convenience helper — `<R slug="alta">Alta</R>` renders a styled
// internal link to /resort/[slug]. Anchor styling is centralised so a
// body change doesn't touch every link.
function R({ slug, children }: { slug: string; children: ReactNode }) {
  return React.createElement(
    Link,
    {
      href: `/resort/${slug}`,
      className: "font-semibold text-wn-navy underline-offset-2 hover:underline",
    },
    children,
  );
}

export const GUIDES: Guide[] = [
  {
    slug: "ikon-vs-epic-2026-27",
    title: "Ikon vs Epic Pass 2026-27",
    subtitle: "Which megapass should you buy this season?",
    description:
      "Side-by-side comparison of Ikon Pass and Epic Pass for 2026-27: resort lineup, regional strengths, pricing tiers, blackout rules, and who each pass is for.",
    publishedAt: "2026-05-14",
    readingMinutes: 9,
    body: (
      <>
        <p>
          If you ski more than five days a year in the United States, the
          question isn&apos;t whether to buy a season pass — it&apos;s whether
          you buy Ikon or Epic. Both passes break even at roughly five to
          seven lift-ticket days, and both lock you into a network that will
          shape every trip you plan next winter. Picking the wrong one for
          your geography or skill level costs hundreds of dollars and a lot
          of regret in February.
        </p>
        <p>
          Here&apos;s the plain-English version of how the 2026-27 lineups
          stack up, who each pass is built for, and where the two networks
          actually overlap.
        </p>

        <h2>The short answer</h2>
        <ul>
          <li>
            <strong>Buy Ikon</strong> if you live near or fly into the Mountain
            West (Utah, Wyoming, Montana, Colorado&apos;s Roaring Fork) and want
            big-mountain terrain — Alta, Snowbird, Jackson Hole, Big Sky,
            Aspen Snowmass — plus Mammoth and Killington on the coasts.
          </li>
          <li>
            <strong>Buy Epic</strong> if you live near or fly into Colorado&apos;s
            I-70 corridor (Vail, Breckenridge, Keystone, Beaver Creek), Park
            City, Whistler, or any Vail-owned northeast mountain (Stowe,
            Okemo, Mount Snow, Hunter). Epic is also the better deal for
            families that ski lots of weekend days at smaller Vail-owned
            mountains.
          </li>
          <li>
            <strong>Neither is &quot;better&quot;</strong> — they&apos;re
            different networks. Look at where you actually ski.
          </li>
        </ul>

        <h2>Resort count and lineup</h2>
        <p>
          Both passes list 40+ destinations, but the headline number isn&apos;t
          useful — partner resorts often have day limits, and small partner
          mountains pad the count. What matters is the &quot;unlimited&quot;
          list, the resorts where the pass is good every day with no
          restrictions.
        </p>
        <p>
          Ikon&apos;s flagship unlimited resorts include{" "}
          <R slug="steamboat">Steamboat</R>, <R slug="winter-park">Winter Park</R>,
          <R slug="copper-mountain"> Copper Mountain</R>,{" "}
          <R slug="mammoth-mountain">Mammoth Mountain</R>, and{" "}
          <R slug="killington">Killington</R>. Top-tier base passes add limited
          days at <R slug="alta">Alta</R>, <R slug="snowbird">Snowbird</R>,
          <R slug="jackson-hole"> Jackson Hole</R>, <R slug="big-sky">Big Sky</R>,
          <R slug="aspen-snowmass"> Aspen Snowmass</R>, and{" "}
          <R slug="sugarbush">Sugarbush</R>.
        </p>
        <p>
          Epic&apos;s unlimited list is built around Vail Resorts:{" "}
          <R slug="vail">Vail</R>, <R slug="beaver-creek">Beaver Creek</R>,
          <R slug="breckenridge"> Breckenridge</R>, <R slug="keystone">Keystone</R>,
          <R slug="park-city"> Park City</R>, <R slug="northstar-california">Northstar</R>,
          and <R slug="stowe-mountain-resort">Stowe</R> with no blackouts on
          the full pass. Local-tier Epic passes still let you ski Vail and
          Breck most of the season, just not during the December holiday
          window.
        </p>

        <h2>Regional strengths</h2>
        <h3>Mountain West</h3>
        <p>
          Ikon wins Utah outright — Alta, Snowbird, Brighton, and Solitude
          are all on Ikon. Epic counters with Park City (the largest US
          resort by acreage), plus Snowbasin via partner-pass agreements.
          For pure terrain quality, Ikon is the better Utah pass. For
          big-name brand recognition and on-mountain lodging, Park City
          alone makes Epic worth considering.
        </p>
        <p>
          In Wyoming and Montana, Ikon dominates: Jackson Hole, Grand Targhee,
          and Big Sky are all on Ikon. Epic has no presence here.
        </p>

        <h3>Colorado</h3>
        <p>
          Colorado is the closest thing to a fair fight. Ikon owns Steamboat,
          Winter Park, Copper, Eldora, and Aspen. Epic owns Vail, Beaver
          Creek, Breckenridge, Keystone, and Crested Butte. If your trips
          start in Denver and you drive west on I-70, Epic gives you the
          most resorts within 90 minutes; Ikon means a longer drive to
          Steamboat or Winter Park but fewer crowds at peak.
        </p>

        <h3>California / Nevada</h3>
        <p>
          Ikon: <R slug="mammoth-mountain">Mammoth</R>,{" "}
          <R slug="palisades-tahoe">Palisades Tahoe</R>. Epic:{" "}
          <R slug="northstar-california">Northstar</R>, Kirkwood, and Heavenly.
          Mammoth is the strongest single mountain on either list for
          California skiers — Ikon wins here for serious skiers, Epic wins
          for Lake Tahoe location and family amenities.
        </p>

        <h3>Northeast</h3>
        <p>
          Epic has the volume: Stowe, Okemo, Mount Snow, Hunter, Wildcat,
          Attitash, Crotched, Mount Sunapee. Ikon counters with Killington
          (the biggest mountain in the East), Sugarbush, and Sugarloaf.
          For an East Coast skier who wants one mountain to ski 30 days,
          Killington (Ikon) is the answer. For someone splitting weekends
          across many resorts, Epic.
        </p>

        <h2>Pricing tiers (2026-27 early-bird estimates)</h2>
        <p>
          Both passes use a tiered price ladder. The cheapest options have
          blackouts or limited days, the most expensive options have none.
          Final prices are confirmed in March each year; numbers here are
          based on the early-bird structure published in spring 2026.
        </p>
        <ul>
          <li>
            <strong>Epic Pass (full):</strong> ~$1,000 early-bird, no
            blackouts, unlimited at every Vail-owned mountain, plus 5-7 days
            at international partners like the Three Valleys.
          </li>
          <li>
            <strong>Epic Local:</strong> ~$745 early-bird, blackouts at Vail
            / Beaver Creek / Breckenridge during the December and February
            holiday weeks; otherwise unlimited.
          </li>
          <li>
            <strong>Ikon Pass (full):</strong> ~$1,260 early-bird, no
            blackouts at unlimited resorts, 5-7 days each at the headline
            destinations (Jackson, Aspen, Big Sky, Alta/Snowbird).
          </li>
          <li>
            <strong>Ikon Base:</strong> ~$895 early-bird, blackouts at the
            unlimited resorts on peak holiday weeks plus a smaller number of
            partner days.
          </li>
        </ul>
        <p>
          The Epic Day Pass (pick 1-7 days at locked-in mountains) is the
          cheapest entry point into either ecosystem and is the right buy
          for anyone skiing four days or fewer.
        </p>

        <h2>Blackout rules to actually pay attention to</h2>
        <ul>
          <li>
            Epic Local blacks out Vail, Beaver Creek, and Breck for{" "}
            <strong>December 26–31</strong> and{" "}
            <strong>February 14–16</strong>. If you ski those weeks, you need
            the full Epic.
          </li>
          <li>
            Ikon Base blacks out the unlimited resorts (Winter Park,
            Steamboat, Copper) the same weeks plus MLK weekend. Ikon Base
            Plus removes the MLK weekend blackouts at most resorts for an
            extra ~$150.
          </li>
          <li>
            Partner-resort days on both passes (Jackson, Aspen, Big Sky for
            Ikon; international partners for Epic) are <strong>not</strong>
            {" "}unlimited — they&apos;re capped at 5 or 7 days regardless of
            blackouts.
          </li>
        </ul>

        <h2>Who each pass is for</h2>
        <h3>Buy Ikon if you&apos;re…</h3>
        <ul>
          <li>
            An advanced or expert skier who wants Jackson, Alta, Snowbird,
            and Big Sky on one pass.
          </li>
          <li>
            A Salt Lake City local — Ikon is the obvious Utah pass.
          </li>
          <li>
            A traveler who likes destination trips (Aspen, Jackson, Mammoth)
            and doesn&apos;t need lots of small-mountain days.
          </li>
          <li>
            An East Coast skier who plans to ski Killington 15+ days.
          </li>
        </ul>

        <h3>Buy Epic if you&apos;re…</h3>
        <ul>
          <li>
            A Front Range Colorado skier driving up I-70 on weekends —
            Breckenridge and Keystone are 90 minutes from Denver.
          </li>
          <li>
            A family skier who values consistent on-mountain operations,
            big ski schools, and lots of intermediate terrain (Vail,
            Beaver Creek, Park City all excel here).
          </li>
          <li>
            A Northeast skier splitting weekends across multiple resorts
            (Stowe, Okemo, Mount Snow, Hunter).
          </li>
          <li>
            Planning one big trip to Whistler or the European Alps — Epic
            has the strongest international footprint.
          </li>
        </ul>

        <h2>The Indy Pass and Mountain Collective angle</h2>
        <p>
          If you ski five days or fewer, neither megapass pays off. The Indy
          Pass (~$329, two days at each of ~100 independent resorts) is
          better for variety hunters. The Mountain Collective (~$609, two
          days at each of 24 destination resorts including Jackson, Alta,
          Snowbird, Aspen, Banff, Chamonix) is the right buy if you&apos;re
          taking one big trip a year and want a sampler approach.
        </p>

        <h2>Bottom line</h2>
        <p>
          Pick your pass by your three most likely trips. If two of those
          trips are to Vail-owned mountains, buy Epic. If two are to Alterra
          / Ikon partner mountains (Jackson, Alta, Big Sky, Killington,
          Mammoth), buy Ikon. If it&apos;s a mixed bag, count days at each
          resort and do the math against the Day Pass.
        </p>

        <h3>Related</h3>
        <ul>
          <li>
            <Link
              href="/lists/epic-pass-must-ski"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Epic Pass must-ski list →
            </Link>
          </li>
          <li>
            <Link
              href="/lists/ikon-pass-must-ski"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Ikon Pass must-ski list →
            </Link>
          </li>
          <li>
            <Link
              href="/lists/indy-pass-hidden-gems"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Indy Pass hidden gems →
            </Link>
          </li>
        </ul>
      </>
    ),
  },

  {
    slug: "best-beginner-resorts-colorado",
    title: "Best Beginner Resorts in Colorado",
    subtitle: "Where to learn — and where to come back for your second season",
    description:
      "Seven Colorado resorts that get learn-to-ski right. Green-trail acreage, gondolas, ski-school quality, and which ones are easy day trips from Denver.",
    publishedAt: "2026-05-14",
    readingMinutes: 8,
    body: (
      <>
        <p>
          Colorado&apos;s reputation as expert terrain hides a less-told story:
          some of the best learn-to-ski programs in the country are here.
          What matters for a beginner isn&apos;t the size of the mountain
          — it&apos;s the size, isolation, and quality of the beginner
          terrain, plus how easy it is to get on it on a busy Saturday.
        </p>
        <p>
          The best beginner resorts have three things in common: enough green
          terrain that you&apos;re not stuck on one bunny slope all day, lift
          access (preferably a gondola or chondola, not a button lift), and
          a learning area that&apos;s segregated from advanced skiers ripping
          past at 30 mph. Here are the seven resorts that do this well.
        </p>

        <h2>1. <R slug="beaver-creek">Beaver Creek</R></h2>
        <p>
          Beaver Creek invented &quot;Beginner Bowl&quot; — an entire ski-only
          area at the top of the mountain reserved for green and easy-blue
          terrain. You take the Centennial Express up to the top, ski wide,
          shallow-pitched groomers all day, and never deal with traffic from
          experts. The ski school is consistently rated the best in
          Colorado. The catch: lodging is expensive ($600+ a night for
          on-mountain in peak season). Day-trippers from Denver can do it,
          but it&apos;s a 2-hour drive each way.
        </p>
        <ul>
          <li>Green / easy-blue terrain: ~34% of mountain</li>
          <li>Pass: Epic</li>
          <li>Best for: families willing to spend on lodging and lessons</li>
        </ul>

        <h2>2. <R slug="keystone">Keystone</R></h2>
        <p>
          Keystone&apos;s Schoolyard is a dedicated 7-acre beginner area at
          the base with three magic carpets and a chairlift, completely
          separated from the rest of the mountain. Past the first day,
          beginners progress to Schoolmarm — a 3.5-mile-long top-to-bottom
          green run that&apos;s genuinely scenic, not just a flat catwalk.
          Keystone is 90 minutes from Denver, which makes it a viable
          day-trip option, and the on-mountain village is more affordable
          than Beaver Creek.
        </p>
        <ul>
          <li>Green terrain: ~12% (but the green runs are long)</li>
          <li>Pass: Epic</li>
          <li>Best for: Denver day-trippers, multi-day learning trips</li>
        </ul>

        <h2>3. <R slug="winter-park">Winter Park</R></h2>
        <p>
          Winter Park&apos;s Discovery Park is one of the largest
          dedicated beginner zones in North America — 25 acres at mid-mountain,
          accessed by its own chairlift, with around a dozen green trails
          plus learning terrain. Winter Park is on Ikon (more affordable
          than Epic if you&apos;re only doing a few days), and the train
          from downtown Denver — the Winter Park Express, weekends only —
          drops you 100 yards from the lifts.
        </p>
        <ul>
          <li>Discovery Park: ~25 acres beginner-only</li>
          <li>Pass: Ikon</li>
          <li>Best for: Ikon families, train-from-Denver fans</li>
        </ul>

        <h2>4. <R slug="breckenridge">Breckenridge</R></h2>
        <p>
          Breck is two mountains depending on where you stand. The expert
          side is intimidating. The beginner side, accessed via Peak 9 and
          the BreckConnect Gondola, is one of the gentler high-altitude
          learning areas in the state. Long, wide greens like Trygve&apos;s
          and Silverthorne let you cover real distance without getting
          spooked. Breck&apos;s downside is altitude — at 9,600 ft base,
          first-day beginners coming from sea level will feel it.
        </p>
        <ul>
          <li>Pass: Epic</li>
          <li>Best for: families pairing a Breck stay with day trips to Keystone or Vail</li>
        </ul>

        <h2>5. <R slug="copper-mountain">Copper Mountain</R></h2>
        <p>
          Copper&apos;s genius is its layout: the mountain is segmented
          left-to-right by ability. The west side (Copper Bowl) is expert,
          the center is intermediate, and the east side is almost entirely
          beginner. Beginners ride the Lumberjack lift to the Easyrider
          area and can stay there all day without seeing an expert trail.
          The Woodward Copper terrain park has a dedicated beginner park
          (&quot;Pipeline&quot;) for first-time freestyle.
        </p>
        <ul>
          <li>Pass: Ikon</li>
          <li>Best for: ability-segregated learning, terrain park curious</li>
        </ul>

        <h2>6. <R slug="eldora">Eldora Mountain</R></h2>
        <p>
          Eldora is the local secret. It&apos;s 45 minutes from Boulder,
          tiny by Colorado standards (~680 skiable acres), and one of the
          most beginner-friendly mountains in the state. Crowds are
          mostly Front Range families, lift lines are short on weekdays,
          and the entire west side of the mountain is green / easy-blue.
          Day-pass prices are dramatically lower than the I-70 resorts.
        </p>
        <ul>
          <li>Pass: Ikon</li>
          <li>Best for: Boulder-area families, second-season cheap ski days</li>
        </ul>

        <h2>7. <R slug="loveland">Loveland</R></h2>
        <p>
          Loveland is the affordable answer. No frills, no village, no
          high-speed quads, and one of the lowest day-pass prices in the
          state. The basin lift accesses a wide-open beginner area with
          gentle pitches and the run-out is forgiving. It&apos;s an hour
          from Denver, opens early (mid-October) and stays open late
          (mid-May), making it ideal for cheap first-day-of-the-season
          lessons.
        </p>
        <ul>
          <li>Pass: Indy partner</li>
          <li>Best for: budget families, sea-level visitors easing into altitude</li>
        </ul>

        <h2>How to actually pick</h2>
        <p>
          For first-timers, prioritise lesson quality over mountain size:
          Beaver Creek and Keystone have the strongest programs. If
          you&apos;re self-teaching or already past beginner, the size of
          the green network matters more — Winter Park&apos;s Discovery
          Park and Copper&apos;s Easyrider area give you more variety than
          most.
        </p>
        <p>
          For Denver day-trippers without a kid in lessons, Loveland and
          Eldora win on price and proximity. If you&apos;re flying in,
          drive time from DIA matters: Keystone, Copper, Breck, and Vail
          are all 90-120 minutes; Winter Park is 90 via I-70 / US-40;
          Beaver Creek is 2 hours; Steamboat is 3+ hours. Pick by drive
          time, not Instagram photos.
        </p>

        <h3>Related</h3>
        <ul>
          <li>
            <Link
              href="/lists/best-for-beginners"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Best-for-beginners list →
            </Link>
          </li>
          <li>
            <Link
              href="/state/co"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              All Colorado ski resorts →
            </Link>
          </li>
        </ul>
      </>
    ),
  },

  {
    slug: "best-family-ski-resorts-new-england",
    title: "Best Family Ski Resorts in New England",
    subtitle: "Ski school, kids' terrain, and lodging that won't ruin your week",
    description:
      "Six New England resorts that families return to year after year. Ski school strength, lodging on-mountain vs day-tripper distance, night skiing, easy-line terrain parks.",
    publishedAt: "2026-05-14",
    readingMinutes: 7,
    body: (
      <>
        <p>
          A &quot;family-friendly&quot; ski resort isn&apos;t one with more
          green trails — it&apos;s one where logistics don&apos;t ruin the
          day. Ski school check-in that takes 45 minutes burns a third of
          your morning. Lift lines spread across a sprawling base area
          turn a five-year-old into a meltdown. The right family mountain
          puts childcare, rentals, lessons, and the chairlift within a
          200-yard radius of where you parked.
        </p>
        <p>
          These six New England resorts get the operational details right.
          They aren&apos;t necessarily the biggest mountains in the region,
          but they&apos;re the ones where parents and kids actually have a
          good week.
        </p>

        <h2>1. <R slug="smugglers-notch">Smugglers&apos; Notch (VT)</R></h2>
        <p>
          Smuggs has been winning &quot;best family resort in the East&quot;
          surveys for two decades, and it&apos;s not close. The reasons
          are structural: a dedicated kids-only mountain (Sir Henry&apos;s
          Hill), all-day childcare for ages 6 weeks and up, on-mountain
          condos sized for families of 4-8, and ski-school class sizes
          capped lower than competitors. They run a snowshoe program for
          parents while kids are in lessons. The slow lift speed, often
          criticised by serious skiers, is precisely why parents like it
          — kids learn to load and unload without panic.
        </p>
        <ul>
          <li>Best for: ages 3-10, week-long stays, multi-generation trips</li>
          <li>Lodging: on-mountain condos (book direct)</li>
        </ul>

        <h2>2. <R slug="loon-mountain">Loon Mountain (NH)</R></h2>
        <p>
          Loon&apos;s biggest advantage is its proximity — 2.5 hours from
          Boston on a clear day, with the lodge essentially at I-93 exit
          32. Day-tripper families don&apos;t have to commit to a hotel.
          Loon has one of the cleanest base-area layouts in New England:
          parking lots feed directly into the South Peak base, ski school
          check-in is signposted obviously, and the Adventure Center is
          where parents drop kids and head to the gondola.
        </p>
        <ul>
          <li>Best for: Boston-area weekend day trips</li>
          <li>Pass: Ikon</li>
        </ul>

        <h2>3. <R slug="mountain-creek">Mountain Creek (NJ)</R></h2>
        <p>
          The most underrated family mountain in the East. It&apos;s 90
          minutes from NYC, has the longest night-skiing operation in the
          region (open until 10pm most nights), and the South lodge is
          built for absolute beginners — magic carpets, learning slopes,
          and a heated indoor activity area for kids done early. Mountain
          Creek doubles as a year-round resort with a waterpark, which
          means the lodging infrastructure is sized for families even when
          there&apos;s no snow.
        </p>
        <ul>
          <li>Best for: NYC-area first-timers, families with non-skiing siblings</li>
          <li>Pass: Indy (limited days)</li>
        </ul>

        <h2>4. <R slug="wachusett-mountain">Wachusett (MA)</R></h2>
        <p>
          Wachusett is a small mountain — 110 acres, 2,000-foot summit —
          but for a Boston-area family with kids in their first or second
          season, it&apos;s ideal. Less than an hour from Boston, $80
          adult night tickets, lessons that start every 90 minutes, and
          night skiing till 10pm. Most importantly, the mountain is small
          enough that a 7-year-old can&apos;t get lost. Parents put kids
          in lessons, ski a few easy laps, and meet at the lodge without
          coordinating a search party.
        </p>
        <ul>
          <li>Best for: Boston-area learners, after-school programs</li>
          <li>Pass: Indy + day</li>
        </ul>

        <h2>5. <R slug="cranor-ski-hill">Cranmore (NH)</R> region</h2>
        <p>
          Cranmore is the under-the-radar pick in North Conway. Small
          (~200 acres), in-town (you can walk from your hotel to the
          lifts), and built around a family adventure park. The Mountain
          Coaster, the Soaring Eagle Zip, and the indoor aerial adventure
          park give non-skiing days something to do — which matters when
          you&apos;re stuck in town with a 5-year-old in 12°F weather.
          Cranmore pairs well with a day trip to Attitash or Wildcat for
          parents looking for bigger terrain.
        </p>
        <ul>
          <li>Best for: in-town walkable family bases, mixed-interest groups</li>
          <li>Pass: Indy</li>
        </ul>

        <h2>6. <R slug="pats-peak">Pats Peak (NH)</R></h2>
        <p>
          The lowest-stress mountain on this list. Pats Peak is family-owned,
          85 minutes from Boston, and runs a learn-to-ski package that&apos;s
          legendary in the region — three lessons, a season-long beginner
          lift pass, and rentals for under $200. They host enormous junior
          racing programs without losing the small-mountain feel. Night
          skiing is included on most ticket products. If your kid hasn&apos;t
          decided whether they like skiing, this is where you find out
          before committing to an Ikon pass.
        </p>
        <ul>
          <li>Best for: deciding-if-we&apos;re-a-ski-family trips</li>
          <li>Pass: Indy</li>
        </ul>

        <h2>What to look for, in general</h2>
        <ul>
          <li>
            <strong>Ski-school class size:</strong> ask the maximum. 6:1 is
            good. 10:1 or higher is babysitting in lift lines.
          </li>
          <li>
            <strong>Magic carpet count:</strong> more is better. Magic
            carpets are conveyor belts that don&apos;t require unloading,
            which means a 4-year-old can use them safely.
          </li>
          <li>
            <strong>Easy-line terrain park:</strong> by age 7-8, most kids
            want to hit jumps. Resorts that mark beginner park lines (small
            tabletops, no kickers) keep them safe and engaged.
          </li>
          <li>
            <strong>Night skiing:</strong> for elementary-age kids,
            half-day lift tickets that include night sessions extend the
            value of a trip significantly.
          </li>
          <li>
            <strong>Day-tripper viability:</strong> a 90-minute drive each
            way is the absolute ceiling for non-grumpy kids. Account for
            traffic.
          </li>
        </ul>

        <h2>Day-tripper vs weekend trip</h2>
        <p>
          For young families, weekend trips beat day trips almost every
          time — the cost of one good hotel night is less than the
          emotional cost of a 5-hour round-trip drive with a 5-year-old.
          Smuggs, Loon, and Sunday River all work as 2-night weekends.
          Wachusett, Pats Peak, and Mountain Creek are day-trip-only —
          their lodging stock isn&apos;t built for week-long family stays.
        </p>

        <h3>Related</h3>
        <ul>
          <li>
            <Link
              href="/lists/family-friendly-east"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Family-friendly East list →
            </Link>
          </li>
          <li>
            <Link
              href="/lists/night-skiing-east"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Night skiing East list →
            </Link>
          </li>
        </ul>
      </>
    ),
  },

  {
    slug: "first-time-vermont-ski-trip",
    title: "Planning Your First Vermont Ski Trip",
    subtitle: "Which airport, which three mountains, and how to fill four days",
    description:
      "A practical four-day Vermont ski trip plan: which airport (BTV vs MHT vs ALB), how to split nights between Stowe, Killington, and Sugarbush, and what to do on a bad-weather day.",
    publishedAt: "2026-05-14",
    readingMinutes: 8,
    body: (
      <>
        <p>
          Vermont is the East&apos;s flagship ski state. The terrain is
          dramatic, the small-town village feel is real, and the four big
          mountains — Stowe, Killington, Sugarbush, Mad River Glen — sit
          within 90 minutes of each other along the spine of the Green
          Mountains. A first trip done well covers three of those four,
          plus enough food and small-town wandering to make it more than a
          ski-shuttle bus tour.
        </p>
        <p>
          The trip below assumes four ski days, one rest day, and two
          travel days — a Saturday-to-Saturday week. It works on either
          Ikon or Epic with minor adjustments.
        </p>

        <h2>Step 1: Pick your airport</h2>
        <p>
          The three options into Vermont, ranked by usefulness:
        </p>
        <ul>
          <li>
            <strong>Burlington (BTV):</strong> the obvious choice if Stowe
            is on your list. 45 minutes to Stowe, 75 minutes to Sugarbush.
            Smaller airport, fewer flights, but the most direct base for
            Northern Vermont.
          </li>
          <li>
            <strong>Manchester, NH (MHT):</strong> better flight options
            than BTV and frequently cheaper. 2 hours to Killington, 2.5
            hours to Sugarbush. The right pick if Killington is your
            anchor and Stowe is optional.
          </li>
          <li>
            <strong>Albany, NY (ALB):</strong> the surprise pick. Albany
            has more flight routes than BTV at lower prices, and the drive
            to Killington (2 hours) or Sugarbush (2.5 hours) is mostly
            interstate. Worst option if you want Stowe (4 hours).
          </li>
        </ul>
        <p>
          For a first trip covering Stowe + Killington + Sugarbush, BTV is
          the right pick. Fly in Saturday morning, drive 45 minutes to
          Stowe, and you&apos;re skiing by 1pm.
        </p>

        <h2>Step 2: Lodging — split or one base?</h2>
        <p>
          The amateur mistake is to base in one town and drive to all three
          mountains. Stowe to Killington is 2 hours each way — you&apos;d
          burn an entire ski day on the road. The pro move is to split:
        </p>
        <ul>
          <li>
            <strong>Nights 1-2:</strong> Stowe (or Waterbury / Stowe area)
          </li>
          <li>
            <strong>Nights 3-4:</strong> Warren or Waitsfield (Mad River
            Valley, base for Sugarbush)
          </li>
          <li>
            <strong>Nights 5-6:</strong> Killington / Rutland
          </li>
        </ul>
        <p>
          This way each ski day starts within 20 minutes of the lift. The
          drives between bases (Stowe → Warren is 90 minutes; Warren →
          Killington is 60 minutes) double as scenic drives through small
          Vermont towns, which is part of the experience.
        </p>

        <h2>Step 3: The four ski days</h2>

        <h3>Day 1: <R slug="stowe-mountain-resort">Stowe</R></h3>
        <p>
          Start on Spruce Peak (intermediate-friendly, separate from the
          steeper Mansfield side). Eat lunch at the Cliff House on the
          gondola summit, then take the gondola down and warm up at the
          Hourglass at Spruce Peak base for an aprés beer. If you have a
          full ski day, head to Mansfield in the afternoon for the front
          four (National, Liftline, Goat, Starr) — the iconic East Coast
          double-black runs that built Stowe&apos;s reputation.
        </p>

        <h3>Day 2: <R slug="sugarbush">Sugarbush</R></h3>
        <p>
          Start at Lincoln Peak. Sugarbush has the best intermediate
          cruising in the state — long, well-pitched groomers that connect
          for top-to-bottom runs of 2,400 vertical feet. Take the Heaven&apos;s
          Gate quad up and spend the morning on Jester and Down Spout. At
          lunch, ride the Slide Brook Express to Mt. Ellen for the
          afternoon — it&apos;s less crowded, and the runs are slightly
          steeper.
        </p>

        <h3>Day 3: <R slug="killington">Killington</R></h3>
        <p>
          Killington is huge (~1,500 skiable acres, 155 trails, six peaks)
          and overwhelming on a first visit. Start at the Snowshed lodge,
          take the gondola to Killington Peak, and orient yourself by
          looking down. Skye Peak (the right side of the resort as you
          face uphill) has the best cruising and connects to the Bear
          Mountain expert area. For a first-day map run, do Great Eastern
          — a 4.5-mile-long top-to-bottom green that lets you cover ground.
        </p>

        <h3>Day 4 (rest day or fourth ski day)</h3>
        <p>
          If your legs are tired, take a rest day in Woodstock or Stowe
          Village. Both have great walking, real bookstores, and excellent
          food. Stowe Village specifically has a free shuttle to the
          mountain — useful if conditions improve afternoon and you want
          a half-day.
        </p>
        <p>
          If you want a fourth ski day, hit{" "}
          <R slug="mad-river-glen">Mad River Glen</R> if you&apos;re an
          expert — the legendary single chair, ungroomed double-blacks,
          and snowboard ban make it the most distinctive ski day in
          Vermont. For everyone else, return to Sugarbush.
        </p>

        <h2>Bad-weather fallback</h2>
        <p>
          Vermont has freezing rain. When the forecast shows it, drop down
          in elevation. Both Stowe and Sugarbush have low-elevation lifts
          that stay rideable even when the upper mountain is glazed.
          Killington&apos;s K-1 gondola loads at 2,170 ft and the bottom
          third of the mountain is usually skiable. A bad-weather day is
          also the right day to relocate between bases — drive in the
          morning, ski half-day in the afternoon.
        </p>

        <h2>Food and aprés</h2>
        <ul>
          <li>
            <strong>Stowe:</strong> Doc Ponds, Hen of the Wood, Trapp Family
            Lodge for fondue.
          </li>
          <li>
            <strong>Mad River Valley (Sugarbush):</strong> American Flatbread,
            Mad Taco, Lawson&apos;s Finest Liquids brewery.
          </li>
          <li>
            <strong>Killington:</strong> Long Trail Pub, McGrath&apos;s
            Irish Pub (in Mendon), Liquid Art coffee for mornings.
          </li>
        </ul>

        <h2>Cost expectations (2026-27)</h2>
        <ul>
          <li>
            Lift tickets: $130-180 day-of-window at Stowe/Killington. Ikon
            or Epic recovers this in 4-5 days.
          </li>
          <li>
            Lodging: $250-400/night for a mid-range hotel in any of the
            three bases. Slope-side at Stowe or Killington tops $700+.
          </li>
          <li>
            Total trip budget for two adults, six nights, four ski days
            with pass already in hand: $3,500-5,000 including food and gas.
          </li>
        </ul>

        <h3>Related</h3>
        <ul>
          <li>
            <Link
              href="/state/vt"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              All Vermont ski resorts →
            </Link>
          </li>
          <li>
            <Link
              href="/lists/east-coast-classics"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              East Coast classics list →
            </Link>
          </li>
        </ul>
      </>
    ),
  },

  {
    slug: "spring-skiing-guide",
    title: "The Spring Skiing Playbook",
    subtitle: "When, where, and how to ski the back half of the season",
    description:
      "Late-season skiing strategy: best months by region, what to expect from snow conditions, gear adjustments, and which resorts stay open into May.",
    publishedAt: "2026-05-14",
    readingMinutes: 7,
    body: (
      <>
        <p>
          Spring skiing is the under-appreciated half of the season. Lift
          lines disappear, lodging drops 40%, and a sunny day in April on
          a corn-snow groomer is one of the genuinely transcendent
          experiences in the sport. The trade-off is variability — March
          and April can deliver knee-deep powder or rain-glazed crust
          depending on the storm track, and the same resort can be perfect
          one weekend and slushy two days later.
        </p>
        <p>
          The playbook below covers when to go, where to go, and how to
          adjust gear and expectations for the back half of the season.
        </p>

        <h2>Why spring skiing is underrated</h2>
        <ul>
          <li>
            Lift tickets drop. Many resorts run $60-80 spring lift days
            after April 1.
          </li>
          <li>
            Lodging drops harder. Slopeside condos that cost $700 in
            February run $300 in April.
          </li>
          <li>
            Lift lines vanish. Saturdays in mid-March can feel like
            weekdays in January.
          </li>
          <li>
            Long days. Daylight is 13+ hours by mid-March vs. 9.5 hours
            in December.
          </li>
          <li>
            Aprés culture. Spring skiing is built around outdoor beer
            decks, live music, and slope-side BBQs — not huddled-fireplace
            survival mode.
          </li>
        </ul>

        <h2>Best month, by region</h2>
        <h3>West (Utah, Colorado, Wyoming, Montana)</h3>
        <p>
          March is the best month on average. It usually brings the
          largest snowpack of the season (mid-March often peaks), the days
          are long enough for first-tracks-to-aprés, and the resorts are
          still fully operational. Late March / early April delivers the
          most reliable powder days at <R slug="alta">Alta</R>,{" "}
          <R slug="snowbird">Snowbird</R>, and{" "}
          <R slug="grand-targhee">Grand Targhee</R>.
        </p>
        <p>
          April is for corn snow and bluebird groomers. Skip the deep
          mornings — sleep in, ski 10:30 to 3:30 when the snow has softened.
          Best April resorts: Alta and Snowbird (open through late April,
          sometimes into May), Mammoth (sometimes open into June),
          Arapahoe Basin (the latest-closing Colorado resort).
        </p>

        <h3>East (Vermont, New Hampshire, Maine)</h3>
        <p>
          Mid-March is the East&apos;s sweet spot. Snowpack is deep,
          temperatures are above freezing during the day and below at
          night (the corn-snow recipe), and crowds drop sharply after
          school spring breaks. Best bets: Killington (the East&apos;s
          longest season — typically open into early May, sometimes
          Memorial Day), Sugarloaf, Sugarbush, Jay Peak.
        </p>
        <p>
          Late March / early April in the East is the period most likely
          to be ruined by warm rain. Have a Plan B (snowshoeing, food
          town, brewery tour) for any trip in this window.
        </p>

        <h3>Pacific Northwest and California Sierras</h3>
        <p>
          The PNW peaks late. Crystal Mountain, Mt. Baker, and Mt. Bachelor
          regularly have their deepest snowpack in late March and April.
          Mt. Bachelor often stays open Memorial Day. The Sierras
          (Mammoth, Palisades Tahoe) are the latest-closing zone in the
          country in big snow years — Mammoth has stayed open for July
          4th skiing more than once.
        </p>

        <h2>What to expect from snow conditions</h2>
        <p>
          Spring snow follows a daily cycle: hard / icy at 9am, soft and
          forgiving by 11am, slushy by 2pm, refreezing after 4pm. Plan
          your day accordingly — easy warm-ups on groomers first thing,
          steeper terrain mid-day when the snow is at its grippiest, and
          aprés (instead of last chair) when slush turns to mashed
          potatoes.
        </p>
        <p>
          North-facing aspects hold snow far longer than south-facing in
          spring. At most resorts, the back side / north bowls stay good
          into mid-afternoon while the south-facing front bowls go to
          slush by 1pm. Use the trail map and a compass.
        </p>

        <h2>Gear adjustments</h2>
        <ul>
          <li>
            <strong>Wax your skis.</strong> Spring snow is high-moisture
            and slows un-waxed skis dramatically. A warm-temperature wax
            (above 30°F) is the single biggest piece of gear advice.
          </li>
          <li>
            <strong>Layer light.</strong> Mid-30s to mid-50s air temps.
            Many skiers wear a soft-shell or thin midlayer over a base
            layer; ditch the down puffy.
          </li>
          <li>
            <strong>Sunscreen and lip balm.</strong> Spring sun off-snow
            burns harder than mid-winter. Reapply at lunch.
          </li>
          <li>
            <strong>Goggle lens.</strong> Switch to a lighter / amber lens
            for bluebird days.
          </li>
          <li>
            <strong>Boot fit.</strong> Warmer temperatures mean your foot
            swells slightly. Some skiers loosen the upper boot buckles by
            half a notch.
          </li>
        </ul>

        <h2>Resorts that stay open latest (typical years)</h2>
        <ul>
          <li>
            <R slug="mammoth-mountain">Mammoth Mountain (CA)</R> — late
            May, sometimes July 4
          </li>
          <li>
            <R slug="palisades-tahoe">Palisades Tahoe (CA)</R> — late May
          </li>
          <li>
            <R slug="killington">Killington (VT)</R> — early May, sometimes
            Memorial Day
          </li>
          <li>
            <R slug="arapahoe-basin">Arapahoe Basin (CO)</R> — mid-to-late
            May
          </li>
          <li>
            <R slug="alta">Alta (UT)</R> and <R slug="snowbird">Snowbird (UT)</R> —
            late April, sometimes mid-May
          </li>
          <li>
            <R slug="mt-bachelor">Mt. Bachelor (OR)</R> — Memorial Day
          </li>
          <li>
            <R slug="timberline-lodge">Timberline Lodge (OR)</R> — summer skiing
            on the Palmer Glacier
          </li>
        </ul>

        <h2>Pond skim culture</h2>
        <p>
          By late March most resorts host a closing-weekend pond skim — a
          costume-required event where skiers and riders try to skim
          across a 60-foot-long pool of water. It&apos;s ridiculous and
          worth scheduling a trip around. The best pond skims (judged by
          a non-skier looking for vibes): A-Basin, Squaw Valley, Sugarbush,
          Mt. Snow.
        </p>

        <h2>Spring vs. early-season trade-off</h2>
        <p>
          Some skiers spend their pass days December and January;
          others save them for March and April. The split most experienced
          skiers settle on after a few years: 60% spring / 40% early-season.
          The conditions are better, the prices are lower, the crowds are
          smaller, and the experience is more enjoyable.
        </p>

        <h3>Related</h3>
        <ul>
          <li>
            <Link
              href="/lists/powder-paradise-west"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Powder paradise West list →
            </Link>
          </li>
          <li>
            <Link
              href="/guides/ikon-vs-epic-2026-27"
              className="font-semibold text-wn-navy underline-offset-2 hover:underline"
            >
              Ikon vs Epic 2026-27 →
            </Link>
          </li>
        </ul>
      </>
    ),
  },
];

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((g) => g.slug === slug) ?? null;
}

export function getAllGuideSlugs(): string[] {
  return GUIDES.map((g) => g.slug);
}
