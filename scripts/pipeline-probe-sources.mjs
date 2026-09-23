#!/usr/bin/env node
// Probe every upstream source the data pipeline depends on and print a
// one-line status for each. Useful when /api/health says "stale" and you
// want to know which provider is down before touching the code.
//
//   node scripts/pipeline-probe-sources.mjs            # all sources, Stowe VT + Alta UT
//   node scripts/pipeline-probe-sources.mjs --lat=44.53 --lon=-72.78 --state=VT
//
// Read-only. Never prints keys. Exit code 1 when any source failed.

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const a = args.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : fallback;
};
const lat = Number(opt("lat", "44.5303"));
const lon = Number(opt("lon", "-72.7814"));
const state = opt("state", "VT");
const UA = `Wynla/2.0 (https://wynla.app; ${process.env.NWS_CONTACT_EMAIL || "hello@wynla.app"})`;

async function probe(name, url, check, headers = {}) {
  const started = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 25_000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: ac.signal });
    const ms = Date.now() - started;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const detail = await check(res);
    console.log(`ok    ${name.padEnd(28)} ${ms} ms  ${detail}`);
    return true;
  } catch (e) {
    console.log(`FAIL  ${name.padEnd(28)} ${String(e?.message ?? e).slice(0, 100)}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
const points = await fetch(`https://api.weather.gov/points/${lat},${lon}`, { headers: { "User-Agent": UA, Accept: "application/geo+json" } })
  .then((r) => r.json())
  .catch(() => null);
const gridUrl = points?.properties?.forecastGridData ?? null;
results.push(
  await probe("nws /points", `https://api.weather.gov/points/${lat},${lon}`, async (r) => {
    const j = await r.json();
    return `${j.properties?.gridId}/${j.properties?.gridX},${j.properties?.gridY} tz=${j.properties?.timeZone}`;
  }, { Accept: "application/geo+json" }),
);
if (gridUrl) {
  results.push(
    await probe("nws gridpoint layers", gridUrl, async (r) => {
      const j = await r.json();
      const p = j.properties ?? {};
      return `snowfallAmount=${p.snowfallAmount?.values?.length ?? 0} vals, updated ${p.updateTime}`;
    }, { Accept: "application/geo+json" }),
  );
}
results.push(
  await probe("nws stations (state)", `https://api.weather.gov/stations?state=${state}&limit=500`, async (r) => {
    const j = await r.json();
    return `${j.features?.length ?? 0} stations on page 1`;
  }, { Accept: "application/geo+json" }),
);
results.push(
  await probe(
    "open-meteo (free host)",
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=snowfall_sum&hourly=freezing_level_height&forecast_days=2&timezone=auto`,
    async (r) => {
      const j = await r.json();
      return `tz=${j.timezone} elevation=${j.elevation} m`;
    },
  ),
);
results.push(
  await probe(
    "nohrsc snodas identify",
    `https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer/identify?geometry=${lon},${lat}&geometryType=esriGeometryPoint&sr=4326&layers=visible:2,3,6,7&tolerance=1&mapExtent=${lon - 0.05},${lat - 0.05},${lon + 0.05},${lat + 0.05}&imageDisplay=400,400,96&returnGeometry=false&f=json`,
    async (r) => {
      const j = await r.json();
      const depth = j.results?.find((x) => x.layerId === 3)?.attributes?.["Service Pixel Value"];
      return `depth pixel=${depth ?? "none (outside CONUS?)"}`;
    },
  ),
);
const now = new Date();
const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
results.push(
  await probe("nohrsc sfav2 listing", `https://www.nohrsc.noaa.gov/snowfall_v2/data/${yyyymm}/`, async (r) => {
    const html = await r.text();
    const files = [...html.matchAll(/sfav2_CONUS_24h_(\d{10})\.tif/g)].map((m) => m[1]);
    return `${files.length} 24h files, latest ${files.at(-1) ?? "none"}`;
  }),
);
results.push(
  await probe(
    "awdb snotel (UT list)",
    "https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/stations?stationTriplets=*:UT:SNTL&activeOnly=true&returnForecastPointMetadata=false&returnReservoirMetadata=false&returnStationElements=false",
    async (r) => `${(await r.json()).length} stations`,
    { Accept: "application/json" },
  ),
);
results.push(
  await probe(
    "snocountry demo feed",
    "http://feeds.snocountry.net/getSnowReport.php?apiKey=SnoCountry.example&states=vt&output=json",
    async (r) => `${(await r.json()).totalItems} demo resorts`,
  ),
);
process.exit(results.every(Boolean) ? 0 : 1);
