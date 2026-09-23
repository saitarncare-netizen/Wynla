# Wynla

US ski trip planner: which mountain, on which pass, this Saturday, and
what the snow will feel like. Next.js 16 App Router, React 19, Tailwind
v4, Supabase (Postgres + Auth), Mapbox GL, deployed on Vercel as a PWA.
Live at <https://wynla.app>.

Project context for people and agents lives in `handoff-docs/`: start with
`CURRENT_STATUS.md`, then `SESSION_PROTOCOL.md`.

## Run it

```bash
npm ci
# create .env.local by hand from the table under "Environment variables" below
npm run dev                  # http://localhost:3000
```

Node 22 (matches CI). The dev server unregisters the service worker so
cached `/_next/static` chunks never go stale.

## Check it

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint, 0 errors required
npm test            # vitest, lib/**/*.test.ts + tests/**/*.test.ts
npm run build       # next build (needs the Supabase env vars)
```

`.github/workflows/ci.yml` runs lint, typecheck and tests on every push to
`main`, `feat/**` and `fix/**`, and the build when the repository secrets
exist.

## Deploy

Vercel builds every push; `main` is production. Crons are declared in
`vercel.json` (Hobby plan: one run per route per day). The in-season
30-minute refresh is `.github/workflows/refresh.yml`, active once the
`CRON_SECRET` repository secret is set. `/api/health` answers 503 when the
data is stale, so any HTTP monitor can alert.

Database changes are SQL files in `handoff-docs/sql/`, run by hand in the
Supabase SQL editor. Application code never runs DDL and feature-detects
missing tables and columns. The live schema is described in
`handoff-docs/DB_SCHEMA_LIVE_2026-09-23.md`.

## Environment variables

Set in `.env.local` locally and in Vercel (Production + Preview).

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything (data, auth). |
| `SUPABASE_SERVICE_ROLE_KEY` | Crons, feedback inbox, account deletion, Founder count. Never sent to the browser. |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | The map and drive-time matrix. |
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs in emails, share cards, sitemap (`https://wynla.app`). |
| `CRON_SECRET` | Bearer token the cron routes and the refresh workflow require. |
| `RESEND_API_KEY`, `RESEND_FROM` (or `RESEND_FROM_EMAIL`) | Transactional email: digests, Thursday picks, founder alerts. |
| `DIGEST_SECRET` | Signs digest unsubscribe links. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push snow alerts (`npx web-push generate-vapid-keys`). |
| `NWS_CONTACT_EMAIL` | User-Agent contact the National Weather Service API asks for. |
| `OPEN_METEO_API_KEY` | Optional: Open-Meteo paid tier; free tier is used when unset. |
| `SNOCOUNTRY_API_KEY` | Optional: licensed resort snow reports; without it those numbers are absent, not invented. |
| `PIPELINE_LIVE`, `PIPELINE_ALERT_EMAIL` | Pipeline switches and the founder alert address (`handoff-docs/DATA_PIPELINE_2026-09-23.md`). |
| `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_OPERATOR_ADDRESS`, `NEXT_PUBLIC_CONTACT_EMAIL` | Privacy and terms pages. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO_MONTHLY`, `STRIPE_PRICE_ID_PRO_YEARLY` | Only when the Pro tier returns (Season 2). |
| `NEXT_PUBLIC_AFFILIATE_*` | Optional affiliate ids for the where-to-stay and gear links. |

Keys live in files on the founder's Desktop; never paste them into chat,
commits or docs.

## Layout

```
app/                 routes (App Router): / map, /resort/[slug], /go, /today, /trip/[id], /api/cron/*, ...
components/          UI; components/Map/* is the map shell, filters, panel, planner
lib/                 domain logic, no React except the hooks (useFocusTrap); *.test.ts next to the code
lib/weather, lib/snowReport, lib/saturday   the data pipeline, snow-report providers, Saturday ranking
handoff-docs/        status, protocol, per-package docs, sql/ migrations
scripts/             live tools (below); scripts/archive/ is history, not maintained
public/              manifest, service worker, icons, offline page
```

Live scripts (`node scripts/<name>.mjs`):

| Script | Use |
|---|---|
| `pipeline-trigger.mjs` | Call a cron route by hand with the same bearer token Vercel uses. |
| `pipeline-probe-sources.mjs` | Check every upstream weather / snow source and print what answers. |
| `build-pass-access.mjs` | Regenerate `lib/data/passAccess.json` from the verified handoff dataset. |
| `compute-drive-times.mjs` | Fill `drive_time_cache` for the origin cities from Mapbox Matrix. |
| `gen-brand-rasters.mjs` | Rebuild icons, iOS splash images and manifest screenshots after a brand change. |
| `measure-home-payload.mjs` | Size of the data the home page ships to the client. |
| `scrape-pass-data.mjs` (`npm run scrape:pass-data`) | Pass-website scrape for the pass-truth diff; see `scripts/SCRAPE_README.md`. |
| `backfill-2026-09-23/` | The applied resort-data backfill and its `restore.mjs`. |

## Conventions

- US English, sentence case, no exclamation marks. Every user-visible
  number is labelled Measured, Forecast, Estimated or Reported with its
  time; nothing is over-claimed.
- Mobile first at 375 px, 44 px tap targets, safe-area padding,
  `prefers-reduced-motion` respected. Colours are the `wn-*` Tailwind tokens.
- Every modal, sheet, drawer or popover uses `lib/useFocusTrap.ts`.
- Comments explain why, not what. Commit messages say why and end with the
  co-author line the session protocol specifies.
