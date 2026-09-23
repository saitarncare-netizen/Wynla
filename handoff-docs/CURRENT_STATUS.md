# Wynla: current status

Last updated: 2026-09-23 (Season 1 round 3, integrated on `feat/season-1-round3`).
Read this first in every session, then `SESSION_PROTOCOL.md`.

Live site: <https://wynla.app>. Repo: `github.com/saitarncare-netizen/Wynla`
(local checkout `C:/Users/saita/ridewise`). The season opens in November.

## Where the code is

| Branch | State |
|---|---|
| `main` | What wynla.app serves. Last merged PR: #49 (Season 1 core). |
| `feat/season-1-round2-clean` | Season 1 rounds 1 and 2 on top of #49 (HEAD `3633b1f`). The base for every round-3 package. Not yet merged to `main`. |
| `feat/season-1-round3` | The six round-3 packages merged on top of the round-2 branch, plus the cross-package integration commits. Typecheck, lint (0 errors), tests and `next build` green. Not yet merged to `main`. |
| `wf/<package>-r3` | Round-3 package branches, one worktree each under `C:/Users/saita/ridewise-worktrees/`. All six are merged into `feat/season-1-round3`. |

Older `feat/*` and `wf/*` branches are history; see `git branch --merged main`
before deleting any.

## What is live on wynla.app (main)

- Map of every active US ski resort (Mapbox GL, clustering, Alaska inset),
  desktop filter pills + mobile Filters drawer, search, compare (max 5),
  recently viewed, "you are here", pass colour legend.
- Resort pages: mountain stats, pass access rules per product, Snow Surface
  Forecast (SANY classifier in `lib/snowSurface.ts`), weather and 10-day
  strip, where to stay, nearby restaurants / activities / ski shops,
  reviews, similar resorts, snow alerts, calendar export.
- Accounts (Supabase Auth), favourites, saved trips with share links and
  day plans, digest email preferences, web push snow alerts.
- Multi-day trip planner on the map, curated lists, guides, state pages,
  trip templates, deals, the `/early` Founder list, `/get` install page.
- Crons on Vercel Hobby (`vercel.json`): snow conditions 10:00, weather
  11:00, snow alerts 12:30, digest 13:00, Thursday picks 13:30 UTC.
  `.github/workflows/refresh.yml` adds the 30-minute in-season cadence
  once the `CRON_SECRET` repository secret exists.

## What is on `feat/season-1-round2-clean` (built, not yet deployed)

Rounds 1 and 2 of the Season 1 rebuild, each documented in
`handoff-docs/*_2026-09-23.md`:

| Package | Doc | Needs before it works in production |
|---|---|---|
| Auth: 6-digit email code, `/auth/confirm`, 90-day sessions | `AUTH_SETUP_2026-09-23.md` | Supabase email templates switched **after** the deploy is live |
| Data pipeline: forecast_json v2, measured layer, health check, dormant surface logic | `DATA_PIPELINE_2026-09-23.md` | `2026-09-23-ALL-season-1.sql`; optional `SNOCOUNTRY_API_KEY`, `OPEN_METEO_API_KEY`, `PIPELINE_ALERT_EMAIL`, `NWS_CONTACT_EMAIL` |
| Alerts, install / PWA, map performance, planner fixes, hygiene | `INSTALL_2026-09-23.md` and the ALL-season-1 SQL | `2026-09-23-ALL-season-1.sql` |
| Pass access tiers (`lib/passAccess.ts`, 235 resorts, 960 product rows) | `PASS_DATA_2026-09-23.md` | nothing (data is in the repo) |
| Resort data backfill (395 active resorts, lift types, vertical, dupes, season dates) | `DATA_BACKFILL_2026-09-23.md` | already applied to production on 2026-09-23 |
| `/go` Saturday pick + Thursday email | `GO_2026-09-23.md` | `2026-09-23-ALL-round-2.sql` |
| `/today` + phone tab bar, 29-city origin picker | round-2 commit `b6abbc4` | nothing |
| Prediction ledger (`prediction_log`) | `PREDICTION_LEDGER_2026-09-23.md` | `2026-09-23-ledger.sql` (inside ALL-round-2) |

Design tokens: wn-navy `#1E2952`, wn-sky `#5BAFE6`, wn-gold `#F5C443`,
wn-offwhite `#FAFAF7`, wn-charcoal `#2A2A2A` (`app/globals.css`).

## Round 3 (integrated on `feat/season-1-round3`, 2026-09-23)

Six packages branched from the round-2 branch and merged in this order.
No new SQL migrations and no new env vars.

| Package | Branch | What it shipped | Doc |
|---|---|---|---|
| Design system | `wf/design-r3` | Tokens (`text-wn-*` type scale, `rounded-wn-*`, `shadow-wn-*`, semantic colours, global focus ring), `components/ui/*` primitives, 44-glyph `Icon`, AppShell top bar on every non-map route, Footer, BrandMark, `lib/nav.ts`, `lib/contrast.ts` (`textOn`), loading skeletons | `DESIGN_GUIDE.md` |
| Map shell / resort sheet | `wf/sheet-r3` | Google-Maps-style phone sheet (peek / half / full) with safe history, one-row phone header, one bottom pill row on `--wn-bottom-stack`, shared glance tiles (`lib/glanceTiles.ts`), 44 px hit areas (`lib/hitArea.ts`) | `MAP_SHELL_2026-09-23.md` |
| Photos | `wf/photos-r3` | `lib/heroSource.ts` policy (vetted storage photo, else terrain card, else gradient) on the resort page, map sheet, `/today` and `/go`; denylist; `/credits`; 59 vetted Commons heroes applied and 12 wrong ones cleared in production | `PHOTOS_2026-09-23.md` |
| Planner UX | `wf/planner-ux-r3` | Guest favourites merged on sign-in (`GuestFavoritesSync` in the root layout), compare cleanup and share, account sessions, trips order, sticky trip bar, resort-page "Plan a trip" | commit messages |
| Content / SEO | `wf/content-r3` | `/near/[city]` for 29 origins, sitemap, state-page nearest-city links, resort JSON-LD (SkiResort, FAQ, breadcrumb), lists "Next step" | `SEO_2026-09-23.md` |
| A11y + cleanup | `wf/a11y-cleanup-r3` | One `useFocusTrap` for every overlay, FilterBar / FiltersDrawer / ResortPicker semantics, FeedbackButton form, 41 scripts to `scripts/archive/`, 3 dead files removed, docs rewritten | this file, `SESSION_PROTOCOL.md` |

Integration decisions worth knowing:

- The map sheet hero goes through `heroSourceFor`; `HeroImage` takes
  `source` only (the legacy `src` props are gone). Its compact credit
  pill links to `/credits`.
- FeedbackButton sits on `--wn-bottom-stack` at the left end of the phone
  bottom row and hides at half / full sheet.
- The map header shows the designer's mark (lockup on the md+ bar).
- Pass badges everywhere use `textOn()`: navy on Ikon yellow and Epic
  orange, white on the darker passes.
- Every map-URL `replaceState` passes `customHistoryState(history.state)`
  so the sheet's back-to-close entry survives filter and planner writes.
- Text sizes outside the files the design package owned are still on
  Tailwind's `text-xl..6xl`; migrate with the mapping in
  `DESIGN_GUIDE.md` section 2 when a file is touched for other reasons.

## Founder checklist (things only Saitarn can do)

1. Run `handoff-docs/sql/2026-09-23-ALL-season-1.sql`, then
   `2026-09-23-ALL-round-2.sql`, once each, in the Supabase SQL editor.
   Both are idempotent. Round 3 adds no migration.
2. After the deploy that contains the auth package is live: switch the
   Supabase email templates (`AUTH_SETUP_2026-09-23.md`, step 1). Not
   before.
3. Vercel env vars (Production + Preview): see README "Environment
   variables". New since May: `OPEN_METEO_API_KEY` (optional),
   `SNOCOUNTRY_API_KEY` (optional, needs a licence), `PIPELINE_LIVE`,
   `PIPELINE_ALERT_EMAIL`, `NWS_CONTACT_EMAIL`, `DIGEST_SECRET`,
   `RESEND_FROM_EMAIL`.
4. GitHub repository secret `CRON_SECRET` (same value as Vercel) so the
   in-season refresh workflow runs.
5. Rotate the keys that leaked into chat transcripts in June: Google
   Places API keys and the Supabase service-role key; delete unused
   Google keys.
6. Decide on licensed snow-report data (SnoCountry quote) before the
   season; the pipeline works without it but shows fewer "Reported"
   numbers.
7. Review and run `scripts/photos/legacy/legacy-heroes.sql` (cleaned
   credits for 92 legacy heroes; every statement is guarded by the current
   URL, and the 12 denylisted rows were already cleared on 2026-09-23).
8. After the round-3 deploy: check `/resort/killington` and `/near/nyc`
   in Google's Rich Results Test and resubmit the sitemap in Search
   Console; walk the iPhone script in `MAP_SHELL_2026-09-23.md`.

## Do not

- Delete `components/PlanYourTrip.tsx`, `components/PowderDayScore.tsx`,
  `lib/powderScore.ts` or `lib/affiliateLinks.ts`: they are still imported
  by the resort page and kept for the Season 2 restore.
- Use Wikipedia for pass affiliations, or fabricate any stat. NULL and a
  dash beat a guess.
- Promote Listed to Featured in code; that is a manual curation decision.
- Write to the database from a package unless its brief says so; feature
  detect missing tables and columns instead of failing.
- Run `next build` or `next dev` from a worktree while another one is
  running; they share `node_modules` through a junction.

## Snapshot

- Active resorts: 395 (after the 2026-09-23 backfill).
- Pass access data: 235 resorts, 960 product rows, verified 2026-09-23.
- Unit tests: 53 files (one skipped), 894 tests under `lib/**`, `components/**` and `tests/` (round 3, 2026-09-23), run by `npm test` and
  by CI on every push to `main`, `feat/**` and `fix/**`.
