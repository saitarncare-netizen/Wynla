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
//   1. ANNOUNCED — operator announcements checked on 2026-09-23 (Vail
//      Resorts release, Ikon Pass list, Aspen Snowmass season page).
//      Written as "November 13, 2026" and allowed to replace whatever
//      text the row had.
//   2. PROJECTED — OnTheSnow resort page "Projected Opening" / "Projected
//      Closing" (cache from 00-fetch-onthesnow.mjs, one page per resort),
//      then the OnTheSnow state table (opening only). Written as
//      "December 4, 2026 (projected)" and ONLY where the row had no text
//      of its own: a curated "Thanksgiving" or "late November" is the
//      operator's typical pattern and beats a third-party guess. The
//      "(projected)" qualifier makes lib/seasonDates.ts set
//      openProjected / closeProjected so the countdown says "Projected to
//      open in N days" instead of presenting the guess as an announcement.
// The first applied run had overwritten 23 curated texts with projections;
// this version puts them back (it re-derives every row from the values in
// the first backup and writes only what differs from the live row).
//
// Also written: typical_season_start / _end ("Late November" /
// "Mid-April") only where NULL, from whichever date was found; closing
// falls back to last season's actual close (season_end_date).
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
const ANNOUNCED = {
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
// lib/seasonDates.ts can only parse a text that names a month; a curated
// "Thanksgiving" is kept but yields no date, and a row whose opening
// cannot be parsed must not get a closing text alone (the parser would
// read a lone future close as "open until").
const NAMES_A_MONTH = new RegExp(`\\b(${MONTHS.map((m) => m.slice(0, 3)).join("|")})[a-z]*\\b`, "i");

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
const projectedText = (d) => `${exactText(d)} (projected)`;
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
// The values each row had before this step ever touched it (first
// applied backup) — the base every run re-derives from.
const firstApplied = {};
const lastApplied = {};
for (const r of appliedRows(STEP)) {
  firstApplied[r.id] ??= r;
  lastApplied[r.id] = r;
}
const classCount = { announced: 0, projected: 0, "curated text kept": 0 };
for (const r of rows) {
  const orig = { ...r, ...(firstApplied[r.id]?.before ?? {}) };
  const target = {
    season_open_text: orig.season_open_text,
    season_close_text: orig.season_close_text,
    typical_season_start: orig.typical_season_start,
    typical_season_end: orig.typical_season_end,
  };
  let source = "closed resort — pre-step values kept";
  // A permanently closed area must not advertise an opening date, even
  // if OnTheSnow still lists a projection for it. (Rows closed for good
  // are active=false since step 4; this guards any future one.)
  if (r.operating_status !== "closed") {
    const used = new Set();
    let open = null;
    let close = null;
    let openIsProjected = false;
    let closeIsProjected = false;
    const announced = ANNOUNCED[r.slug];
    const page = cache.resorts[r.slug];
    const stateRow = (cache.states[r.state]?.rows ?? []).find((x) => page?.url && page.url.endsWith(x.path));

    if (announced) {
      open = parseMD(announced.open);
      close = parseMD(announced.close);
      used.add(announced.source);
    }
    if (page?.status === 200) {
      const pageOpen = parseMD(page.projected_open);
      const pageClose = parseMD(page.projected_close);
      if (!open && pageOpen) {
        open = pageOpen;
        openIsProjected = true;
        used.add(page.url);
      }
      if (!close && pageClose) {
        close = pageClose;
        closeIsProjected = true;
        used.add(page.url);
      }
    }
    if (!open && stateRow && parseMD(stateRow.projected_open)) {
      open = parseMD(stateRow.projected_open);
      openIsProjected = true;
      used.add(cache.states[r.state].url);
    }
    if (!plausibleOpen(open)) open = null;
    if (!plausibleClose(close)) close = null;
    if (!open && !close) {
      noSource.push(`${r.slug} (${r.state}, ${(r.passes || []).join("/")})`);
      continue;
    }

    // Opening text: an announcement replaces anything; a projection only
    // fills a blank.
    if (open && !openIsProjected) target.season_open_text = exactText(open);
    else if (open && !orig.season_open_text) target.season_open_text = projectedText(open);
    // Closing text: same rule, plus never a lone close next to an
    // unparseable opening text.
    const openParses = !target.season_open_text || NAMES_A_MONTH.test(target.season_open_text);
    if (close && !closeIsProjected) target.season_close_text = exactText(close);
    else if (close && !orig.season_close_text && openParses) target.season_close_text = projectedText(close);

    if (open && !orig.typical_season_start) target.typical_season_start = typicalText(open);
    if (!orig.typical_season_end) {
      if (close) target.typical_season_end = typicalText(close);
      else if (typicalFromIso(orig.season_end_date)) target.typical_season_end = typicalFromIso(orig.season_end_date);
    }

    const cls = open && !openIsProjected ? "announced" : target.season_open_text === orig.season_open_text && orig.season_open_text ? "curated text kept" : "projected";
    classCount[cls] += 1;
    source = `${cls}: ${[...used].join(" + ")}`;
  }

  const patch = Object.fromEntries(Object.entries(target).filter(([k, v]) => r[k] !== v));
  if (Object.keys(patch).length) changes.push({ id: r.id, slug: r.slug, before: r, patch, source });
}

const result = await run(STEP, "resorts", changes, [
  "season_open_text",
  "season_close_text",
  "typical_season_start",
  "typical_season_end",
]);
const pending = result.applied ? [] : changes;

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
const projectedNow = after.filter((r) => /\(projected\)/.test(r.season_open_text ?? "")).length;
const announcedNow = after.filter((r) => r.season_open_text && !/\(projected\)/.test(r.season_open_text) && ANNOUNCED[r.slug]).length;
const curatedNow = after.filter((r) => r.season_open_text && !/\(projected\)/.test(r.season_open_text) && !ANNOUNCED[r.slug]).length;

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

| season_open_text after this step, by source class | rows |
|---|---|
| announced by the operator (Vail Resorts release / Ikon Pass list / Aspen Snowmass), written as "November 13, 2026" | ${announcedNow} |
| projected by OnTheSnow, written as "December 4, 2026 (projected)" — countdown says "Projected to open in N days" | ${projectedNow} |
| curated text the row already had, kept as is ("late November", "Thanksgiving", ...) | ${curatedNow} |

| this run's proposals by class | rows |
|---|---|
| announced | ${classCount.announced} |
| projected | ${classCount.projected} |
| curated text kept (only typical_* or close filled) | ${classCount["curated text kept"]} |
| rows updated (all applied runs, a row rewritten by a later run counts again) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |

The first applied run (05-10-17) had overwritten 23 curated texts with projections and written projections without a qualifier; the third run restores those texts and rewrites every projected date with the "(projected)" qualifier. Projections remain subject to snow; a light re-run in late October picks up date changes before opening day.

## No source found (${noSource.length})
${noSource.length ? noSource.map((s) => `- ${s}`).join("\n") : "- none"}

## Changes (with source)
${appliedChangesTable(STEP, pending)}
`,
);
