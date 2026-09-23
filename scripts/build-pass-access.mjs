// Regenerates lib/data/passAccess.json from the verified handoff dataset
// (research + verification workflow, official pass sites only).
//
//   node scripts/build-pass-access.mjs [path/to/resort_pass_access.json]
//
// Default input: the 2026-09-23 handoff folder (see PASS_DATA_2026-09-23.md
// for how that file is produced and re-verified). The output is committed
// and imported by lib/passAccess.ts, so the app never reads the handoff
// folder at runtime.
//
// What this script does, and why each step exists:
//   * drops rows with no DB slug (roster resorts that have no resorts row
//     cannot be shown anywhere yet) and the cross-country-only product
//     rows (Indy XC Pass is a separate nordic product Wynla does not sell
//     or filter by; the alpine products at a nordic partner are kept so a
//     resort the DB tags "indy" never shows an empty pass section);
//   * normalises product names (one canonical name + stable key, with the
//     tier / age qualifier split out) so the UI can group and sort;
//   * parses the free-text days column into a small typed shape (kind +
//     count + short label) while keeping the raw text;
//   * parses blackout text into ISO date ranges for the 2026-27 season
//     where the text is unambiguous, keeps the raw text in every case, and
//     labels the unpublished ones (Indy 2026-27) as such instead of
//     pretending they are "none";
//   * sorts deterministically (slug, family order, product order) so the
//     diff of a regeneration is readable.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_INPUT =
  "C:/Users/saita/OneDrive/Pictures/Screenshots/ridewise-handoff/pass-data-2026-09-23/resort_pass_access.json";
const OUTPUT = resolve(HERE, "../lib/data/passAccess.json");

// Season the date parser resolves year-less tokens into. Jul-Dec belong to
// the first calendar year, Jan-Jun to the second. Bump when regenerating
// for a new season.
const SEASON = { label: "2026-27", firstYear: 2026, secondYear: 2027 };

// Vail Resorts' published 2026-27 peak dates (epicpass.com peak-restricted
// dates page, read 2026-09-23). Used only when a row says a bare "peak
// dates" without spelling them out; rows that list their own dates win.
const EPIC_PEAK_DATES_TEXT = "Nov 27-28, Dec 26-31 2026; Jan 16; Feb 13-14 2027";

const FAMILY_ORDER = ["mountain_collective", "ikon", "epic", "indy"];

// Canonical product names. Keys are matched against the raw product text
// after the qualifier (anything after " - " or in parentheses) is removed.
// Order inside a family = display order (flagship first, then regional).
const PRODUCTS = {
  epic: [
    ["Epic Pass", "epic-pass"],
    ["Epic Local Pass", "epic-local-pass"],
    ["Epic Day Pass", "epic-day-pass"],
    ["Epic Military Pass", "epic-military-pass"],
    ["Northeast Value Pass", "northeast-value-pass"],
    ["Northeast Midweek Pass", "northeast-midweek-pass"],
    ["Tahoe Local Pass", "tahoe-local-pass"],
    ["Tahoe Value Pass", "tahoe-value-pass"],
    ["Summit Value Pass", "summit-value-pass"],
    ["Keystone Plus Pass", "keystone-plus-pass"],
    ["Keystone Crested Butte 4-Pack", "keystone-crested-butte-4-pack"],
    ["Kirkwood Pass", "kirkwood-pass"],
    ["Stevens Pass Select Pass", "stevens-pass-select-pass"],
    ["Stevens Pass Premium Pass", "stevens-pass-premium-pass"],
    ["Park City Youth Pass", "park-city-youth-pass"],
    ["Ohio Pass", "ohio-pass"],
    ["Mt Brighton Pass", "mt-brighton-pass"],
    ["Afton Alps Pass", "afton-alps-pass"],
    ["Wilmot Pass", "wilmot-pass"],
    ["Hidden Valley Pass", "hidden-valley-pass"],
    ["Snow Creek Pass", "snow-creek-pass"],
    ["Paoli Peaks Pass", "paoli-peaks-pass"],
  ],
  ikon: [
    ["Ikon Pass", "ikon-pass"],
    ["Ikon Base Pass", "ikon-base-pass"],
    ["Ikon Session Pass", "ikon-session-pass"],
  ],
  indy: [
    ["Indy Base Pass", "indy-base-pass"],
    ["Indy+ Pass", "indy-plus-pass"],
    ["Indy Base Add-On Pass", "indy-base-add-on-pass"],
    ["Indy+ Add-On Pass", "indy-plus-add-on-pass"],
  ],
  mountain_collective: [["Mountain Collective Pass", "mountain-collective-pass"]],
};

// Raw spellings that differ from the canonical name.
const PRODUCT_ALIASES = {
  "Indy Base AddOn Pass": "Indy Base Add-On Pass",
  "Indy+ AddOn Pass": "Indy+ Add-On Pass",
};

const DROPPED_PRODUCTS = new Set(["Indy XC Pass"]);

// Day allotments shared across several DB rows (one destination split into
// several resorts rows). Text is what the resort page prints.
const GROUP_LABELS = {
  "aspen-snowmass": "Aspen Mountain, Aspen Highlands, Buttermilk and Snowmass",
  "palisades-tahoe": "Palisades Tahoe and Alpine Meadows",
  "big-bear": "Bear Mountain and Snow Summit",
  "killington-pico": "Killington and Pico",
};

// Products whose allotment is shared across resorts that are NOT grouped by
// group_id in the source (the sharing is in the product itself).
const PRODUCT_SHARED_LABELS = {
  "keystone-crested-butte-4-pack": "Keystone and Crested Butte",
};

// Per-family facts the UI prints once above the product rows. The Indy note
// matters most: Indy's 2026-27 blackout list is not published (fall 2026),
// so a resort with no blackout badge on its Indy page is "none listed", not
// a promise.
const FAMILIES = {
  mountain_collective: {
    officialUrl: "https://mountaincollective.com/resorts/",
    note: "2 days per destination, then 50% off extra days. No blackout dates on the pass itself.",
  },
  ikon: {
    officialUrl: "https://www.ikonpass.com/en/destinations",
    note: "Ikon Base Pass and Ikon Session Pass blackouts are Dec 26-30, 2026, Jan 16-17, 2027 and Feb 13-14, 2027 wherever they apply. Bonus mountains give 2 days on the full Ikon Pass only.",
  },
  epic: {
    officialUrl: "https://www.epicpass.com/passes/epic-pass.aspx",
    note: "Epic peak dates for 2026-27 are Nov 27-28 and Dec 26-31, 2026, Jan 16 and Feb 13-14, 2027 unless a product lists its own.",
  },
  indy: {
    officialUrl: "https://www.indyskipass.com/our-resorts",
    note: "Indy publishes each resort's 2026-27 blackout dates in fall 2026. Rows marked no blackout dates reflect the resort's Indy page on the verified date. Indy+ passes have no blackouts anywhere.",
  },
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// ---------------------------------------------------------------------------
// Product names
// ---------------------------------------------------------------------------

export function normaliseProduct(family, raw) {
  let text = PRODUCT_ALIASES[raw] ?? raw;
  let qualifier = null;
  // "Epic Day Pass - All / 32 / 22 Resorts tiers" → name + tier qualifier.
  const dash = text.indexOf(" - ");
  if (dash > 0) {
    qualifier = text.slice(dash + 3).trim();
    text = text.slice(0, dash).trim();
  }
  // "Park City Youth Pass (child 5-12)" → name + age qualifier.
  const paren = text.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  if (paren) {
    text = paren[1].trim();
    qualifier = qualifier ? `${paren[2].trim()} · ${qualifier}` : paren[2].trim();
  }
  const list = PRODUCTS[family] ?? [];
  const hit = list.find(([name]) => name === text);
  if (!hit) {
    throw new Error(`Unknown ${family} product "${raw}" — add it to PRODUCTS in build-pass-access.mjs`);
  }
  return { product: hit[0], productKey: hit[1], qualifier: tidyQualifier(qualifier) };
}

function tidyQualifier(q) {
  if (!q) return null;
  return q
    .replace(/ALL RESORTS/g, "All Resorts")
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// Days
// ---------------------------------------------------------------------------

export function parseDays(raw, ctx = {}) {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const base = { text };

  if (lower === "not included" || lower === "none") {
    return { ...base, kind: "none", short: "not included" };
  }
  if (lower.startsWith("discount only")) {
    const what = /heli/.test(lower) ? "heli-ski discount only" : "ticket discount only";
    return { ...base, kind: "discount", short: what, qualifier: /allied/.test(lower) ? "Allied partner: discounted tickets, no free days" : null };
  }
  if (lower.startsWith("unlimited")) {
    let short = "unlimited";
    let qualifier = null;
    if (/off-peak/.test(lower)) {
      short = "unlimited off-peak";
      qualifier = "day access 9am-3pm";
    } else if (/from apr 1, 2027/.test(lower)) {
      short = "unlimited from Apr 1, 2027";
      qualifier = "spring access only";
    }
    return { ...base, kind: "unlimited", short, qualifier };
  }
  if (lower.startsWith("weekday access")) {
    return {
      ...base,
      kind: "weekdays",
      short: "weekdays",
      qualifier: /excluding peak/.test(lower) ? "Monday to Friday, not on peak dates" : "Monday to Friday, including peak dates",
    };
  }
  if (lower === "6 days/week") {
    return { ...base, kind: "unlimited", short: "unlimited except Saturdays", qualifier: null };
  }
  // "2/3/4" (Session pass, as purchased) and "1-7" / "up to 4-7 (…)".
  const slash = text.match(/^(\d+)\/(\d+)\/(\d+)$/);
  if (slash) {
    return { ...base, kind: "range", min: +slash[1], max: +slash[3], short: `${slash[1]}-${slash[3]} days`, qualifier: "as purchased" };
  }
  const range = text.match(/^(?:up to )?(\d+)-(\d+)\s*(?:\((.*)\))?$/);
  if (range) {
    const q = range[3] ? range[3].replace(/^\+\s*/, "plus ").replace(/^from /, "from ") : null;
    return { ...base, kind: "range", min: +range[1], max: +range[2], short: `${range[1]}-${range[2]} days`, qualifier: q ? tidyQualifier(q) : "as purchased" };
  }
  const count = text.match(/^(\d+)\b(.*)$/);
  if (count) {
    const n = +count[1];
    const rest = count[2].trim();
    let qualifier = null;
    if (/xc trail/i.test(rest)) qualifier = "cross-country trail days";
    else if (/home resort/i.test(rest)) qualifier = "not valid at your home resort";
    else if (/bonus mountain/i.test(rest)) qualifier = "full Ikon Pass only";
    else if (/total weekdays/i.test(rest)) qualifier = "weekdays only";
    else if (/^combined/i.test(rest)) {
      const inside = rest.match(/\((.*)\)/);
      qualifier = inside
        ? `shared across ${inside[1].replace(/\s*\+\s*/g, ", ").replace(/, ([^,]*)$/, " and $1")}`
        : ctx.groupLabel
          ? `shared across ${ctx.groupLabel}`
          : "shared across the listed resorts";
    } else if (rest) qualifier = tidyQualifier(rest.replace(/^[()]|[()]$/g, ""));
    if (!qualifier && ctx.groupLabel) qualifier = `shared across ${ctx.groupLabel}`;
    if ((!qualifier || qualifier === "shared across the listed resorts") && ctx.productSharedLabel) {
      qualifier = `shared across ${ctx.productSharedLabel}`;
    }
    return { ...base, kind: "limited", count: n, short: `${n} ${n === 1 ? "day" : "days"}`, qualifier };
  }
  return { ...base, kind: "other", short: text, qualifier: null };
}

// ---------------------------------------------------------------------------
// Blackouts
// ---------------------------------------------------------------------------

/** Parse "Dec 26-30 2026, Jan 16-17 2027" style text into [start, end] ISO
 *  pairs. Only the first sentence is read (the Stevens Pass text goes on
 *  to describe night-skiing exceptions that are not day blackouts). A
 *  token with no year is placed in the season by month. */
export function parseDateRanges(text, season = SEASON) {
  const firstSentence = text.split(/\.\s+(?=[A-Z])/)[0];
  const cleaned = firstSentence.replace(/\([^)]*\)/g, " ");
  const pieces = cleaned.split(/[,;]|\s\+\s/);
  const ranges = [];
  let month = null; // 0-based month carried across bare "12-13" tokens
  const MON = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
  const crossMonth = new RegExp(
    `\\b${MON}\\s+(\\d{1,2})(?:\\s+(\\d{4}))?\\s*(?:-|–|to)\\s*${MON}\\s+(\\d{1,2})(?:\\s+(\\d{4}))?`,
    "i",
  );
  const led = new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:\\s*-\\s*(\\d{1,2}))?(?:\\s+(\\d{4}))?`, "i");
  // Indy's own sheets write "12/27/2025-01/03/2026" or "01/16/2026".
  const numeric = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?:\s*-\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?)?/;
  for (const piece of pieces) {
    const p = piece.trim();
    if (!p) continue;
    const cm = p.match(crossMonth);
    if (cm) {
      // "Dec 20 2026 - Jan 4 2027" (or without years): one range across a
      // month boundary, possibly across New Year.
      const m1 = MONTHS.indexOf(cm[1].slice(0, 3).toLowerCase());
      const m2 = MONTHS.indexOf(cm[4].slice(0, 3).toLowerCase());
      const y1 = cm[3] ? +cm[3] : seasonYear(m1, season);
      const y2 = cm[6] ? +cm[6] : seasonYear(m2, season);
      const start = iso(y1, m1, +cm[2]);
      const end = iso(y2, m2, +cm[5]);
      if (end >= start) ranges.push([start, end]);
      month = m2;
      continue;
    }
    const num = p.match(numeric);
    if (num) {
      const m1 = +num[1] - 1;
      const y1 = num[3] ? +num[3] : seasonYear(m1, season);
      const start = iso(y1, m1, +num[2]);
      let end = start;
      if (num[4]) {
        const m2 = +num[4] - 1;
        const y2 = num[6] ? +num[6] : seasonYear(m2, season);
        end = iso(y2, m2, +num[5]);
      }
      if (end >= start) ranges.push([start, end]);
      month = null;
      continue;
    }
    const l = p.match(led);
    let day1;
    let day2;
    let year;
    if (l) {
      month = MONTHS.indexOf(l[1].slice(0, 3).toLowerCase());
      day1 = +l[2];
      day2 = l[3] ? +l[3] : day1;
      year = l[4] ? +l[4] : null;
    } else {
      const bare = p.match(/^(\d{1,2})(?:\s*-\s*(\d{1,2}))?(?:\s+(\d{4}))?$/);
      if (!bare || month === null) continue;
      day1 = +bare[1];
      day2 = bare[2] ? +bare[2] : day1;
      year = bare[3] ? +bare[3] : null;
    }
    if (year === null) year = seasonYear(month, season);
    if (day2 < day1) continue;
    ranges.push([iso(year, month, day1), iso(year, month, day2)]);
  }
  return dedupe(ranges).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

function seasonYear(month, season) {
  return month >= 6 ? season.firstYear : season.secondYear;
}

function iso(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function dedupe(ranges) {
  const seen = new Set();
  return ranges.filter((r) => {
    const k = r.join("/");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function weekdaysIn(text) {
  const lower = text.toLowerCase();
  const days = [];
  if (/saturdays?/.test(lower) || /weekends?/.test(lower)) days.push(6);
  if (/sundays?/.test(lower) || /weekends?/.test(lower)) days.push(0);
  return days;
}

// Indy's 25/26 reference codes → plain English for the "last season" hint.
const INDY_REF = [
  [/xmas partial/i, "part of Christmas week"],
  [/xmas/i, "Christmas week"],
  [/mlk partial/i, "part of MLK weekend"],
  [/mlk/i, "MLK weekend"],
  [/pres partial/i, "part of Presidents' Day weekend"],
  [/pres/i, "Presidents' Day weekend"],
  [/peaksat partial/i, "some peak-season Saturdays"],
  [/peaksat/i, "peak-season Saturdays"],
  [/peaksun partial/i, "some peak-season Sundays"],
  [/peaksun/i, "peak-season Sundays"],
  [/additional/i, "extra resort-specific dates"],
];

function lastSeasonReference(text) {
  const m = text.match(/25\/26 ref:\s*(.*)$/);
  if (!m) return null;
  const parts = m[1].split(";").map((s) => s.trim()).filter(Boolean);
  const out = [];
  for (const part of parts) {
    const hit = INDY_REF.find(([re]) => re.test(part));
    if (hit && !out.includes(hit[1])) out.push(hit[1]);
  }
  return out.length ? out.join(", ") : null;
}

export function parseBlackouts(raw, days) {
  const text = raw.trim();
  const lower = text.toLowerCase();
  const base = { text, ranges: [], weekdays: [], rangesSource: null, lastSeason: null };

  if (days.kind === "none" || days.kind === "discount") {
    return { ...base, status: "not_applicable" };
  }
  if (/^26\/27 dates tba/.test(lower) || /^tbd/.test(lower)) {
    return { ...base, status: "unpublished", lastSeason: lastSeasonReference(text) };
  }
  if (lower === "n/a" || lower.startsWith("n/a (") || lower.startsWith("none")) {
    return { ...base, status: "none" };
  }
  if (/^peak dates if 'no peak' option chosen$/.test(lower)) {
    return { ...base, status: "conditional", ranges: parseDateRanges(EPIC_PEAK_DATES_TEXT), rangesSource: "epic-peak-list" };
  }
  let ranges = parseDateRanges(text);
  let rangesSource = ranges.length ? "explicit" : null;
  if (!ranges.length && /peak dates/.test(lower)) {
    ranges = parseDateRanges(EPIC_PEAK_DATES_TEXT);
    rangesSource = "epic-peak-list";
  }
  const weekdays = weekdaysIn(text);
  if (!ranges.length && !weekdays.length) {
    return { ...base, status: "unknown" };
  }
  return { ...base, status: weekdays.length && !ranges.length ? "weekdays" : "dates", ranges, weekdays, rangesSource };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/** Build the output object from handoff rows. Exported so the unit tests
 *  can run the whole pipeline on a handful of synthetic rows. */
export function buildPassAccess(rows, verifiedOn) {
  const bySlug = new Map();
  const dropped = { noSlug: 0, xcProduct: 0 };

  for (const r of rows) {
    if (!r.slug) {
      dropped.noSlug += 1;
      continue;
    }
    if (DROPPED_PRODUCTS.has(r.product)) {
      dropped.xcProduct += 1;
      continue;
    }
    const groupLabel = r.group_id ? GROUP_LABELS[r.group_id] ?? null : null;
    const { product, productKey, qualifier } = normaliseProduct(r.pass_family, r.product);
    const days = parseDays(r.days, {
      groupLabel,
      productSharedLabel: PRODUCT_SHARED_LABELS[productKey] ?? null,
    });
    const blackouts = parseBlackouts(r.blackout_dates, days);
    const entry = {
      product,
      productKey,
      qualifier,
      days,
      blackouts,
      reservationRequired: Boolean(r.reservation_required),
      isBonusMountain: Boolean(r.bonus_mountain),
      sharedWith: groupLabel,
      newFor2026_27: Boolean(r.new_for_2026_27),
      // Verifier notes stay in the handoff JSON only: they mix visitor-facing
      // facts with research commentary ("DB MISMATCH", "unverified"), and this
      // file is bundled into a client chunk for the map panel.
      sourceUrls: String(r.source_url)
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean),
      verifiedOn: r.verified_on,
    };
    const families = bySlug.get(r.slug) ?? {};
    (families[r.pass_family] ??= []).push(entry);
    bySlug.set(r.slug, families);
}

// Sort: slug, family order, product order, then qualifier for stability.
const resorts = {};
for (const slug of [...bySlug.keys()].sort()) {
  const families = bySlug.get(slug);
  const sorted = {};
  for (const family of FAMILY_ORDER) {
    const list = families[family];
    if (!list) continue;
    const order = PRODUCTS[family].map(([, key]) => key);
    list.sort((a, b) => {
      const d = order.indexOf(a.productKey) - order.indexOf(b.productKey);
      if (d !== 0) return d;
      return (a.qualifier ?? "").localeCompare(b.qualifier ?? "");
    });
    sorted[family] = list;
  }
  resorts[slug] = sorted;
}

const stats = {};
for (const family of FAMILY_ORDER) {
  const slugs = Object.values(resorts).filter((f) => f[family]).length;
  const rowsN = Object.values(resorts).reduce((n, f) => n + (f[family]?.length ?? 0), 0);
  stats[family] = { resorts: slugs, rows: rowsN };
}
const statusCounts = {};
for (const f of Object.values(resorts)) {
  for (const list of Object.values(f)) {
    for (const e of list) statusCounts[e.blackouts.status] = (statusCounts[e.blackouts.status] ?? 0) + 1;
  }
}

const output = {
  season: SEASON.label,
  verifiedOn: verifiedOn ?? rows[0]?.verified_on ?? null,
  generatedBy: "scripts/build-pass-access.mjs",
  families: FAMILIES,
  resorts,
};
return { output, dropped, stats, statusCounts };
}

function main() {
  const inputPath = process.argv[2] ?? DEFAULT_INPUT;
  const input = JSON.parse(readFileSync(inputPath, "utf8"));
  const rows = input.rows ?? input;
  const { output, dropped, stats, statusCounts } = buildPassAccess(rows, input.verified_on ?? null);

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, JSON.stringify(output, null, 1) + "\n");

  console.log(`Wrote ${OUTPUT}`);
  console.log(`Input rows: ${rows.length}; dropped ${dropped.noSlug} without a DB slug, ${dropped.xcProduct} Indy XC Pass rows`);
  console.log("Per family:", stats);
  console.log("Blackout status counts:", statusCounts);
}

// Only run when executed as a script; the unit tests import the parsers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
