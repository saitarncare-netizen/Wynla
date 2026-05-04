# Wynla pass-truth scraper

Authoritative resort data for the four major US ski-pass programs:
**Indy Pass, Epic Pass, Ikon Pass, Mountain Collective**.

The scraper fetches each pass website's official resort listings *and*
the per-resort detail pages, extracts hero images + resort websites +
stats, and emits one merged JSON ready to diff against the Wynla
database. Designed to be run locally (your machine, your IP) so it's
respectful to the source sites and doesn't burn through Vercel quotas.

---

## Prerequisites

- **Node 20+** (check with `node --version`)
- **Playwright with Chromium** — installed once via npm script below

No paid APIs. No keys.

---

## Install

From the project root (`C:\Users\saita\ridewise\`):

```bash
npm install
npx playwright install chromium
```

The first command installs the Playwright SDK as a dev dependency; the
second downloads the Chromium browser binary (one-time, ~150 MB).

---

## Run

### Full scrape (all 4 sites, ~20 min)

```bash
npm run scrape:pass-data
```

### One site at a time (debugging or partial reruns)

```bash
npm run scrape:pass-data -- --site=indy
npm run scrape:pass-data -- --site=epic
npm run scrape:pass-data -- --site=ikon
npm run scrape:pass-data -- --site=mc
```

### Bypass cache (force re-fetch everything)

```bash
npm run scrape:pass-data -- --force
```

### Help

```bash
npm run scrape:pass-data -- --help
```

---

## What it does

1. Fetches each pass site's resort listing page with a real Chromium
   browser (so React/JS apps render correctly).
2. Saves raw HTML to `cache/{site}/listing.html`.
3. Parses the listing with cheerio to get every resort's name, state,
   slug, and detail-page URL.
4. For each resort, fetches the detail page (concurrency 4, 1.5s pause
   between batches), saves to `cache/{site}/detail/{slug}.html`.
5. Extracts hero image URL, resort website URL, lat/lng if present,
   and pass access type.
6. Merges all four sites into `output/unified_resorts.json`, deduping
   resorts that appear on multiple passes (e.g. Aspen on Ikon + MC).
7. Logs failures separately — anything that timed out or returned
   weird HTML lives in `output/failed_resorts.json`.

---

## Guardrails (built in)

- **HTML cache to disk** — every fetch is saved to `cache/...html`.
  Re-runs read from cache, never re-fetch unless `--force`.
- **Per-fetch timeout 10 s** — one stuck page can't block the batch.
- **Concurrency 4** — max 4 fetches in flight at any time.
- **1.5 s pause between batches** — polite to the source sites.
- **Retry × 2 on failure** — flaky network is forgiven.
- **Failure list separate** — anything still failing is in
  `failed_resorts.json` for manual review.
- **Resume capability** — if the script crashes mid-run, just re-run
  it. It'll pick up where it left off using the cache.
- **Source attribution per field** — `hero_image_source` is set to
  the pass site that supplied it, so we can show "Photo: Indy Pass
  official site" in the trust footer later.
- **Progress every 20 resorts** — you'll see counts so the run
  doesn't feel hung.

---

## Expected runtime

| Phase | Resorts | Time at concurrency 4 |
| --- | --- | --- |
| Indy listing + ~150 details | 150 | ~7 min |
| Epic regions + ~37 details | 37 | ~2 min |
| Ikon listing + ~44 details | 44 | ~3 min |
| MC listing + ~17 details | 17 | ~1 min |
| **Total** | **~250** | **~15-20 min** |

First run is the longest. Re-runs are seconds (cache hits).

---

## Output files

```
output/
  indy_detailed.json           ← Indy pass partners with full detail
  epic_detailed.json
  ikon_detailed.json
  mc_detailed.json
  unified_resorts.json         ← merged + deduped, ready to diff against DB
  failed_resorts.json          ← anything that didn't extract cleanly
```

Each resort in the JSON looks like:

```json
{
  "name": "Hunter Mountain",
  "name_normalized": "hunter-mountain",
  "city": "Hunter",
  "state": "NY",
  "country": "USA",
  "vertical_drop_ft": 1600,
  "trails": 67,
  "lifts": 13,
  "night_skiing": false,
  "terrain_park": true,
  "hero_image_url": "https://...",
  "hero_image_source": "epic",
  "resort_website_url": "https://www.huntermtn.com",
  "lat": 42.18,
  "lng": -74.23,
  "pass_access_type": "Unlimited",
  "passes": ["epic"],
  "pass_source_urls": { "epic": "https://www.huntermtn.com/" },
  "region": "Catskills",
  "scraped_at": "2026-05-04T..."
}
```

---

## What to do with output (next session)

When you come back to a Wynla coding session, paste the contents of
`output/unified_resorts.json` (or just commit it and tell me) and ask:

> "Diff `output/unified_resorts.json` against the resorts table.
>  Show me the changes batched by impact, then we'll apply 20 at a time."

I'll generate a `data/upgrade_corrections.sql` you review and run in
Supabase. Same workflow as the previous audits — no auto-writes,
batched human review.

---

## Troubleshooting

**"executable doesn't exist" / Playwright complains about chromium**

Run `npx playwright install chromium` again. The browser binary lives
in your home directory's Playwright cache and may need re-downloading.

**Indy listing parsed 0 items**

Indy's selectors might have changed. Inspect
`cache/indy/listing.html` and look for the actual class names of the
resort cards. Update `parseIndyListing` in
`scripts/scrape-pass-data.mjs`. The script tries `<a href="/our-resorts/...">`
which is broad — usually robust to minor design changes.

**Ikon listing parsed 0 items even though I see resorts in the cache**

Ikon's React app renders cards async. The script waits for the
selector `a[href*='/en/destinations/']` to appear. If it times out,
the cache will have an unhydrated shell. Increase the wait or run
without headless mode while debugging:

```js
// in scrape-pass-data.mjs, around the chromium.launch line:
const browser = await chromium.launch({ headless: false, slowMo: 200 });
```

**Epic regions page returns a CDN error or system-down message**

This is what happened during my Wynla session. Possible mitigations:
1. Try a different time of day (their CDN/anti-bot is sometimes
   region-throttled).
2. Use a residential VPN before running.
3. Fall back to `https://www.vailresorts.com/our-resorts.aspx` —
   change `SITE_CONFIG.epic.listingUrl` to that and the rest of the
   parser will adapt (tweak `parseEpicListing` selector if needed).

**Some detail pages timeout but most succeed**

Expected. Retry once with `--force --site=<site>` to re-fetch only
the failures (they aren't in cache so they'll be retried).

**I want to add a 5th site (e.g., Mountain West Pass)**

Add a `SITE_CONFIG` entry, write a `parseXxxListing` and
`parseXxxDetail`, and add `xxx` to the SITES list. The merge logic
will pick it up automatically.

**The script keeps re-scraping the same pages**

Make sure the `cache/` directory is preserved between runs (don't
.gitignore your local cache). If you intentionally want to re-scrape,
use `--force`.

---

## Notes on data quality

- **Pass affiliations** from these four sites are authoritative —
  if a resort is listed on Indy's site, it IS on Indy. Period. This
  is the whole reason we run the script.
- **Stats from listing cards** (vertical drop, trails, lifts) are
  what the resort told the pass program — not always identical to the
  resort's own website but close enough for our use.
- **Hero images** are pulled via Open Graph meta tags first, then
  hero-class images. Quality is usually high but a few resorts may
  return logos or generic photos. Spot-check before applying.
- **Resort websites** come from the "Visit Resort" link on each
  detail page. If a resort doesn't have one or it's broken, the field
  is `null` — better than a wrong link.

---

## When to re-run

- Start of each ski season (October-ish) — pass rosters change yearly
- After Mountain Collective announces new partners (usually summer)
- After Vail or Alterra acquires a resort
- Whenever you notice a Wynla user reporting wrong pass info
