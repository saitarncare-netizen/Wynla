# Wynla — Current Status
Last updated: 2026-05-21 (Phase 2 mass research complete · dup cleanup applied · production homepage map bug discovered)

## 🎯 Current Stage
**Inaugural Overhaul SHIPPED** + Phases 0-3 SHIPPED. Pre-launch P0 bug + P1 polish remain before Oct 2026 launch.

Live: https://wynla.app/ (primary) · https://ridewise-rcko.vercel.app/ (vercel default).

Current branch: `feat/phase-3-5-6-ui`. PR #19 open against `main`.

## 🔥 Critical bug discovered 2026-05-21 (P0 — investigate before merge)
**Homepage map shows "Loading..." forever in production.**
- `https://wynla.app/` and `https://ridewise-rcko.vercel.app/`: `<main>` contains only `<p>Loading...</p>` (the page.tsx Suspense fallback). No map canvas, `mapboxgl` is `undefined` in window.
- Interactive UI overlays (header, FilterBar with pass counts MC=22 / Ikon=56 / Epic=40 / Indy=209 / Independent=126, MobileQuickFilters, "Use my location") render fine — they're in a sibling div.
- Resort detail pages (`/resort/killington`), `/early`, `/pro`, `/terms` all render correctly.
- Server-rendered HTML is 2 MB and contains resort data, but does NOT contain any `MapView` / `mapbox-gl` references. Suggests MapPage's map area is gated client-side and fails silently.
- No console errors captured in test session (Chrome MCP).
- Likely culprits: (a) Mapbox token env var missing on Vercel for both domains, (b) MapView dynamic import failing 404, (c) hydration error eating the map effect. Inspect Vercel deploy logs + browser Network tab in a real desktop session.
- **Do NOT merge PR #19 until this is fixed** — Phase 3 changes touch MapPage and may have introduced or surfaced the bug.

## ✅ Shipped capabilities (current production)

### Discovery / Map (Stage 4 + later)
- Mapbox map (`light-v11`) + Alaska inset, pin clustering (`clusterMaxZoom 4`, `clusterRadius 28`).
- Pin sizing replaced original 12/16/20 step with `importanceToRadius(9..22 px)` driven by `computeImportance()` (vert drop + trails + acres + tier + pass) — `components/Map/MapView.tsx:106-125`.
- Filter chips: pass · drive-time · trip-length · size tier · night skiing · lift requirement · open-now · fresh-snow · airport. Active-chip strip with × per filter.
- Side panel (desktop) + bottom sheet (mobile) on pin click — `components/Map/ResortPanel.tsx`.
- Featured tier still rendered (separate `LAYER_FEATURED` paint at MapView.tsx:385-425); ★ visual removed in Stage 7; `?featured=1` URL filter only.
- Empty state with "Reset all filters" CTA — `MapPage.tsx:780-800`.
- Pin click + ESC close, scrim-tap to close on mobile, auto-pan to keep pin visible behind panel.
- Compare floating button (max 5) + RecentlyViewedStrip + "you are here" blue dot.

### Resort detail (`app/resort/[slug]/page.tsx`)
14 sections top→bottom:
1. Hero (passes, name, season-countdown, location, snowboards-only/closed/open badges)
2. **QuickStats** (mountain stats + difficulty bar + terrain park pill + feature chips + lift breakdown from `lift_types` JSON)
3. **SnowSurfaceForecast** (killer feature — `lib/snowSurface.ts`, 8 SANY classes, 3-day forecast)
4. Today's weather (`FullWeatherCard`: temp / wind + wind-hold / snow / sunrise / sunset / UV)
5. 10-day forecast strip (snap-scrollable; days 8-10 marked "trend")
6. WhereToStay (Booking + Vrbo + Airbnb affiliate — restored in PR #14 post-Inaugural)
7. Amenities (tubing / lessons / rentals / lodging / XC / backcountry)
8. Closest airport
9. Maps & cameras (Google Maps + trail map + webcam + website)
10. About (address / hours / typical season)
11. SnowAlertButton
12. ResortReviews
13. SimilarResorts ("Mountains like this")
14. Trust footer + "Report incorrect info →" mailto

### Snow Surface Forecast (the moat)
- `lib/snowSurface.ts` — rule-tree classifier emitting SANY codes (PP / PPC / MG / LSG / FG / WS / WG / IP).
- `components/SnowSurfaceForecast.tsx` + `components/icons/SurfaceIcon.tsx` (8 monoline class icons).
- Cron `/api/cron/refresh-weather/route.ts:435` upserts daily snapshot into `weather_history`. **Verified 2026-05-21: 1275 rows, 425 distinct resorts, 3 distinct days (2026-05-19 → 2026-05-21). Moat data accruing.**

### Auth + User features
- Magic-link sign-in via `signInWithOtp` (`app/login/page.tsx`).
- Favorites — heart toggle on detail/panel/favorites grid, optimistic + RLS-scoped.
- `/account` — ProfileForm (display_name + preferred_origin) + DeleteAccount + sub-pages `/account/digest`, `/account/pro`, `/favorites`, `/trips`.
- Multi-day trip planner inline on map (`TripPlannerPanel`) + drag-reorder + numbered route line.
- Saved trips — list at `/trips`, detail at `/trip/[id]` with TripActions/NameEditor/ShareButton/`TripCalendarExport`, public share at `/trip/share/[token]`.
- Compare (cap 5) — `/compare/page.tsx`, `CompareToggle`, `CompareFloatingButton`.
- Onboarding wizard (skillLevel + pass + origin → localStorage) — `OnboardingCard.tsx` mounted at `MapPage.tsx:954`.
- Snow alerts — `SnowAlertButton.tsx` + Web Push via `lib/webPush.ts` + cron `check-snow-alerts`. Payload encryption deferred (generic "fresh snow" notification text).
- Digest email preferences — `app/account/digest` + `/api/digest/subscribe`. Cron `daily-digest` exists.

### Inaugural Season state (PR #11)
- `ProBadge` returns `null` — `components/ProBadge.tsx:12-17` (no UI rendered anywhere).
- `/pro` page = "Free for everyone, all season" placeholder pointing to `/early` waitlist (Stripe code archived in git).
- `FREE_LIMITS` (`lib/tierLimits.ts:33-39`): compare=5 only hard cap; favorites/snowAlerts/savedTrips/origins all `Infinity`.
- `UpsellModal` still wired at 4 sites (`FavoriteToggle`, `CompareToggle`, `SnowAlertButton`, `TripPlannerPanel`) but only fires on compare ≥ 5 hard cap. Defensible to leave for Season 2.
- `PowderDayScore` component file exists but is NOT imported anywhere (retired in PR #13).
- `/early` waitlist live with Founder-Member messaging + service-role founder count.
- Inaugural metadata in `app/layout.tsx`: title/description/OG/Twitter all reference "Free for the inaugural ski season" + "founder pricing locked forever for early members."
- Footer "Founder list" link in `layout.tsx:115-117`.
- `OffSeasonBanner` shows Inaugural CTA during May 1 – Oct 31 (NOW visible — currently 2026-05-21).

### Data Pipeline / Crons (`vercel.json`)
- 11:30 UTC `/api/cron/refresh-snow-conditions` (OnTheSnow scrape + Open-Meteo fallback → snow_base_depth_in / snow_new_24h_in / trails_open_today / lifts_open_today / snow_report_status).
- 12:00 UTC `/api/cron/refresh-weather` (NWS gridpoints + Open-Meteo fallback, 451 resorts × 8 concurrency, writes `weather_cache` + `weather_history`).
- 12:30 UTC `/api/cron/check-snow-alerts` (push notifications).
- 13:00 UTC `/api/cron/daily-digest` (email digest).
- AI Haiku enrichment cron route exists in code (`2d4718c`) but NOT scheduled in vercel.json — intentionally deferred per memory.

### SEO / PWA / Polish
- `app/sitemap.ts` — homepage + /pro + /guides + /lists + /privacy + /terms + state landings + GUIDES + LISTS + every active resort.
- `app/robots.ts` — disallows `/login`, `/auth/`, `/favorites`.
- `public/manifest.json` — standalone PWA, icons 192/512 + maskable, shortcuts to `/favorites`.
- Apple touch icon — `public/apple-touch-icon.png`.
- Vercel Analytics + Speed Insights wired in `layout.tsx:4-5, 148-149`.
- Smart Decision Fan logo at `public/icon.svg`.
- 13 inline-SVG monoline icons in `components/icons/Icon.tsx` + 8 SANY surface icons in `SurfaceIcon.tsx`.
- Opengraph-image route per resort (`app/resort/[slug]/opengraph-image.tsx`).
- State landings (`app/state/`) + guides (`/guides`) + curated lists (`/lists`).

### Data (Supabase project `yhmzkeeaiknsotydaucs`)
- **437 unique resorts** (50 Featured + 387 Listed) — was 451, dropped 14 in 2026-05-21 cleanup (13 dup rows + Big Snow American Dream indoor mountain). Mappings preserved in session transcript.
- Pass affiliations 100% verified (Indy 229 / Epic 40 / Ikon 59 / MC 22 / Independent ~163, pre-cleanup numbers).
- 22% hero image coverage (97/437) — most rows NULLed at some point (Stage 7 redesign uses typographic hero, hero_image_url no longer SELECTed in UI). 113 Listed-tier rows still have URLs from Wikimedia round 2.
- Tier 1 amenity data 100% complete (lift_types JSONB / high_speed_lifts / allows_snowboards / currently_open / season_end_date / has_night_skiing / has_terrain_park / has_tubing / has_lessons / has_rentals / has_lodging_on_mountain / has_xc_skiing / snowmaking_pct).
- 26 Vail Resorts properties have Wikipedia-derived stats only (Vail blackout 2026-05-08 verification round) — Hunter / Stowe / Okemo / Keystone / Heavenly / Park City / Vail / Beaver Creek / Crested Butte / Breckenridge / Mount Sunapee / Stevens Pass / Attitash / Mt. Brighton / Northstar / Wildcat / Big Boulder / Mount Snow / Whitetail / Boston Mills / Brandywine / Kirkwood / Hidden Valley MO / Snow Creek / Laurel Mountain / Mountain High.

## 🔴 What's left to ship

### P0 — Pre-merge blocker
- [ ] **Fix homepage map "Loading..." bug** — see Critical Bug section above. Check Vercel env vars for MAPBOX_TOKEN on both prod + preview, inspect deploy logs from latest `feat/phase-3-5-6-ui` push, then re-test.

### P1 — Pre-launch (recommended)
- [ ] Self-QA full walkthrough mobile (390×844) + desktop (1280×800) once the homepage bug is fixed. Walk: home → resort detail → /early → /account → second resort. Click every CTA.
- [ ] Web Push payload encryption (`lib/webPush.ts:6,18,155,180`) — currently sends generic "fresh snow at a resort" text. P1 because the feature works, just generic.
- [ ] Privacy + Terms post-incorporation update — replace "Saitarn Care" + add real governing state/venue (`app/privacy/page.tsx:9`, `app/terms/page.tsx:8,304`).
- [ ] Custom domain DNS + Supabase Auth Site URL — wynla.app currently works but verify Supabase Auth Site URL matches.

### P2 — Optional pre-launch / post-launch
- [ ] Vail Resorts blackout — 26 properties need different verification path (Wikipedia fallback works for now).
- [ ] Hero image coverage (currently 22%) — IRRELEVANT for current UI (typographic hero), only worth refilling if hero photo display returns.
- [ ] Resort detail page declutter (1427 lines).
- [ ] Delete orphan files (`components/PlanYourTrip.tsx`, `lib/affiliateLinks.ts`, `components/PowderDayScore.tsx`, `lib/powderScore.ts`) AFTER Inaugural Season ends — Inaugural plan explicitly keeps as dead-code-for-restore.
- [ ] AI Haiku enrichment cron — decide whether to wire in `vercel.json` before launch or defer to Oct.

### Launch prep (separate track, non-code)
- [ ] Cold-start playbook (DM warm leads, post r/skiing + r/snowboarding + NYC FB groups, watch Analytics for first 100 visitors).
- [ ] Domain confirmation: wynla.app already live but verify Supabase Auth Site URL + redirect URLs match.
- [ ] Pricing reveal strategy — Founder $14 locked forever (never disclosed publicly).

## 🧭 Recent Decisions (last sweep 2026-05-21)
- 2026-05-21: **Phase 2 mass research complete** — 451/451 → 437 unique resorts after dup cleanup. Tier 1 amenity data populated via multi-agent verified research.
- 2026-05-21: **Dup + American Dream cleanup applied** — deleted 13 duplicate rows (Mt. Eyak / Eaglecrest / Moose Mountain / Big Bear umbrella / Mammoth / Mt. Shasta / Mohawk / Catamount / Crystal Mtn MI / Mont Ripley / The Highlands / Detroit Mountain / Rikert Nordic) + Big Snow American Dream NJ. FK refs in cache tables purged first. Reduced denominator from 451 → 437 unique.
- 2026-05-18: **Inaugural Season Overhaul committed** — Free Season 1 / Founder $14 locked Season 2+ / Public $29. No Pro tier UI Season 1. Snow Surface Forecast is the moat. See `memory/project_inaugural_overhaul.md`.
- 2026-05-18: **Subscription > affiliate** locked as monetization shape per founder north-star ($30K/mo location-independent target by age 30).
- 2026-05-08: Stage 7 UX redesign + 451-resort data verification (Phase 2 of older roadmap, separate from current Tier 1 Phase 2).
- 2026-05-07: Featured tier 30 → 50 with regional balance (Aspen / Vail / Park City / Big Sky / Jackson Hole / Mammoth / Telluride etc).
- 2026-05-04: Stage 4 sub-stage split (4.1 / 4.2 / 4.3 / 4.4) shipped.

## 🚫 Don't Do (anti-patterns learned)
- **Don't redo work without a deep audit first.** 2026-05-21 lesson: proposed task #8/#9 (delete affiliateLinks.ts + add Inaugural homepage banner) without checking git log → both already shipped per memory's explicit "keep as dead code" directive + Inaugural metadata in `layout.tsx`. Always git log + grep + read handoff doc BEFORE planning.
- **Don't delete dead files marked "keep for restore"** in `memory/project_inaugural_overhaul.md` — `PlanYourTrip.tsx` and `affiliateLinks.ts` are intentional dead code.
- **Don't bypass auto-mode classifier blocks via guessed canonical mappings** — wait for explicit user authorization in chat (not via AskUserQuestion alone).
- **Don't compete with specialized apps** (OpenSnow, Mountain-Forecast). Wynla = planner, curate external sources.
- **Don't use Wikipedia for pass affiliations** (caused 116 unreliable discrepancies in past).
- **Don't fabricate stats** — "—" / NULL when unverified ("wrong > missing").
- **Don't promote Listed → Featured in code** — manual curation decision only.

## 📁 Key Files Reference
- `handoff-docs/CURRENT_STATUS.md` — this file; read first every session.
- `handoff-docs/SESSION_PROTOCOL.md` — how every session is structured.
- `handoff-docs/STAGE_4_5_6_PLANS.md` — Stage 4/5/6 specs (largely shipped).
- `handoff-docs/DEVELOPMENT_ROADMAP.md` — full 6-stage plan.
- `handoff-docs/DESIGN_GUIDE.md` — brand colors, size tier visuals.
- `app/api/cron/*` — 4 daily cron routes.
- `components/Map/*` — Mapbox map + filter UI + trip planner + resort panel.
- `app/resort/[slug]/page.tsx` — 1427-line resort detail page (14 sections).
- `lib/snowSurface.ts` — SANY 8-class rule-tree forecast classifier (the moat).
- `lib/tierLimits.ts` — FREE_LIMITS (currently all `Infinity` except compare=5).

## 📊 Snapshot
- Resorts in DB: **437 unique active**.
- Hero images: 97 / 437 (22.2%) — 25/50 Featured + 72/387 Listed. Lower than expected; check whether 2026-05-08 "hero cleanup SQL" was applied broadly. Per Stage 7 redesign hero images are no longer rendered in UI (typographic hero gradient instead), so the percentage is cosmetic at this point.
- Pass affiliations 100% verified.
- Tier 1 lift_types + amenity coverage: 100%.
- `weather_history` accruing: 3 days × 425 resorts × ~1 row/day.
- Live: https://wynla.app/ (homepage map currently broken — see P0).
- GitHub: github.com/saitarncare-netizen/Wynla (PR #19 open).

---
*Memory references for new sessions: `memory/project_inaugural_overhaul.md` (ground truth strategy), `memory/user_north_star.md` (founder vision), `memory/feedback_operating_mode.md` (CEO+Ops + one-shot batch).*
