// NOAA NOHRSC measured-snow products (CONUS only, public domain).
//
// 1. SNODAS snow depth + SWE at a point via the ArcGIS "identify" call
//    on NOAA's map service. Verified live 2026-09-23:
//      GET https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer/identify
//          ?geometry={lon},{lat}&geometryType=esriGeometryPoint&sr=4326
//          &layers=visible:3,7&tolerance=1&mapExtent=...&imageDisplay=400,400,96&returnGeometry=false&f=json
//      → { results: [ { layerId: 3, attributes: { "Service Pixel Value": "68.58", idp_validtime: ... } },
//                     { layerId: 7, attributes: { "Service Pixel Value": "41112" } } ] }
//    Layer 3 = Snow Depth, layer 7 = Snow Water Equivalent. Outside the
//    CONUS footprint (Alaska) results is [] → every field null.
//    Units: the legend for layer 3 runs 0-787 and for layer 7 0-79, both
//    labelled in inches, and the only physically consistent reading of
//    the Mt Rainier sample (depth 68.58 / SWE 41112) is depth in inches
//    and SWE in thousandths of an inch (density 0.60, glacier firn). We
//    keep the raw pixel values in forecast_json.measured.snodas_raw so
//    the assumption can be re-checked on the first real storm.
//
// 2. National Gridded Snowfall Analysis v2 (sfav2) — measurement-based
//    24 h snowfall grid, 0.04° (~4 km), published as a GeoTIFF:
//      https://www.nohrsc.noaa.gov/snowfall_v2/data/YYYYMM/sfav2_CONUS_24h_YYYYMMDDHH.tif
//    Verified header 2026-09-23: little-endian TIFF, 1500×850 float32,
//    LZW (compression 5, no predictor), one row per strip, tiepoint
//    (-126, 55), pixel 0.04°, nodata -99999. Values are inches (a
//    1.78 pixel sat on Wheeler Peak NV after a 22 Sep storm). Because
//    every strip is one row we range-read the header once (~8 KB) and
//    then exactly one ~250 byte strip per resort, then LZW-decode it —
//    no GDAL, no full download.

import { fetchJson, fetchRange, fetchText } from "./http";
import { isNum, round } from "./units";

// ---------- CONUS guard ----------

/** SNODAS / sfav2 cover the coterminous US only. */
export function isConus(lat: number, lon: number): boolean {
  return lat >= 24 && lat <= 50 && lon >= -125 && lon <= -66;
}

// ---------- SNODAS identify ----------

const SNODAS_SERVICE =
  "https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer";
// Layers 3 / 7 carry the pixel value; their parent "Footprint" layers
// 2 / 6 carry idp_validtime, so we ask for all four in one call.
const SNODAS_DEPTH_LAYER = 3;
const SNODAS_SWE_LAYER = 7;
const SNODAS_DEPTH_FOOTPRINT = 2;
const SNODAS_SWE_FOOTPRINT = 6;

type IdentifyResponse = {
  results?: Array<{
    layerId?: number;
    attributes?: Record<string, string | undefined>;
  }>;
};

export type SnodasPoint = {
  depth_in: number | null;
  swe_in: number | null;
  valid: string | null; // ISO-8601 UTC
  raw: { depth: number | null; swe: number | null };
};

function parsePixel(attrs: Record<string, string | undefined> | undefined): number | null {
  const v = attrs?.["Service Pixel Value"];
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "9/22/2026 6:00:00 PM" or a bare "9/23/2026" (map service, UTC) → ISO string. */
export function parseIdpTime(v: string | undefined): string | null {
  if (!v) return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2}):(\d{2}) (AM|PM))?$/.exec(v.trim());
  if (!m) return null;
  let hour = 0;
  if (m[4]) {
    hour = Number(m[4]) % 12;
    if (m[7] === "PM") hour += 12;
  }
  const t = Date.UTC(Number(m[3]), Number(m[1]) - 1, Number(m[2]), hour, Number(m[5] ?? 0), Number(m[6] ?? 0));
  return new Date(t).toISOString();
}

export function parseSnodasIdentify(j: IdentifyResponse): SnodasPoint {
  const results = j.results ?? [];
  const depthRow = results.find((r) => r.layerId === SNODAS_DEPTH_LAYER);
  const sweRow = results.find((r) => r.layerId === SNODAS_SWE_LAYER);
  const validRow =
    results.find((r) => r.layerId === SNODAS_DEPTH_FOOTPRINT && r.attributes?.idp_validtime) ??
    results.find((r) => r.layerId === SNODAS_SWE_FOOTPRINT && r.attributes?.idp_validtime);
  const depthRaw = parsePixel(depthRow?.attributes);
  const sweRaw = parsePixel(sweRow?.attributes);
  const depthIn = isNum(depthRaw) && depthRaw >= 0 && depthRaw < 1000 ? round(depthRaw, 1) : null;
  let sweIn = isNum(sweRaw) && sweRaw >= 0 ? round(sweRaw / 1000, 2) : null;
  // SWE can never exceed depth; if it does the unit assumption is wrong
  // for this pixel and we would rather show nothing than nonsense.
  if (isNum(sweIn) && isNum(depthIn) && sweIn > depthIn) sweIn = null;
  return {
    depth_in: depthIn,
    swe_in: sweIn,
    valid: parseIdpTime(validRow?.attributes?.idp_validtime),
    raw: { depth: depthRaw, swe: sweRaw },
  };
}

export async function fetchSnodasPoint(lat: number, lon: number): Promise<SnodasPoint | null> {
  if (!isConus(lat, lon)) return null;
  const d = 0.05;
  const p = new URLSearchParams({
    geometry: `${lon.toFixed(4)},${lat.toFixed(4)}`,
    geometryType: "esriGeometryPoint",
    sr: "4326",
    layers: `visible:${SNODAS_DEPTH_FOOTPRINT},${SNODAS_DEPTH_LAYER},${SNODAS_SWE_FOOTPRINT},${SNODAS_SWE_LAYER}`,
    tolerance: "1",
    mapExtent: `${(lon - d).toFixed(4)},${(lat - d).toFixed(4)},${(lon + d).toFixed(4)},${(lat + d).toFixed(4)}`,
    imageDisplay: "400,400,96",
    returnGeometry: "false",
    f: "json",
  });
  const j = await fetchJson<IdentifyResponse>(`${SNODAS_SERVICE}/identify?${p}`, {
    timeoutMs: 20_000,
  });
  return parseSnodasIdentify(j);
}

// ---------- sfav2 GeoTIFF point sampler ----------

const SFAV2_BASE = "https://www.nohrsc.noaa.gov/snowfall_v2/data";
const NODATA = -99999;

export type Sfav2File = {
  name: string; // sfav2_CONUS_24h_2026092312.tif
  url: string;
  /** End of the accumulation window, UTC. */
  validEnd: string;
  hours: 6 | 24 | 48 | 72;
};

/** Parse a directory listing into files for one accumulation window,
 *  newest last. Exported for tests. */
export function parseSfav2Listing(html: string, yyyymm: string, hours: 24 | 48 | 72 = 24): Sfav2File[] {
  const re = new RegExp(`sfav2_CONUS_${hours}h_(\\d{10})\\.tif`, "g");
  const seen = new Set<string>();
  const out: Sfav2File[] = [];
  for (const m of html.matchAll(re)) {
    const name = m[0];
    if (seen.has(name)) continue;
    seen.add(name);
    const s = m[1];
    const validEnd = new Date(
      Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)), Number(s.slice(8, 10))),
    ).toISOString();
    out.push({ name, url: `${SFAV2_BASE}/${yyyymm}/${name}`, validEnd, hours });
  }
  return out.sort((a, b) => (a.validEnd < b.validEnd ? -1 : 1));
}

export type Sfav2Hours = 24 | 48 | 72;

/** Newest 24 h / 48 h / 72 h analysis files. NOHRSC issues all three at
 *  00Z and 12Z (verified on the live listing 2026-09-23: 90 files each
 *  for September), so one directory read serves every window. */
export type Sfav2Latest = { h24: Sfav2File | null; h48: Sfav2File | null; h72: Sfav2File | null };

export async function findLatestSfav2Set(now: Date = new Date()): Promise<Sfav2Latest> {
  const months = [now, new Date(now.getTime() - 20 * 86_400_000)].map(
    (d) => `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
  );
  const out: Sfav2Latest = { h24: null, h48: null, h72: null };
  for (const yyyymm of Array.from(new Set(months))) {
    try {
      const html = await fetchText(`${SFAV2_BASE}/${yyyymm}/`, { timeoutMs: 20_000 });
      for (const [key, hours] of [["h24", 24], ["h48", 48], ["h72", 72]] as const) {
        if (out[key]) continue;
        const files = parseSfav2Listing(html, yyyymm, hours);
        if (files.length) out[key] = files[files.length - 1];
      }
      if (out.h24 && out.h48 && out.h72) break;
    } catch {
      /* try the previous month */
    }
  }
  return out;
}

/** Newest available analysis file for one window (checks this month, then last). */
export async function findLatestSfav2(now: Date = new Date(), hours: Sfav2Hours = 24): Promise<Sfav2File | null> {
  const set = await findLatestSfav2Set(now);
  return hours === 24 ? set.h24 : hours === 48 ? set.h48 : set.h72;
}

export type TiffGeometry = {
  width: number;
  height: number;
  originLon: number;
  originLat: number;
  pixelLon: number;
  pixelLat: number;
  compression: number;
  stripOffsets: number[];
  stripByteCounts: number[];
};

/**
 * Thrown by the header parser when it needs bytes that have not been
 * fetched yet. The sampler answers it with one more range read and
 * parses again. Needed because the 24 h file keeps its IFD at byte 8
 * while the 48 h / 72 h files (same producer, different GDAL options)
 * put the IFD and every out-of-line array at the END of the file
 * (verified 2026-09-23: IFD at 213,372 of 220,816 bytes).
 */
export class NeedBytesError extends Error {
  readonly offset: number;
  readonly length: number;
  constructor(offset: number, length: number) {
    super(`sfav2: header needs bytes ${offset}..${offset + length - 1}`);
    this.name = "NeedBytesError";
    this.offset = offset;
    this.length = length;
  }
}

/** A file seen through a handful of fetched byte ranges. Reads outside
 *  the fetched ranges throw NeedBytesError instead of a DataView error. */
export class SparseBytes {
  private chunks: Array<{ at: number; dv: DataView; bytes: Uint8Array }> = [];

  add(at: number, bytes: Uint8Array): void {
    this.chunks.push({ at, bytes, dv: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) });
  }

  private locate(offset: number, length: number): { dv: DataView; rel: number; bytes: Uint8Array } {
    for (const c of this.chunks) {
      if (offset >= c.at && offset + length <= c.at + c.bytes.byteLength) {
        return { dv: c.dv, rel: offset - c.at, bytes: c.bytes };
      }
    }
    throw new NeedBytesError(offset, length);
  }

  u8(o: number): number {
    const { bytes, rel } = this.locate(o, 1);
    return bytes[rel];
  }
  u16(o: number): number {
    const { dv, rel } = this.locate(o, 2);
    return dv.getUint16(rel, true);
  }
  u32(o: number): number {
    const { dv, rel } = this.locate(o, 4);
    return dv.getUint32(rel, true);
  }
  f32(o: number): number {
    const { dv, rel } = this.locate(o, 4);
    return dv.getFloat32(rel, true);
  }
  f64(o: number): number {
    const { dv, rel } = this.locate(o, 8);
    return dv.getFloat64(rel, true);
  }
}

/** Parse the IFD of a striped single-band little-endian GeoTIFF.
 *  Only the tags the sampler needs. Throws on unsupported layouts, and
 *  NeedBytesError when the IFD or an array lies outside the given bytes. */
export function parseTiffHeader(input: Uint8Array | SparseBytes): TiffGeometry {
  let src: SparseBytes;
  if (input instanceof SparseBytes) src = input;
  else {
    src = new SparseBytes();
    src.add(0, input);
  }
  if (!(src.u8(0) === 0x49 && src.u8(1) === 0x49)) throw new Error("sfav2: not little-endian TIFF");
  if (src.u16(2) !== 42) throw new Error("sfav2: bad TIFF magic");
  const ifd = src.u32(4);
  const n = src.u16(ifd);
  const typeSize: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 11: 4, 12: 8 };
  let width = 0;
  let height = 0;
  let compression = 1;
  let bits = 0;
  let sampleFormat = 1;
  let rowsPerStrip = 0;
  let stripOffsets: number[] = [];
  let stripByteCounts: number[] = [];
  let scale: [number, number] | null = null;
  let tie: [number, number] | null = null;

  const readArray = (type: number, count: number, valueOff: number): number[] => {
    const size = typeSize[type] ?? 1;
    const at = size * count <= 4 ? valueOff : src.u32(valueOff);
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      const o = at + i * size;
      if (type === 3) out.push(src.u16(o));
      else if (type === 4) out.push(src.u32(o));
      else if (type === 12) out.push(src.f64(o));
      else if (type === 11) out.push(src.f32(o));
      else out.push(src.u8(o));
    }
    return out;
  };

  for (let i = 0; i < n; i++) {
    const o = ifd + 2 + i * 12;
    const tag = src.u16(o);
    const type = src.u16(o + 2);
    const count = src.u32(o + 4);
    const valueOff = o + 8;
    switch (tag) {
      case 256:
        width = readArray(type, 1, valueOff)[0];
        break;
      case 257:
        height = readArray(type, 1, valueOff)[0];
        break;
      case 258:
        bits = readArray(type, 1, valueOff)[0];
        break;
      case 259:
        compression = readArray(type, 1, valueOff)[0];
        break;
      case 273:
        stripOffsets = readArray(type, count, valueOff);
        break;
      case 278:
        rowsPerStrip = readArray(type, 1, valueOff)[0];
        break;
      case 279:
        stripByteCounts = readArray(type, count, valueOff);
        break;
      case 339:
        sampleFormat = readArray(type, 1, valueOff)[0];
        break;
      case 33550: {
        const s = readArray(type, 3, valueOff);
        scale = [s[0], s[1]];
        break;
      }
      case 33922: {
        const t = readArray(type, 6, valueOff);
        tie = [t[3], t[4]];
        break;
      }
      default:
        break;
    }
  }
  if (bits !== 32 || sampleFormat !== 3) throw new Error("sfav2: expected float32 samples");
  if (rowsPerStrip !== 1) throw new Error("sfav2: expected one row per strip");
  if (compression !== 5 && compression !== 1) throw new Error(`sfav2: unsupported compression ${compression}`);
  if (!scale || !tie || !width || !height) throw new Error("sfav2: missing geo tags");
  if (stripOffsets.length !== height || stripByteCounts.length !== height) {
    throw new Error("sfav2: strip tables incomplete");
  }
  return {
    width,
    height,
    originLon: tie[0],
    originLat: tie[1],
    pixelLon: scale[0],
    pixelLat: scale[1],
    compression,
    stripOffsets,
    stripByteCounts,
  };
}

/** TIFF-flavoured LZW (MSB-first codes, "early change"). Decodes one
 *  strip into `expectedBytes`. Small enough to keep dependency-free. */
export function lzwDecode(src: Uint8Array, expectedBytes: number): Uint8Array {
  const out = new Uint8Array(expectedBytes);
  let op = 0;
  let bitPos = 0;
  const totalBits = src.length * 8;
  let codeLen = 9;
  let dict: Uint8Array[] = [];
  let prev: Uint8Array | null = null;
  const reset = () => {
    dict = [];
    for (let i = 0; i < 256; i++) dict.push(Uint8Array.of(i));
    dict.push(new Uint8Array(0)); // 256 clear
    dict.push(new Uint8Array(0)); // 257 end
    codeLen = 9;
    prev = null;
  };
  const readCode = (): number => {
    if (bitPos + codeLen > totalBits) return 257;
    let v = 0;
    for (let i = 0; i < codeLen; i++) {
      const bit = (src[bitPos >> 3] >> (7 - (bitPos & 7))) & 1;
      v = (v << 1) | bit;
      bitPos++;
    }
    return v;
  };
  const emit = (e: Uint8Array) => {
    const len = Math.min(e.length, expectedBytes - op);
    out.set(e.subarray(0, len), op);
    op += len;
  };
  const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
    const c = new Uint8Array(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
  };
  reset();
  while (op < expectedBytes) {
    const code = readCode();
    if (code === 257) break;
    if (code === 256) {
      reset();
      const first = readCode();
      if (first === 257) break;
      const e = dict[first];
      if (!e) throw new Error("lzw: bad first code");
      emit(e);
      prev = e;
      continue;
    }
    let entry: Uint8Array;
    if (code < dict.length) {
      entry = dict[code];
      if (prev) dict.push(concat(prev, entry.subarray(0, 1)));
    } else if (prev) {
      entry = concat(prev, prev.subarray(0, 1));
      dict.push(entry);
    } else {
      throw new Error("lzw: code without prefix");
    }
    emit(entry);
    prev = entry;
    if (dict.length + 1 >= 1 << codeLen && codeLen < 12) codeLen++;
  }
  return out;
}

/** Pixel (row, col) for a coordinate, or null when outside the grid. */
export function pixelFor(geo: TiffGeometry, lat: number, lon: number): { row: number; col: number } | null {
  const col = Math.floor((lon - geo.originLon) / geo.pixelLon);
  const row = Math.floor((geo.originLat - lat) / geo.pixelLat);
  if (col < 0 || row < 0 || col >= geo.width || row >= geo.height) return null;
  return { row, col };
}

/** Decode a strip and return the float at `col`; NaN/nodata → null. */
export function valueFromStrip(geo: TiffGeometry, strip: Uint8Array, col: number): number | null {
  const rowBytes = geo.width * 4;
  const raw = geo.compression === 5 ? lzwDecode(strip, rowBytes) : strip.subarray(0, rowBytes);
  if (raw.byteLength < (col + 1) * 4) return null;
  const v = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getFloat32(col * 4, true);
  if (!Number.isFinite(v) || v <= NODATA + 1 || v < 0) return null;
  return round(v, 2);
}

/**
 * Cached sampler for one sfav2 file: fetches the header once, then one
 * strip per distinct row (rows are shared by resorts on the same
 * latitude band, so the cache pays off across a run).
 */
const HEADER_BLOCK = 16_384;

export class Sfav2Sampler {
  readonly file: Sfav2File;
  private geo: TiffGeometry | null = null;
  private headerPromise: Promise<TiffGeometry> | null = null;
  private strips = new Map<number, Promise<Uint8Array>>();

  constructor(file: Sfav2File) {
    this.file = file;
  }

  private async header(): Promise<TiffGeometry> {
    if (this.geo) return this.geo;
    if (!this.headerPromise) {
      this.headerPromise = (async () => {
        // 16 KB covers the IFD + both 850-entry strip tables when they sit
        // at the front (24 h file). When the parser asks for bytes further
        // in (48 h / 72 h files keep the IFD at the end), fetch that 16 KB
        // block and parse again; the tables follow the IFD, so one extra
        // read is the norm and four is a hard cap.
        const src = new SparseBytes();
        src.add(0, await fetchRange(this.file.url, 0, HEADER_BLOCK - 1, { timeoutMs: 25_000 }));
        for (let reads = 1; reads <= 4; reads++) {
          try {
            this.geo = parseTiffHeader(src);
            return this.geo;
          } catch (e) {
            if (!(e instanceof NeedBytesError) || reads === 4) throw e;
            const from = Math.floor(e.offset / HEADER_BLOCK) * HEADER_BLOCK;
            const to = Math.max(from + HEADER_BLOCK, e.offset + e.length) - 1;
            src.add(from, await fetchRange(this.file.url, from, to, { timeoutMs: 25_000 }));
          }
        }
        throw new Error("sfav2: header spread over too many ranges");
      })();
    }
    return this.headerPromise;
  }

  private strip(row: number, geo: TiffGeometry): Promise<Uint8Array> {
    let p = this.strips.get(row);
    if (!p) {
      const off = geo.stripOffsets[row];
      const cnt = geo.stripByteCounts[row];
      p = fetchRange(this.file.url, off, off + cnt - 1, { timeoutMs: 20_000 });
      this.strips.set(row, p);
    }
    return p;
  }

  /** Inches of snowfall in the file's window at the point; null outside CONUS / nodata. */
  async sample(lat: number, lon: number): Promise<number | null> {
    if (!isConus(lat, lon)) return null;
    const geo = await this.header();
    const px = pixelFor(geo, lat, lon);
    if (!px) return null;
    const strip = await this.strip(px.row, geo);
    return valueFromStrip(geo, strip, px.col);
  }
}
