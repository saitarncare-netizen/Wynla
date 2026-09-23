# Wynla: current status

Last updated: 2026-09-23 (Season 1 round 3, package `a11y-cleanup`).
Read this first in every session, then `SESSION_PROTOCOL.md`.

Live site: <https://wynla.app>. Repo: `github.com/saitarncare-netizen/Wynla`
(local checkout `C:/Users/saita/ridewise`). The season opens in November.

## Where the code is

| Branch | State |
|---|---|
| `main` | What wynla.app serves. Last merged PR: #49 (Season 1 core). |
| `feat/season-1-round2-clean` | Season 1 rounds 1 and 2 on top of #49 (HEAD `3633b1f`). The base for every round-3 package. Not yet merged to `main`. |
| `wf/<package>-r3` | Round-3 package branches, one worktree each under `C:/Users/saita/ridewise-worktrees/`. Merged by the integrator into the round-2 branch, then to `main`. |

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

## Round 3 (in flight, 2026-09-23)

Packages branched from the round-2 branch, one worktree each. This package
(`a11y-cleanup`, branch `wf/a11y-cleanup-r3`) shipped:

- `lib/useFocusTrap.ts`: one hook for every modal, sheet, drawer and
  popover (initial focus, Tab wrap, Escape, focus return, `inert`
  background with an `aria-hidden` fallback, ref-counted body scroll
  lock, top-of-stack handling for stacked layers). Applied to
  FiltersDrawer, ResortPicker, the surface-types modal, DayResortSwap and
  the feedback form. 14 unit tests in `lib/useFocusTrap.test.ts`.
- FilterBar desktop pills: real menu / dialog roles, arrow-key navigation,
  Escape, focus return, accessible names that keep the visible label.
- FiltersDrawer: checkbox and radio semantics with arrow keys, one named
  close control, headings outside buttons, 44 px targets, contrast on
  small copy, thresholds moved out of hover-only tooltips.
- ResortPicker: dead pass-chip UI removed, live match count, named rows.
- MapView: a polite live region with the filtered count and the keyboard
  route to a resort.
- 41 one-off scripts moved to `scripts/archive/` with a README; dead
  files removed (`components/OnboardingCard.tsx`, `lib/mapboxStatic.ts`,
  `lib/dataVerification.ts`).

Other round-3 packages (map shell, resort panel, planner UX, photos,
onboarding) are documented by their own branches; the integrator merges
them and updates this file.

## Founder checklist (things only Saitarn can do)

1. Run `handoff-docs/sql/2026-09-23-ALL-season-1.sql`, then
   `2026-09-23-ALL-round-2.sql`, once each, in the Supabase SQL editor.
   Both are idempotent.
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
- Unit tests: 24 files under `lib/**` and `tests/`, run by `npm test` and
  by CI on every push to `main`, `feat/**` and `fix/**`.
