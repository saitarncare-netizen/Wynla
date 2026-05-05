# 🎯 MASTER PROMPT FOR CLAUDE CODE — Data Refresh from Official Sources

## How to Use This File

1. Open Claude Code in your wynla project folder
2. Copy everything in the code block below (starts with ```, ends with ```)
3. Paste into Claude Code
4. Press Enter
5. Wait for Claude Code to execute (estimated 6-8 hours of focused work)

---

## The Prompt

```
DATA REFRESH: Re-import resort data from OFFICIAL pass websites

User feedback: "ใช้เว็บเหล่านี้เป็นการหาข้อมูลแทนได้หรือเปล่า"
- https://www.indyskipass.com/our-resorts
- https://www.epicpass.com/regions.aspx
- https://www.ikonpass.com/en/destinations
- https://mountaincollective.com/

User principle: "ข้อมูล pass ทั้งหมดถูก + ข้อมูลทุกอย่างถูก 100%"

═══════════════════════════════════════════════════════════
GOAL
═══════════════════════════════════════════════════════════

แทนที่ pass info ในปัจจุบัน (มี 116 discrepancies จาก Wikipedia audit)
ด้วยข้อมูลจาก OFFICIAL pass websites = 100% verified

═══════════════════════════════════════════════════════════
SCOPE: 4 Official Sources
═══════════════════════════════════════════════════════════

1. Indy Pass: https://www.indyskipass.com/our-resorts
   - Filter region: "All Resorts" or by region (East, Mid-Atlantic, etc.)
   - Each resort card has: name, city/state, vertical, trails, lifts, night, t-parks
   - Detail page: https://www.indyskipass.com/our-resorts/[slug]
   - Hero image URL embedded in each card

2. Epic Pass: https://www.epicpass.com/regions.aspx
   - May need JavaScript rendering (use Playwright if needed)
   - Get list of all Epic Pass resorts

3. Ikon Pass: https://www.ikonpass.com/en/destinations
   - JavaScript-rendered, use Playwright
   - Both Alterra-owned + partner resorts
   - Note: Ikon has tiers (full member, partner, limited)

4. Mountain Collective: https://mountaincollective.com/
   - 27 premium destinations
   - Each has detail page

═══════════════════════════════════════════════════════════
SCRAPING APPROACH
═══════════════════════════════════════════════════════════

## Tools
- Use Playwright for JavaScript-rendered sites (Epic, Ikon)
- Use simple fetch for static HTML (if works)
- Add 2-3 second delay between requests (be respectful)
- Cache HTML responses (don't re-scrape if already have)

## Data Extraction Per Resort
For EACH resort found on pass websites:

{
  "name": "Hunter Mountain Resort",
  "name_normalized": "hunter-mountain",
  "city": "Hunter",
  "state": "NY",
  "country": "USA",
  "vertical_drop_ft": 1600,
  "trails": 67,
  "lifts": 13,
  "night_skiing": true,
  "terrain_parks": true,
  "hero_image_url": "https://...",
  "resort_website": "https://...",
  "passes": ["epic"],
  "pass_source_url": "https://www.epicpass.com/regions.aspx",
  "pass_verified_date": "2026-05-04",
  "region": "East",
  "country_filter": "USA"
}

═══════════════════════════════════════════════════════════
PROCESS
═══════════════════════════════════════════════════════════

## Phase 1: Scrape All 4 Sources

1. Scrape Indy Pass → save raw data to indy_resorts.json
2. Scrape Epic Pass → save to epic_resorts.json
3. Scrape Ikon Pass → save to ikon_resorts.json
4. Scrape Mountain Collective → save to mc_resorts.json

Each file: complete list with all metadata

## Phase 2: Filter to USA Only

For Wynla MVP, focus on US resorts:
- Filter by country = "USA"
- Exclude Canada, Japan, Europe, etc.
- Keep them in database with "country" field for future expansion

US resort counts (estimated):
- Indy: ~150-180 US resorts
- Epic: ~40 US resorts
- Ikon: ~30 US resorts
- Mountain Collective: ~17 US resorts

## Phase 3: Merge & Deduplicate

Many resorts on multiple passes:
- Aspen Mountain: Ikon + Mountain Collective
- Sugarloaf: Mountain Collective + Indy
- Killington: Ikon

Merge logic:
1. Match by name (fuzzy match if needed)
2. Combine pass arrays
3. Use most complete data (prefer source with more stats)
4. Output: unified_resorts.json

## Phase 4: Compare with Current Database

For each resort in current DB:
- Find matching resort in unified_resorts.json
- Compare:
  - Pass affiliations
  - Stats (vertical, trails, lifts)
  - Status
- Output: comparison_report.json showing changes needed

## Phase 5: Apply Updates (with confirmation)

CRITICAL: Don't auto-apply. Show me the diff first.

For each resort with discrepancy:
- Print: "[Resort Name]"
- Print: "Current passes: [list]"
- Print: "Source-verified passes: [list]"
- Print: "Action: ADD/REMOVE/UPDATE"
- Wait for batch confirmation

User will confirm batches of 20-30 changes at a time.

## Phase 6: Add New Resorts

Resorts found in official sources but NOT in our database:
- Add to database as new entries
- Mark tier appropriately (will be Listed by default)
- Use name, location, pass info from source

Estimated new resorts to add: 50-100

═══════════════════════════════════════════════════════════
HERO IMAGES
═══════════════════════════════════════════════════════════

Bonus: Indy Pass / Epic / Ikon / MC pages have hero images per resort.
These are often resort-provided official photos.

For each resort scraped:
- Extract hero image URL from card or detail page
- Verify image loads (HEAD request)
- Store in hero_image_url column
- Source: "[pass_name] official website"

This gives us 250+ hero images for FREE!

═══════════════════════════════════════════════════════════
INDEPENDENT RESORTS
═══════════════════════════════════════════════════════════

For US resorts NOT on any major pass:
- Keep in database as "Independent" tier
- Source: existing Wikipedia/OSM data
- Mark as "Pass: Independent"
- Tier: Listed (not Featured unless Northeast)

These represent ~200 resorts not in pass websites.

═══════════════════════════════════════════════════════════
DELIVERABLES
═══════════════════════════════════════════════════════════

After completion:

1. Scraped data files:
   - indy_resorts.json
   - epic_resorts.json
   - ikon_resorts.json
   - mc_resorts.json
   - unified_resorts.json (merged)

2. Comparison report:
   - comparison_report.json
   - Shows diff between current DB and verified data
   - Sorted by impact (most changes first)

3. Update plan summary:
   - Total resorts to update: X
   - New resorts to add: X
   - Hero images obtained: X
   - Pass corrections: X

4. Quality metrics:
   - Pass verification rate: target 100% for resorts on passes
   - Hero image rate: target 90%+ for pass resorts
   - Data freshness: 2026-05-04

═══════════════════════════════════════════════════════════
TIMELINE
═══════════════════════════════════════════════════════════

- Scraping (4 sites with Playwright): 2-3 hours
- Filter/merge/dedup: 1 hour
- Comparison report: 30 min
- Apply updates (with confirmation): 1-2 hours
- New resorts to add: 1 hour
- Hero image verification: 30 min

Total: 6-8 hours focused work

═══════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════

1. Don't auto-apply changes - show diff first
2. Don't delete resorts - only update or add
3. Cache scraped HTML so we can re-process without re-scraping
4. Be respectful to source sites - delays between requests
5. If can't extract data reliably for a resort, flag for manual review
6. Source attribution in database: track which pass site provided data
7. Set last_verified_at timestamp for all updated resorts

═══════════════════════════════════════════════════════════
WHY THIS IS BETTER THAN PREVIOUS AUDIT
═══════════════════════════════════════════════════════════

Previous audit used Wikipedia → 116 discrepancies, many wrong
This approach uses OFFICIAL pass websites → 100% accurate by definition

If a resort is listed on indyskipass.com/our-resorts, it IS on Indy Pass.
If it's not listed there, it's NOT on Indy Pass.
This is ground truth.

═══════════════════════════════════════════════════════════
START
═══════════════════════════════════════════════════════════

เริ่ม Phase 1: scrape Indy Pass first (largest list, most structured data)
Show me sample of 10 scraped resorts before proceeding to other sites
This way we verify scraping quality before committing to all 4 sites

ขอบคุณ
```

---

## What to Expect from Claude Code

Claude Code will:
1. Start with Indy Pass scraping (largest list)
2. Show you sample of 10 resorts
3. You verify quality
4. Proceed to other sites
5. Merge & deduplicate
6. Generate comparison report
7. Show diff before applying
8. You batch-approve changes
9. Apply updates
10. Final report

**Estimated: 6-8 hours of Claude Code work**

---

## After This Is Done

Once data refresh is complete, you'll have:
- ✅ ~250-300 resorts with 100% verified pass info
- ✅ 250+ hero images from official sources
- ✅ Verified stats (vertical, trails, lifts, etc.)
- ✅ Foundation for Stage 4 (map polish + clustering + Alaska inset)

Then proceed to **Stage 4: Beautiful Map Experience** (see DEVELOPMENT_ROADMAP.md)
