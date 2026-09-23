// Step 6 — 2026-27 season dates for off-season mode.
//
// Why: the resort page hero and the map's ResortPanel show a countdown
// ("Opens in N days · Nov 20") parsed from season_open_text /
// season_close_text (lib/seasonDates.ts), and the About card shows
// typical_season_start / typical_season_end. Before this step only 14
// of 425 rows had an open text and 18 had typical dates, so almost every
// page said "Season info coming" all summer.
//
// Sources, in precedence order (every row's source URL is in the report):
//   1. OFFICIAL — operator announcements checked on 2026-09-23 (Vail
//      Resorts press release, Aspen Snowmass season page).
//   2. OnTheSnow resort page "Projected Opening" / "Projected Closing"
//      (cache from 00-fetch-onthesnow.mjs; fetched one page per resort).
//   3. OnTheSnow state table "Projected opening date" (opening only).
// Closing text comes only from sources 1-2; typical_season_end falls back
// to last season's actual close (season_end_date) when nothing else exists.
//
// Formats written:
//   season_open_text   "November 20, 2026"  (exact, parses to a countdown)
//   season_close_text  "April 12, 2027"
//   typical_season_start / _end  "Late November" / "Mid-April" — evergreen
//   text for the About card; existing curated values are kept.
//
//   node scripts/backfill-2026-09-23/06-season-dates.mjs [--apply]

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { select, run, writeReport, appliedChangesTable, appliedRows, appliedRunsLine, REPORT_DIR } from "./_lib.mjs";

const STEP = "06-season-dates";
const CACHE = path.join(REPORT_DIR, "onthesnow-cache.json");
if (!existsSync(CACHE)) throw new Error("run 00-fetch-onthesnow.mjs first");
const cache = JSON.parse(readFileSync(CACHE, "utf8"));
const PASS = /^(epic|ikon|indy|mountain_collective)$/;

// Operator announcements. open/close are "M/D" for the 2026-27 season.
const VAIL = "https://snowbrains.com/vail-resorts-announces-2026-27-opening-dates-for-11-resorts/ (Vail Resorts release, 2026-08-18)";
const IKON = "https://snowbrains.com/ikon-pass-resorts-opening-dates-2026-27/ (Ikon Pass announcement, 2026-09)";
const ASPEN = "https://www.aspensnowmass.com/four-mountains/aspen-mountain (season Nov 26, 2026 - Apr 18, 2027)";
const ikon = (open) => ({ open, source: IKON });
const OFFICIAL = {
  // Vail Resorts, 2026-08-18 release (Keystone: "as soon as possible in October" — no date)
  breckenridge: { open: "11/6", source: VAIL },
  vail: { open: "11/13", source: VAIL },
  "beaver-creek": { open: "11/25", source: VAIL },
  "crested-butte": { open: "11/25", source: VAIL },
  "park-city": { open: "11/20", source: VAIL },
  "heavenly-mountain-resort": { open: "11/20", source: VAIL },
  "northstar-california": { open: "11/20", source: VAIL },
  "kirkwood-mountain-resort": { open: "12/4", source: VAIL },
  "stevens-pass": { open: "12/4", source: VAIL },
  // Aspen Snowmass season page (Aspen Mountain)
  "aspen-mountain": { open: "11/26", close: "4/18", source: ASPEN },
  // Ikon Pass 2026-27 opening-date announcement (US resorts)
  "copper-mountain": ikon("11/6"),
  "mammoth-mountain": ikon("11/13"),
  eldora: ikon("11/13"),
  "sunday-river": ikon("11/15"),
  "stratton-mountain": ikon("11/18"),
  solitude: ikon("11/20"),
  alta: ikon("11/20"),
  sugarloaf: ikon("11/20"),
  steamboat: ikon("11/21"),
  sugarbush: ikon("11/21"),
  "granite-peak": ikon("11/21"),
  snowriver: ikon("11/21"),
  "lutsen-mountains": ikon("11/21"),
  "palisades-tahoe": ikon("11/25"),
  "snowshoe-mountain": ikon("11/25"),
  "big-sky": ikon("11/25"),
  snowmass: ikon("11/26"),
  "sun-valley": ikon("11/26"),
  "taos-ski-valley": ikon("11/26"),
  "crystal-mountain": ikon("11/27"),
  schweitzer: ikon("11/27"),
  "jackson-hole": ikon("11/27"),
  snowbasin: ikon("11/27"),
  snowbird: ikon("11/27"),
  "alyeska-resort": ikon("11/28"),
  "mt-bachelor": ikon("12/4"),
  "deer-valley": ikon("12/5"),
  "the-highlands": ikon("12/11"),
  "pico-mountain": ikon("12/11"),
  "aspen-highlands": ikon("12/12"),
  buttermilk: ikon("12/12"),
  "june-mountain": ikon("12/19"),
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MON3 = Object.fromEntries(MONTHS.map((m, i) => [m.slice(0, 3).toLowerCase(), i]));

/** "Nov 20" | "11/20" | "November 20" -> { month: 0-11, day } or null. */
function parseMD(s) {
  if (!s) return null;
  const t = String(s).trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) return { month: Number(m[1]) - 1, day: Number(m[2]) };
  m = t.match(/^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})$/);
  if (m && MON3[m[1].toLowerCase()] != null) return { month: MON3[m[1].toLowerCase()], day: Number(m[2]) };
  return null;
}

// A ski season straddles the year: Jul-Dec belongs to 2026, Jan-Jun to 2027.
const yearFor = (month) => (month >= 6 ? 2026 : 2027);
// Plausibility: a US resort opens Sep-Jan and closes Feb-Jul. Anything
// else (OnTheSnow lists a March "opening" for one Idaho hill) is noise.
const plausibleOpen = (d) => d && (d.month >= 8 || d.month === 0);
const plausibleClose = (d) => d && d.month >= 1 && d.month <= 6;
const exactText = ({ month, day }) => `${MONTHS[month]} ${day}, ${yearFor(month)}`;
// Same style as the curated values already on the table ("Mid-November").
const typicalText = ({ month, day }) => (day <= 10 ? `Early ${MONTHS[month]}` : day <= 20 ? `Mid-${MONTHS[month]}` : `Late ${MONTHS[month]}`);
const typicalFromIso = (iso) => {
  const m = String(iso ?? "").match(/^\d{4}-(\d{2})-(\d{2})/);
  return m ? typicalText({ month: Number(m[1]) - 1, day: Number(m[2]) }) : null;
};

const rows = await select(
  "resorts",
  "select=id,slug,name,state,passes,tier,operating_status,typical_season_start,typical_season_end,season_open_text,season_close_text,season_end_date&active=eq.true&order=id.asc",
);

const changes = [];
const noSource = [];
// What this step has already written, by id. `firstApplied` holds the
// values from before the step ever touched a row (closed-row undo, the
// "before" coverage column); `lastApplied` holds what the row ended up
// with (the "after" column).
const firstApplied = {};
const lastApplied = {};
for (const r of appliedRows(STEP)) {
  firstApplied[r.id] ??= r;
  lastApplied[r.id] = r;
}
for (const r of rows) {
  // A permanently closed area must not advertise an opening date, even
  // if OnTheSnow still lists a projection for it. Put back whatever the
  // row had before this step touched it.
  if (r.operating_status === "closed") {
    const prev = firstApplied[r.id]?.before;
    if (prev) {
      const undo = Object.fromEntries(Object.entries(prev).filter(([k, v]) => r[k] !== v));
      if (Object.keys(undo).length) changes.push({ id: r.id, slug: r.slug, before: r, patch: undo, source: "closed resort — restored pre-step values" });
    }
    continue;
  }
  let open = null;
  let close = null;
  const used = new Set();
  const official = OFFICIAL[r.slug];
  const page = cache.resorts[r.slug];
  const stateRow = (cache.states[r.state]?.rows ?? []).find((x) => page?.url && page.url.endsWith(x.path));

  if (official) {
    open = parseMD(official.open);
    close = parseMD(official.close);
    used.add(official.source);
  }
  if (page?.status === 200) {
    const pageOpen = parseMD(page.projected_open);
    const pageClose = parseMD(page.projected_close);
    if (!open && pageOpen) {
      open = pageOpen;
      used.add(page.url);
    }
    if (!close && pageClose) {
      close = pageClose;
      used.add(page.url);
    }
  }
  if (!open && stateRow && parseMD(stateRow.projected_open)) {
    open = parseMD(stateRow.projected_open);
    used.add(cache.states[r.state].url);
  }
  if (!plausibleOpen(open)) open = null;
  if (!plausibleClose(close)) close = null;
  const source = [...used].join(" + ");
  if (!open && !close) {
    noSource.push(`${r.slug} (${r.state}, ${(r.passes || []).join("/")})`);
    continue;
  }

  const patch = {};
  if (open) {
    patch.season_open_text = exactText(open);
    if (!r.typical_season_start) patch.typical_season_start = typicalText(open);
  }
  if (close) {
    patch.season_close_text = exactText(close);
    if (!r.typical_season_end) patch.typical_season_end = typicalText(close);
  } else if (!r.typical_season_end && typicalFromIso(r.season_end_date)) {
    patch.typical_season_end = typicalFromIso(r.season_end_date);
  }
  const diff = Object.fromEntries(Object.entries(patch).filter(([k, v]) => r[k] !== v));
  if (Object.keys(diff).length) changes.push({ id: r.id, slug: r.slug, before: r, patch: diff, source });
}

const result = await run(STEP, "resorts", changes, [
  "season_open_text",
  "season_close_text",
  "typical_season_start",
  "typical_season_end",
]);
const pending = result.applied ? [] : changes;
const all = [...appliedRows(STEP), ...pending];

// Coverage before/after, for pass resorts and for everything active. On
// an apply run "before" is reconstructed from the backup so the report
// keeps showing the real starting point.
const beforeRows = rows.map((r) => ({ ...r, ...(firstApplied[r.id]?.before ?? {}) }));
const after = rows.map((r) => ({
  ...r,
  ...(lastApplied[r.id]?.after ?? {}),
  ...(pending.find((c) => c.id === r.id)?.patch ?? {}),
}));
const cov = (list) => ({
  open: list.filter((r) => r.season_open_text).length,
  close: list.filter((r) => r.season_close_text).length,
  typical: list.filter((r) => r.typical_season_start && r.typical_season_end).length,
  n: list.length,
});
const isPass = (r) => (r.passes || []).some((p) => PASS.test(p));
const b = { pass: cov(beforeRows.filter(isPass)), all: cov(beforeRows) };
const a = { pass: cov(after.filter(isPass)), all: cov(after) };
const srcCount = (re) => all.filter((c) => re.test(c.source ?? "")).length;

writeReport(
  STEP,
  `# Step 6 — 2026-27 season dates

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}
Coverage "before" is the state before this step ever wrote; "after" includes everything applied plus what this run still proposes.

| coverage | before | after |
|---|---|---|
| pass resorts (Epic/Ikon/Indy/MC) with season_open_text | ${b.pass.open} / ${b.pass.n} | ${a.pass.open} / ${a.pass.n} |
| pass resorts with season_close_text | ${b.pass.close} / ${b.pass.n} | ${a.pass.close} / ${a.pass.n} |
| pass resorts with typical start + end | ${b.pass.typical} / ${b.pass.n} | ${a.pass.typical} / ${a.pass.n} |
| all active with season_open_text | ${b.all.open} / ${b.all.n} | ${a.all.open} / ${a.all.n} |
| all active with season_close_text | ${b.all.close} / ${b.all.n} | ${a.all.close} / ${a.all.n} |
| all active with typical start + end | ${b.all.typical} / ${b.all.n} | ${a.all.typical} / ${a.all.n} |

| source | rows |
|---|---|
| operator announcement (Vail Resorts release / Aspen Snowmass) | ${srcCount(/^https:\/\/(snowbrains|www\.aspensnowmass)/)} |
| OnTheSnow resort page (open + close) | ${srcCount(/onthesnow\.com\/[a-z-]+\/[a-z0-9-]+\/ski-resort/)} |
| OnTheSnow state table (open only) | ${srcCount(/projected-openings$/)} |
| rows updated (all applied runs) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |

Dates on OnTheSnow are the resorts' projected dates and remain subject to snow; the countdown copy says "Opens in N days" against that date.

## No source found (${noSource.length})
${noSource.length ? noSource.map((s) => `- ${s}`).join("\n") : "- none"}

## Changes (with source)
${appliedChangesTable(STEP, pending)}
`,
);
