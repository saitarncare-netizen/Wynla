# Wynla — Current Status
Last updated: 2026-05-08 (UX redesign + 451-resort data verification complete; needs git push)

## 🎯 Current Stage
**PRODUCTION** at https://ridewise-rcko.vercel.app is the OLD code. **2 commits queued locally** (231b902 redesign + new Stage 7 data) waiting for `git push origin main` (sandbox blocks; user must push). Vercel auto-redeploys on push.

DB is already live with Stage 7 verified data — applied via Supabase SQL Editor (Chrome MCP) regardless of code-deploy timing. Old production code reads it without issue (extra fields just sit there until new code reads them).

## ✅ Stage 7 — UX redesign + 451-resort data verification (2026-05-08)

### Phase 1 — UX redesign (commit 231b902)
4 parallel agents executed all 6 locked decisions in one coherent commit.

- **REMOVE all hero images.** ResortPanel, detail page, favorites cards now render a typographic hero (pass-color gradient `#{primary} → #1E2952` → `#0F1530` on the detail page; primary→#1E2952 on the panel + favorites). `hero_image_url` dropped from home + favorites SELECTs; `satelliteHeroUrl()` deleted.
- **Filter UI redesigned.** New `components/Map/FilterBar.tsx` is 3 dropdowns (`All passes ▾`, `From … · trip ▾`, `≡ More filters`) plus an active-filter chips strip. New `components/Map/FilterDrawer.tsx` houses the size chip-row + 🌙 Night skiing toggle. New URL param `?night=1`. `MapPage.tsx` rewires with `drawerOpen` state, `clearAll`, derived chips.
- **★ Featured tier visual removed everywhere.** Map: `LAYER_FEATURED_STAR` deleted; featured pins now use vertical-drop size tier like listed pins. ResortPanel: ★ FEATURED badge removed. Detail page: ★ Featured badge in hero removed. Favorites: badge removed. Header: ★ Featured ON/OFF toggle removed. DB `tier` column kept (future-proof) — just not rendered. Featured-only gates on QuickStats + About relaxed: now show whenever data exists.
- **Mountain-Forecast removed.** `mountainForecastUrl` + `mountainForecastSlug` deleted from `lib/externalLinks.ts`. ResortPanel: `Section title="Weather"` is now one card with Weather.gov + Windy.com sub-rows. Detail page: same pattern (2-card grid).
- **Detail page gains "Best time to visit"** — new `BestTimeStrip` helper. 12-month grid; highlights months in the typical_season range (handles year-end wrap like Nov-Apr). Renders only when both `typical_season_start` + `typical_season_end` exist.
- **Map style** `light-v11` → `outdoors-v12` in MapView.tsx + AlaskaInset.tsx. Terrain hillshading + park boundaries.
- **Dynamic OG image** at [app/resort/[slug]/opengraph-image.tsx](../app/resort/[slug]/opengraph-image.tsx) — Edge runtime, 1200×630, pass-color gradient + Wynla wordmark + pass badges + huge resort name + 3 stat columns. `generateMetadata` no longer builds a static-map ogImage (Next auto-detects).

Verified: typecheck clean, eslint 0 errors (10 warnings, all pre-existing in scripts/), production build green (8 routes including `/resort/-/opengraph-image`).

### Phase 2 — Data verification (next commit, post-Phase-1)
10 parallel agents fetched each resort's official `website_url` (+ `/the-mountain` `/mountain-stats` `/about` `/trails` `/stats` subpaths, 4-fetch hard cap per resort). Strict NULL-over-guess: only fields explicitly extracted from the official site were written. No Wikipedia, no inference.

**Results:**
- **277 / 451 resorts updated (61%)** — `last_verified_at = NOW()` set on each
- **1,259 field writes**
- **46 resorts unreachable** (sites refused / 403 / 404 / domain expired / Korean sports site after hijack — Nordic Valley)
- **174 resorts with no extractable stats** — mostly small mom-and-pop sites whose homepage doesn't expose specs
- **Downgrade guardrail** caught 3 obvious wrong-extracts where the site showed today's-open count instead of total: Snowbasin total_trails 104→23, Lutsen 95→58, McIntyre total_lifts 5→2 — those fields kept their existing values.

**Strong wins (full or near-full stats verified):** Loveland, Winter Park, Bridger Bowl, Beech Mountain, Bruce Mound, Stratton, Saddleback, Snowshoe, Bear Valley, Mt. Spokane, Wachusett, Waterville Valley, Burke Mountain, Perfect North Slopes, Hatley Pointe, Schweitzer, Sipapu, Winterplace, Ski Sundown, Mount Pisgah, Elk Mountain, Bromley, Steamboat, Brundage, Pleasant Mountain, Sugarbush, Schuss/Shanty Creek, Moose Mountain, Blue Hills, Appalachian, Bousquet, Diamond Peak, Ski Apache, Sunlight, Tamarack, Jackson Hole, Arizona Snowbowl, Mt. Rose, Crystal Mountain MI, Cataloochee, Blue Knob, Bogus Basin, Cascade Mountain, Snow Trails, Summit at Snoqualmie, Grand Targhee, Whitefish, Mt. Baker, Ski Big Bear PA, Bittersweet, Kissing Bridge, White Grass, Lutsen, Jiminy Peak, Monarch Mountain, Red Lodge, Pebble Creek, Hilltop AK, Windham Mountain.

**Vail Resorts blackout:** every Vail-owned property's `website_url` returned the same "system cannot process your request" reservations error → all kept their existing Wikipedia-derived stats. Affected: Hunter, Stowe, Okemo, Keystone, Heavenly, Park City, Vail, Beaver Creek, Crested Butte, Breckenridge, Mount Sunapee, Stevens Pass, Attitash, Mt. Brighton, Northstar, Wildcat, Big Boulder, Mount Snow, Whitetail, Boston Mills, Brandywine, Kirkwood, Hidden Valley MO, Snow Creek, Laurel Mountain, Mountain High. Need a different fetch path or manual verification post-launch.

**Files added:**
- `scripts/fetch-resorts-for-verify.mjs` — pulls active resorts, splits 10x
- `scripts/combine-and-apply-verify.mjs` — merges agent outputs, emits SQL
- `scripts/filter-verify-downgrades.mjs` — guardrail; final SQL emitter
- `data/sql/stage-7-verify-451.sql` — raw (pre-guardrail), audit trail
- `data/sql/stage-7-verify-451-filtered.sql` — applied to production

Applied via Supabase SQL Editor (Chrome MCP); transactional, "Success. 0 rows returned" on commit. Idempotent — re-runnable safely.

### Phase 1.5 — DB hero_image_url cleanup (deferred)
The plan called for `UPDATE resorts SET hero_image_url=NULL, hero_image_alt=NULL, hero_image_source=NULL WHERE active=TRUE;` to wipe now-unused columns. **Sandbox blocked** the clipboard op (destructive shared-infra change). It's a true no-op functionally — new code no longer SELECTs those fields. User can apply manually in Supabase SQL Editor when convenient. Not a launch blocker.

## 🔴 User actions still pending (unchanged from 2026-05-07 except where noted)
- [ ] **`git push origin main`** to deploy Stage 7. 2 new commits queued: `231b902` (redesign) + the Stage 7 data commit. Sandbox blocks the push from this session.
- [ ] **Optional: apply the 1-line hero cleanup SQL** if you want to clear unused columns: `UPDATE resorts SET hero_image_url=NULL, hero_image_alt=NULL, hero_image_source=NULL WHERE active=TRUE;` in Supabase SQL Editor.
- [ ] **Soft-launch checklist** — DM warm leads, post in NYC FB groups + r/skiing/r/snowboarding, watch Vercel Analytics for first 100 visitors.
- [ ] **Custom domain `wynla.app`** — Vercel project → Domains → add custom; update `NEXT_PUBLIC_SITE_URL` env to `https://wynla.app`; update Supabase Auth Site URL too.

## ✅ Hero image round 2 (data) — applied 2026-05-07
+104 Listed-tier resorts now have a Wikimedia Commons photo. Hero coverage **52% → 75%** (234/451 → 338/451). Method:
- [scripts/wikimedia-hero-round2.mjs](../scripts/wikimedia-hero-round2.mjs) — for every resort with `hero_image_url IS NULL`, try 6 Wikipedia title variants (exact / stripped suffix / `+ Ski Resort` / `(ski resort)` / `, State` / `(State)`). Accept the first hit whose summary mentions ski/snowboard/resort vocabulary AND doesn't trigger the reject regex (film/album/disambig).
- 228 candidates → 115 hits → 115 UPDATEs in [data/sql/stage-6.1-hero-round2.sql](../data/sql/stage-6.1-hero-round2.sql), idempotent (`WHERE hero_image_url IS NULL`).
- Confirmed post-COMMIT: `with_hero=338, total=451, pct=74.9`.
- 113 candidates skipped — no Wikipedia article found, or summary didn't read like a ski page. Kept NULL per "wrong > missing" principle. List in `output/wikimedia-round2-skipped.json` for future manual research.

## ✅ Stage 6 Result (trimmed launch polish) — what shipped
- **PWA manifest:** [public/manifest.json](../public/manifest.json) with name + short_name + display:standalone + portrait + theme #1E2952. SVG icon (works in Chrome / Edge / Safari iOS 16+) at `public/icon.svg` (Wynla mountain logo, navy + gold). Includes `shortcuts` for /favorites jump.
- **iOS PWA:** `appleWebApp.capable: true` + apple touch icon meta + theme-color via `viewport.themeColor`. iOS Safari users can "Add to Home Screen" → Wynla launches fullscreen, no browser chrome.
- **SEO meta:** `metadataBase` + title template `%s · Wynla` + OpenGraph + Twitter card meta in [app/layout.tsx](../app/layout.tsx).
- **Sitemap:** [app/sitemap.ts](../app/sitemap.ts) — dynamic, 24h revalidation. 452 URLs (homepage + 451 resorts). Featured priority 0.9, listed 0.6. Confirmed 200 OK at `/sitemap.xml` (74KB).
- **Robots:** [app/robots.ts](../app/robots.ts) — allow all except `/login`, `/auth/`, `/favorites` (auth-gated, no SEO value).
- **Analytics:** Vercel Analytics + Speed Insights wired in `app/layout.tsx`. Both no-ops until deployed to Vercel; production-only.

**Skipped from original Stage 6 spec (defer to post-launch):**
- Service worker — minimum viable PWA without it (iOS supports manifest-only). Add via `@serwist/next` post-traction if Android install prompt becomes important.
- Cookie consent / GDPR / privacy policy — nice-to-have, not legally required for US-launch product. Add when EU users appear.
- Welcome email branded template — Supabase default is fine for v1; brand later.
- Custom domain (wynla.app) — user task: Vercel + DNS.

## ✅ Stage 5 Result (trimmed) — what shipped
- **Schema:** [data/sql/stage-5-auth-schema.sql](../data/sql/stage-5-auth-schema.sql) — `profiles` (1:1 with auth.users, auto-created via trigger) + `favorites` (composite PK on user+resort). Both with RLS so a user only ever sees/edits their own rows. Applied via Supabase SQL Editor.
- **Auth clients:** `lib/supabase/server.ts` (RSC + Route Handlers + Server Actions) and `lib/supabase/client.ts` (browser). Both use `@supabase/ssr`.
- **Next.js 16 proxy:** `proxy.ts` (NOT middleware.ts — Next 16 renamed the convention) refreshes the Supabase auth cookie on every request. Matcher excludes static assets.
- **Login UI:** `/login` magic-link form. Submits via `signInWithOtp`; redirect URL preserves `next=` for post-auth landing.
- **Auth callback:** `app/auth/callback/route.ts` exchanges the magic-link code for a session via `supabase.auth.exchangeCodeForSession()` then redirects to `next`.
- **Header AuthButton:** subscribes to `onAuthStateChange`; shows "Sign in" when signed-out, avatar dropdown (email + Favorites + Sign out) when signed-in. Renders skeleton during initial load to avoid layout shift.
- **FavoriteToggle:** heart icon. Optimistic toggle with rollback on error. Anonymous click → bounce to `/login?next={current}`.
- **Heart wired into:** ResortPanel (top-right of hero) + Resort detail page hero (next to ★ Featured badge).
- **/favorites page:** server-rendered grid of saved resorts with hero image, state, region, vert, pass badges. RLS-implicit user scoping. Empty state with CTA back to map. Auth-guarded — redirects to `/login?next=/favorites` if not signed in.

## ✅ User actions DONE (2026-05-07 evening)
- [x] git push origin main — 11 commits live
- [x] Vercel env vars (4 vars: SITE_URL, MAPBOX_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY)
- [x] Vercel redeployed after token fix (Mapbox token was stale → updated from .env.local)
- [x] Supabase Auth Site URL + 3 Redirect URLs configured
- [x] Magic-link e2e tested — works
- [x] Favorites tested — works
- [x] Pro waitlist tested — works

## 🔴 User actions still pending
- [ ] **Soft-launch checklist** — wait until UX redesign phase complete (decisions #1-4 above):
  - DM 10–20 commenters from Snowboard The East post (warm leads)
  - Post in r/skiing + r/snowboarding (mention 451-resort coverage + multi-pass color map)
  - Post in NYC snowboard Facebook groups
  - Watch Vercel Analytics for first 100 visitors
- [ ] **Custom domain `wynla.app`** — when ready: Vercel project → Domains → add custom; update `NEXT_PUBLIC_SITE_URL` env to `https://wynla.app`; update Supabase Auth Site URL too

## ✅ Stage 4.4 Result — what shipped (Polish)
- **Empty state UI** when filters return zero — centered card with 🔍 icon, "No resorts match" + "Reset all filters" CTA. Uses `pointer-events-none` overlay so map remains pannable behind it.
- **Panel slide-in animations** — mobile slides up from bottom, desktop slides in from right. 220ms cubic-bezier easing (slow-out matches AllTrails). Disabled via `prefers-reduced-motion`.
- **Map auto-pan on resort selection** — when a pin is clicked or a deeplinked resort opens the panel, `easeTo` with `padding: {right: 380}` (desktop) / `{bottom: 380}` (mobile) shifts the camera so the pin sits visually centered in the *unobstructed* portion of the map (not under the panel). 600ms duration, smooth.
- **Virtualized rendering** — Mapbox's native clustering already handles 451 markers efficiently; no separate virtualization needed.

## ✅ Stage 4.3 Result — what shipped
- **Drive-time cache backfilled 451 × 4 = 1804 routes** via Mapbox Matrix API (76 calls, 21s), replacing the partial 120-route cache. Now ALL resorts have drive times from NYC/Boston/Philly/Hartford. Coverage: 6.7% → 100%.
- **Day-trip / Weekend chip presets** in FilterBar — replaces the granular "Any/2h/3h/4h/5h" dropdown with one-tap chips: `Anytime · 🚗 Day trip (≤3h) · 🏕️ Weekend (≤5h)`. Matches how skiers actually plan; URL still uses `within=3` / `within=5` so deep links unchanged.
- **scripts/compute-drive-times.mjs upgraded** to use Mapbox Matrix API (1 origin × 24 destinations per call) instead of Directions API (1 origin × 1 destination). 24× fewer API calls.
- **scripts/check-drive-cache.mjs** — read-only audit utility for verifying coverage state.
- Sort options deferred to Stage 4.4 (only meaningful with a list view, which 4.4 may add).

## ✅ Stage 4.2 Result — what shipped
- **2 new files:** `lib/externalLinks.ts` (5 shared URL builders), `components/Map/ResortPanel.tsx` (responsive side panel + bottom sheet, ~270 lines)
- **MapView refactor:** removed Mapbox popup + `buildPopupHtml`; pin click → `onResortClick(id)` callback. Selected pin gets navy halo via Mapbox `feature-state` (no GeoJSON re-emit).
- **MapPage wiring:** `selectedId` state, ESC-to-close, scrim-tap-to-close on mobile, panel auto-updates drive time when From-city filter changes.
- **URL persistence audit (4.1 gap closed):** `featured` was `useState`-only, now `?featured=1`. All 5 filters (`pass`/`size`/`from`/`within`/`featured`) round-trip through URL.
- **Detail page DRY:** `mountainForecastSlug` moved to shared helpers; detail page now imports same URL builders panel uses → change once, propagates everywhere.
- **Home query:** added `hero_image_url`, `total_trails`, `total_acres`, `website_url` (~60KB extra payload for 451 resorts, negligible).
- **Browser verification:**
  - URL `?featured=1&pass=epic&size=large&from=boston&within=4` → all filters reflected in UI ✓
  - Click Big Snow American Dream (listed) → panel: name + NJ · Meadowlands + Independent badge + 3 weather links (MF/WG/Windy) + Google Maps + Resort website + View full details. All 6 link hrefs verified.
  - Click Hunter Mountain (featured) → ★ Featured badge + 3 stats grid (1,600 ft / 67 trails / 320 acres).
  - ESC closes panel ✓
  - Responsive classes: mobile (`inset-x-0 bottom-0 max-h-[78vh] rounded-t-2xl`) + desktop (`md:right-0 md:top-0 md:bottom-0 md:w-[380px]`) both present, drag handle has `md:hidden`.

## ✅ Featured 30 → 50 (applied 2026-05-07)
20 flagship resorts promoted Listed → Featured with verified Wikipedia stats + Wikimedia Commons photos. SQL applied via Supabase SQL Editor (Chrome MCP); confirmed `featured_count = 50` post-commit.

**Promoted:** Aspen Snowmass · Jackson Hole · Big Sky · Snowbird · Alta · Telluride · Sun Valley · Snowbasin · Vail · Park City · Mammoth Mountain · Beaver Creek · Breckenridge · Crested Butte · Killington · Sunday River · Sugarloaf · Jay Peak · Bretton Woods · Taos Ski Valley.

**Coverage shift:** previous 30 were 100% Northeast/Mid-Atlantic (NYC traffic skew); new 20 add CO/UT/CA/MT/WY/ID/NM/ME → map now visually balanced for nationwide use.

**Method:** [scripts/scrape-flagship-wikipedia.mjs](../scripts/scrape-flagship-wikipedia.mjs) → output/flagship-data.json → [scripts/build-promotion-sql.mjs](../scripts/build-promotion-sql.mjs) → [data/sql/stage-4.2-extra-featured-promotions.sql](../data/sql/stage-4.2-extra-featured-promotions.sql). Idempotent: only fills NULL fields, never overwrites existing values. Out-of-bounds sanity check skipped suspect parses (Telluride lifts manually overridden after WebFetch verification).

**Stats backfilled per resort:** vertical_drop, elevation_summit/base, total_trails, total_lifts, total_acres, longest_run_miles, has_terrain_park, terrain_park_count, hero_image_url + alt + source. ~12 fields/resort × 20 resorts = ~240 data points added.

## 📱 Mobile Strategy Revised (locked 2026-05-07)
Founder asked "iPhone app first?" — analysis (PM/CFO/marketing lens) pushed back. **New ordering:**
1. **PWA in Stage 6** (manifest + service worker + Apple touch icon + Add to Home Screen) — 80% of native-app feel, ships at launch
2. **Native iOS = Stage 7** triggered by ~500–1,000 PWA users with retention signal — not a fixed month
3. Android native = Month 8+ if iOS hits 5K users

**Why deferred:** App Store first submission 2-4 weeks; per-update review 1-7 days kills iteration speed; $99/yr; real moat is best-in-class UX + SEO compounding, not "we have an app too." Roadmap doc updated: [STAGE_4_5_6_PLANS.md §6.9 + §7](STAGE_4_5_6_PLANS.md).

## 🟡 OPEN PROPOSAL — Re-sequence Stage 5/6 (decide at end of Stage 4.4)
Logged 2026-05-07 after PM/CFO/marketing-skill analysis of remaining roadmap. **Not approved yet** — revisit when Stage 4 complete.

Concern: ~10–15 days of build remain (4.2 → 4.4 → 5 → 6) before any real-world user signal. Solo founder + bootstrap economics → time = capital; every day of build without users is opportunity cost.

Tactical observations:
1. **Soft-launch after Stage 4.4**, not after Stage 6 — `ridewise-rcko.vercel.app` is shippable to NYC warm leads (Snowboard The East post DMs) without auth. Stage 5 becomes "first iteration after 50–100 users", not "before launch".
2. **Stage 5 scope likely over-built** — auth+favorites is the retention loop; trips planner + drag-reorder + history assume user behavior we haven't validated. Cut to auth+favorites for v1, defer trips/history to post-traction signal.
3. **Monetization signal absent** — Pro tier $19.99/yr lives in Month 4-5 plan with 0 willingness-to-pay data. Add "Notify me when Pro launches" form during Stage 4.4 polish (~30 min, real signal pre-paywall).

Plan stays approved; this is a *re-sequencing* proposal, not an overhaul. Do not act on this until Stage 4.4 complete.

## ✅ Last Session Result — Stage 4.1 delivered
- **Map foundation (7 files in `lib/` + `components/Map/` + `app/page.tsx`):**
  - Pass color update + priority order **MC > Ikon > Epic > Indy > Independent** for primary-pin coloring on multi-pass resorts (e.g. Snowbasin shows MC navy).
  - NEW `lib/sizeTier.ts` — vertical_drop → small <1000 / medium 1000-2500 / large >2500. **Filter semantics: NULL inclusive when no chip active, STRICT (NULL hidden) when chip active. Hidden NULL count surfaced as caption.**
  - `MapView.tsx` full refactor: GeoJSON source + native Mapbox 3.x clustering (no `supercluster` pkg needed), 5 layers (cluster bubble + count + listed + featured + ★ symbol), `clickTolerance: 22` = 44 px effective touch target, `pitchWithRotate/dragRotate: false`. **Uses `style.load` event NOT `load`** — Mapbox 3.x + React 19 strict-mode double-mount makes `load` unreliable.
  - NEW `AlaskaInset.tsx` — separate small map bottom-left, 200×150 desktop / 120×90 mobile, no controls, auto-hidden if no AK resorts pass current filter.
  - `FilterBar.tsx` — added size chips row + hidden-count caption.
  - `app/page.tsx` — added `vertical_drop` to resorts SELECT.
- **Detail-page UX cleanup (`app/resort/[slug]/page.tsx`):**
  - REMOVED inline 7-day Open-Meteo widget + `WeatherCard` component + `lib/weather.ts` (was only used here).
  - REMOVED OpenSnow + Snow-Forecast.com links (paywalled / unreliable per user testing).
  - ADDED "Current Conditions" section with 3 curated free links (Mountain-Forecast / Weather.gov / Windy.com), available for ALL tiers.
  - Google Maps link switched from `?q={lat,lng}` (generic pin) to `?api=1&query={name}+{state}+ski+resort` (full business listing with photos/reviews). Edge case: name-only fallback if state missing.
  - New `mountainForecastSlug()` helper strips "Resort"/"Ski Area" suffix + apostrophes so "Killington Resort" → `Killington`, "Stowe Mountain Resort" → `Stowe`.
- **3 Batch-5 "skipped" resorts verified** via diagnostic SELECT — all 3 (`mt-brighton`, `alpine-valley-oh`, `killington`) ALREADY in DB with correct passes. Pico Mountain exists as separate row. Idempotent UPSERT run anyway → backfilled vertical_drop (230/230/3050). Active count remains 451. SQL preserved at `data/sql/stage-4.1-prep.sql`.
- **Browser verification (via JS DOM checks; MCP screenshot times out on Mapbox-heavy pages):**
  - Default state: 451 features, all 4 size tiers including unknown:288, no caption.
  - `?size=small` → 89 features (all `tier=small`, zero leakage), caption "288 resorts with unknown size hidden".
  - Hunter Mountain detail page: Google Maps URL = `?api=1&query=Hunter%20Mountain%20NY%20ski%20resort` ✓; 3 Current Conditions links present (Mountain-Forecast `/Hunter-Mountain`, Weather.gov w/ coords, Windy w/ coords); old "7-Day Forecast" / OpenSnow / Snow-Forecast.com all gone.

## 🔴 Blockers / Open Decisions
- [ ] **Drive time data gap (Hunter Mountain)** — featured resort showed no Drive time card in Stage 4.2 panel from NYC. Likely missing `drive_time_cache` row, not a code bug. Verify scope when starting Stage 4.3 (drive-time calc would backfill anyway).
- [ ] **OpenRouteService API key** — needed for Stage 4.3 drive-time calculation (free tier 2000 calls/day at openrouteservice.org). Not a blocker for 4.2.
- [ ] **Mountain-Forecast slug 404 monitoring** — some resort names (e.g. "Mt-Brighton") may 404. Switch to search URL globally if widespread. Initial spot-check: Killington/Stowe/Hunter/Aspen/Big Bear all map cleanly.
- [ ] Batch 4 (73 conflicts, mostly URL `www.` / trailing-slash variants) — defer until after Stage 4 launch; write a normalization rule then.
- [ ] Featured tier promotion candidates (Mammoth, Aspen Snowmass, Big Bear) — manual decision, separate from Stage 4 scope.
- [ ] Epic Pass Phase 2 (re-fetch with proper resort-listing strategy) — defer; current 38 USA Epic resorts from hardcoded Wikipedia list are sufficient for Stage 4.

## ⏭️ NEXT ACTION
**Begin Stage 4.2 in next fresh session.** Scope per [STAGE_4_5_6_PLANS.md](STAGE_4_5_6_PLANS.md):
- Side panel (desktop) / bottom sheet (mobile) — replace Mapbox popup with persistent panel slid in from right
- Filter persistence in URL — **already done in 4.1** via `useSearchParams` (pass / size / from / within all in URL)
- Wire Windy.com + Mountain-Forecast + Weather.gov links into MAP popup too (currently only on detail page); apply same name-based Google Maps URL there
- Estimated: 1 day

## 🧭 Recent Decisions (last 10, dated)
- 2026-05-07: **Featured tier: 30 → 50 with regional balance.** Original 30 were 100% Northeast (NYC traffic skew); new 20 add Western flagships (Aspen, Vail, Park City, Big Sky, Jackson Hole, Mammoth, Telluride etc) so a CA/CO/UT user landing fresh sees their home mountain Featured. Did NOT add Stowe / Heavenly / Kirkwood / Sugarbush — Wikipedia titles didn't resolve cleanly; defer until manual research round.
- 2026-05-07: **Wikipedia infobox + Wikimedia Commons = trustable data source for flagship stats.** Reverses the Stage 3.6 "no Wikipedia for pass affiliations" rule for THIS use case only — Wikipedia is unreliable for editorial claims (which pass a resort is on, etc) but reliable for hard stats (vertical drop, trails, acres). Verification rule: cross-check via WebFetch when single record looks anomalous (Jackson Hole / Telluride lift counts both needed manual override after parser ate first number of multi-line lift breakdown).
- 2026-05-07: **PWA pulled forward into Stage 6; native iOS becomes Stage 7 (retention-triggered).** Reverses the Month 3 PWA / Month 6 native cadence. Reasons: App Store review 2-4 weeks first submission + 1-7 days per update kills iteration speed, $99/yr cash cost matters bootstrap, real moat is best-in-class UX + SEO compounding. PWA gives 80% of "feels like an app" without overhead. Don't ship native until 500-1K PWA users with retention signal.
- 2026-05-07: **Stage 4.2 architecture: panel as overlay, not layout shift.** ResortPanel uses `fixed` positioning + z-40 over header (z-10) on desktop; mobile gets bottom sheet with scrim. Avoided layout-shift approach (map width changing) because it breaks Mapbox's viewport calculations during the transition. Tradeoff: panel covers right portion of header on desktop — acceptable since header buttons stay accessible at left side and panel has its own X.
- 2026-05-07: **Selected pin uses Mapbox `feature-state`, not GeoJSON re-emit.** When user clicks a pin, only that feature's `selected: true` state toggles → navy halo via `case` expression in paint. Cheaper than re-emitting 451 features just to add `selected` property. Matches how Mapbox examples handle hover states.
- 2026-05-07: **`featured` filter promoted from useState to URL param.** Stage 4.1 had pass/size/from/within in URL but `featuredOnly` in local state (inconsistency). Now `?featured=1`. Reason: deep-linking + page refresh should preserve full filter state.
- 2026-05-07: **External link helpers extracted to `lib/externalLinks.ts`.** `mountainForecastSlug` was duplicated risk between detail page + future panel. Now: `mountainForecastUrl`, `weatherGovUrl`, `windyUrl`, `googleMapsUrl`, `bookingComUrl` — single source of truth. Both surfaces import from the same module.
- 2026-05-04: **Size filter behavior refined: strict-when-active.** NULL vertical_drop is HIDDEN when any size chip is active; INCLUSIVE only when no chip selected. Caption "{N} resorts with unknown size hidden" shown when NULL count > 0 and filter is active. **Reverses the kickoff "always inclusive" rule** based on real-world testing — mixed sizes broke the "I clicked Small" mental model.
- 2026-05-04: **Google Maps link uses name+state search** (`?api=1&query={name}+{state}+ski+resort`), was lat/lng → unhelpful generic pin without name/photos/reviews. Edge case: name-only fallback if state missing.
- 2026-05-04: **Removed inline weather widget from detail pages.** Wynla is a trip planner, not a conditions app — curating external sources (Mountain-Forecast, Weather.gov, Windy.com) better serves users than maintaining mediocre inline data via Open-Meteo. Aligns with "wrong > missing" + premium curator positioning. `lib/weather.ts` deleted entirely (only used in detail page).
- 2026-05-04: **External weather link-out set finalized** — drop OpenSnow (paywalled login wall) + Snow-Forecast (unreliable / errors). Use Mountain-Forecast (ski-specific by elevation) + Weather.gov (US gov 7-day) + Windy.com (animated wind, brought forward from Stage 4.2 plan). All free, no login. Available on ALL detail pages, not just featured.
- 2026-05-04: **Pass priority order locked: MC > Ikon > Epic > Indy > Independent** — most prestigious wins for primary-pin color on multi-pass resorts. e.g. Snowbasin (Epic+Ikon+MC) shows MC navy. Filter-aware coloring deferred to Stage 4.4 evaluation.
- 2026-05-04: **Featured tier exempt from size-tier downsize** — Featured pins always 30 px + ★, even if a Featured resort is "Medium" by vertical drop. Size filter still applies to Featured (data filter, orthogonal to visual emphasis). Confirmed during Stage 4.1 kickoff.
- 2026-05-04: **3 Batch-5 "skipped" resorts confirmed already in DB with correct passes** — diagnostic SELECT showed `mt-brighton` / `alpine-valley-oh` / `killington` already present and correctly tagged. Pico Mountain exists as separate row. Skip in Batch 5 was correct (slug collisions). UPSERT run anyway to backfill vertical_drop. Active count remains 451.
- 2026-05-04: **Stage 4 sub-stage split (4.1 Foundation / 4.2 Detail / 4.3 Smart / 4.4 Polish)** — APPROVED; thematic grouping vs original 4.1–4.10 sequential checklist. Confirm-then-proceed cadence per stage.
- 2026-05-04: **Size filter (3-tier by vertical_drop):** 🟢 Small <1,000 ft · 🟡 Medium 1,000–2,500 ft · 🔴 Large >2,500 ft. NULL vertical = show "—" icon, INCLUSIVE in all filters (never hide). Visual: pin scale 12/16/20 px (size, not color); 44×44 px touch target NON-NEGOTIABLE. Implement in Stage 4.1.
- 2026-05-04: **Ikon pass color #000000 → #F2C200** (Ikon brand yellow). Reason: black pins blended with map UI; yellow more distinctive + matches Ikon's actual brand accent. Apply: map pins / filter chips / pass badges / any Ikon indicator.
- 2026-05-04: **External wind data via Windy.com link-out** (Stage 4.2 side panel). URL pattern `https://www.windy.com/?wind,{lat},{lng},12` — auto-generated from resort lat/lng, no API. Same pattern as existing OpenSnow link-out. Resorts without lat/lng (~10%): hide button OR fallback to windy.com homepage (decide at implementation). Rationale: animated wind layer is best-in-class UX, free, snowboarders/skiers actually use this.
- 2026-05-04: **All 5 Stage-3.5 batches applied** via Chrome MCP into Supabase SQL Editor. Production DB now 451 active resorts, 214 hero images, pass affiliations 100% verified from official sources (Indy/Epic/Ikon/MC).
- 2026-05-04: **DB schema reality differs from doc** — production has `passes TEXT[]` (multi-pass) + `tier` + `hero_image_source/alt` + `last_verified_at` + `operating_status`. DATABASE_SCHEMA.md is outdated; treat exported JSON as source of truth.
- 2026-05-04: **DB has 385 active rows (not 405)** pre-Batch-5 — verified via Supabase JSON export.
- 2026-05-04: **USA + Alaska only for unified output** — Wynla is a US-market product (per BUSINESS_CONTEXT.md). International records saved to `output/unified_resorts_intl.json` but won't enter the diff.
- 2026-05-04: **Option A approved** — replace pass data with official pass-website scrape, ditch Wikipedia. Reason: Wikipedia audit gave 116 discrepancies, many wrong.
- 2026-05-04: User principle reaffirmed: "ข้อมูล pass ถูก 100%" / "wrong > missing" / "NULL > guess".

## 🚫 Don't Do (anti-patterns learned)
- **Don't try to compete with specialized apps** (OpenSnow, Mountain-Forecast, Snow-Forecast). Wynla = planner. Curate external sources, don't replicate. Lesson learned 2026-05-04 from Open-Meteo widget being mediocre vs the dedicated apps.
- **Don't change pass colors lightly** — Ikon `#000000`→`#F2C200` change had specific UX reason (map pin visibility). Don't repaint without similar evidence.
- **Don't use Wikipedia for pass affiliations** — caused 116 unreliable discrepancies (e.g. Windham wrong correction).
- **Don't auto-apply data changes** — always show diff, batch-confirm with user.
- **Don't trust scraper output without QC** — Phase 1 first run had `name="Filament Group, Inc"` (CSS framework footer leak). Always check field-fill stats + sample 5 random records before treating as truth.
- **Don't fabricate stats** — show "—" / NULL when unverified.
- **Don't overhaul the 6-stage roadmap** — already approved.
- **Don't propose alternate tech stack** — Next.js + Supabase + Mapbox locked.
- **Don't re-debate community features** — deferred post-launch.
- **Don't re-debate native-app-first** — web-first decision is final.
- **Don't promote Listed → Featured tier in code** — separate manual decision per resort (curation).

## 📁 Key Files Reference
- `wynla-handoff/CURRENT_STATUS.md` — this file; read at start of every session
- `wynla-handoff/SESSION_PROTOCOL.md` — how every Claude Code session is structured
- `wynla-handoff/STAGE_4_5_6_PLANS.md` — detailed specs for Stage 4 / 5 / 6
- `wynla-handoff/DEVELOPMENT_ROADMAP.md` — full 6-stage build plan
- `wynla-handoff/DESIGN_GUIDE.md` — brand colors (incl. updated Ikon yellow), size tier visuals, components, layouts
- `wynla-handoff/BUSINESS_CONTEXT.md` / `PRODUCT_SPEC.md` / `TECHNICAL_SPEC.md` / `QUICK_START.md` / `README.md` — static project docs
- `scripts/scrape-pass-data.mjs` + `SCRAPE_README.md` — Playwright scraper
- `scripts/build-pass-truth.mjs` — combines 4 sources into unified pass truth
- `scripts/diff-resorts.mjs` — DB ↔ scraper diff
- `scripts/generate-apply-sql.mjs` — emits batch SQL files
- `data/sql/batch-{1..6}*.sql` — applied SQL files (idempotent, transactional)
- `output/unified_pass_truth.json` — 241 USA records, 4-source merged

## 📊 Data Stats Snapshot
- **Resorts in DB: 451 active** (50 Featured + 401 Listed)
- **Hero images: 338 / 451 (75%)** — was 214 (47%) → 234 (52%, after Featured promotion) → 338 (75%, after Wikimedia round 2). Featured tier hero coverage = 100% (50/50). Listed tier 288/401 (72%).
- **Pass affiliations 100% verified** from official sources (Indy/Epic/Ikon/MC)
- Pass distribution: Epic 40 · Indy 229 · Ikon 59 · Mountain Collective 22 · Independent (none on any pass) ~163
- Multi-pass resorts: ~25 (e.g. Snowbasin / Sun Valley / Telluride on Epic+Ikon+MC; Aspen Snowmass on Ikon+MC; Snowriver MI on Indy+Ikon)
- New Listed-tier resorts added Batch 5: 66 — incl. Mammoth Mountain (CA), Aspen Snowmass (CO), Big Bear (CA), The Highlands (MI), 3 Alaska resorts (Eaglecrest, Moose Mountain, Mt Eyak)
- Live URL: https://ridewise-rcko.vercel.app (will become wynla.app at Stage 6)
- GitHub: github.com/saitarncare-netizen/wynla

---

*For static project info (brand, tech stack, business model, etc.) see BUSINESS_CONTEXT.md / TECHNICAL_SPEC.md / DESIGN_GUIDE.md / README.md*
