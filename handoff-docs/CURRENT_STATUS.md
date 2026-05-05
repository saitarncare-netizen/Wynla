# Wynla — Current Status
Last updated: 2026-05-04 (Stage 4.1 complete)

## 🎯 Current Stage
**Stage 4.1 (Map Foundation) COMPLETE.** Map + filters + Alaska inset shipped, detail page refactored, 4 UX bugs fixed in same commit. Ready for Stage 4.2 (Detail Experience side panel).

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
- **Resorts in DB: 451 active** (30 Featured + 421 Listed)
- **Hero images: 214 / 451 (47%)** — was 22 / 385 (5.7%); 9.7x increase
- **Pass affiliations 100% verified** from official sources (Indy/Epic/Ikon/MC)
- Pass distribution: Epic 40 · Indy 229 · Ikon 59 · Mountain Collective 22 · Independent (none on any pass) ~163
- Multi-pass resorts: ~25 (e.g. Snowbasin / Sun Valley / Telluride on Epic+Ikon+MC; Aspen Snowmass on Ikon+MC; Snowriver MI on Indy+Ikon)
- New Listed-tier resorts added Batch 5: 66 — incl. Mammoth Mountain (CA), Aspen Snowmass (CO), Big Bear (CA), The Highlands (MI), 3 Alaska resorts (Eaglecrest, Moose Mountain, Mt Eyak)
- Live URL: https://ridewise-rcko.vercel.app (will become wynla.app at Stage 6)
- GitHub: github.com/saitarncare-netizen/wynla

---

*For static project info (brand, tech stack, business model, etc.) see BUSINESS_CONTEXT.md / TECHNICAL_SPEC.md / DESIGN_GUIDE.md / README.md*
