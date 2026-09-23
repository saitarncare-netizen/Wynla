import { describe, expect, it } from "vitest";
import sfav2 from "./__fixtures__/sfav2-24h-2026092300-row400.json";
import sfav248 from "./__fixtures__/sfav2-48h-2026092300-ifd.json";
import snodas from "./__fixtures__/snodas-identify-rainier.json";
import {
  isConus,
  lzwDecode,
  parseIdpTime,
  NeedBytesError,
  parseSfav2Listing,
  SparseBytes,
  parseSnodasIdentify,
  parseTiffHeader,
  pixelFor,
  valueFromStrip,
} from "./nohrsc";

describe("SNODAS identify", () => {
  it("reads depth (inches) and SWE (thousandths of an inch) at Mt Rainier", () => {
    const p = parseSnodasIdentify(snodas);
    expect(p.depth_in).toBe(68.6);
    expect(p.swe_in).toBe(41.11);
    expect(p.raw).toEqual({ depth: 68.58, swe: 41111 });
    expect(p.valid).toBe("2026-09-22T21:00:00.000Z"); // from the depth footprint layer
  });

  it("returns nulls outside the CONUS footprint (empty results)", () => {
    const p = parseSnodasIdentify({ results: [] });
    expect(p.depth_in).toBeNull();
    expect(p.swe_in).toBeNull();
    expect(isConus(60.97, -149.1)).toBe(false); // Alyeska
    expect(isConus(44.53, -72.78)).toBe(true);
  });

  it("drops physically impossible SWE > depth", () => {
    const p = parseSnodasIdentify({
      results: [
        { layerId: 3, attributes: { "Service Pixel Value": "10" } },
        { layerId: 7, attributes: { "Service Pixel Value": "20000" } },
      ],
    });
    expect(p.depth_in).toBe(10);
    expect(p.swe_in).toBeNull();
  });

  it("parses the map service timestamp format", () => {
    expect(parseIdpTime("9/22/2026 6:00:00 PM")).toBe("2026-09-22T18:00:00.000Z");
    expect(parseIdpTime("1/5/2027 12:05:10 AM")).toBe("2027-01-05T00:05:10.000Z");
    expect(parseIdpTime("9/23/2026")).toBe("2026-09-23T00:00:00.000Z");
    expect(parseIdpTime("nonsense")).toBeNull();
  });
});

describe("sfav2 snowfall analysis", () => {
  it("lists files newest last", () => {
    const html = `<a href="sfav2_CONUS_24h_2026092212.tif">x</a> <a href="sfav2_CONUS_24h_2026092300.tif">y</a>
      <a href="sfav2_CONUS_24h_2026092212.tif">dup</a> <a href="sfav2_CONUS_72h_2026092300.tif">z</a>`;
    const files = parseSfav2Listing(html, "202609", 24);
    expect(files.map((f) => f.name)).toEqual(["sfav2_CONUS_24h_2026092212.tif", "sfav2_CONUS_24h_2026092300.tif"]);
    expect(files[1].validEnd).toBe("2026-09-23T00:00:00.000Z");
    expect(files[1].url).toBe("https://www.nohrsc.noaa.gov/snowfall_v2/data/202609/sfav2_CONUS_24h_2026092300.tif");
  });

  it("samples a pixel from a range-read strip (Wheeler Peak NV, 2026-09-23 00Z)", () => {
    const header = new Uint8Array(Buffer.from(sfav2.header_base64, "base64"));
    const geo = parseTiffHeader(header);
    expect(geo.width).toBe(1500);
    expect(geo.height).toBe(850);
    expect(geo.compression).toBe(5);
    expect(geo.originLon).toBe(-126);
    expect(geo.originLat).toBe(55);
    expect(geo.stripOffsets[sfav2.row]).toBe(sfav2.strip_offset);
    expect(geo.stripByteCounts[sfav2.row]).toBe(sfav2.strip_bytes);

    const px = pixelFor(geo, 38.98, -114.31);
    expect(px).toEqual({ row: 400, col: 292 });
    const strip = new Uint8Array(Buffer.from(sfav2.strip_base64, "base64"));
    expect(valueFromStrip(geo, strip, 292)).toBe(1.78);
    expect(valueFromStrip(geo, strip, 0)).toBeNull(); // Pacific: nodata (-99999) → null
    expect(valueFromStrip(geo, strip, 400)).toBe(0); // inland at 39°N, -110°: dry
    expect(pixelFor(geo, 60, -149)).toBeNull();
  });

  it("reads an IFD that sits at the end of the file through sparse ranges (real 48 h header)", () => {
    const head = new Uint8Array(Buffer.from(sfav248.head_base64, "base64"));
    const tail = new Uint8Array(Buffer.from(sfav248.tail_base64, "base64"));
    // Only the first 16 bytes fetched: the parser must say which bytes it needs.
    const src = new SparseBytes();
    src.add(0, head);
    let need: NeedBytesError | null = null;
    try {
      parseTiffHeader(src);
    } catch (e) {
      need = e instanceof NeedBytesError ? e : null;
    }
    expect(need?.offset).toBe(sfav248.ifd_offset);
    // After the tail range arrives the header parses like the 24 h one.
    src.add(sfav248.tail_offset, tail);
    const geo = parseTiffHeader(src);
    expect(geo.width).toBe(1500);
    expect(geo.height).toBe(850);
    expect(geo.compression).toBe(5);
    expect(geo.originLon).toBe(-126);
    expect(geo.originLat).toBe(55);
    expect(geo.stripOffsets).toHaveLength(850);
    expect(geo.stripOffsets[sfav248.strip_row]).toBe(sfav248.strip_offset);
    expect(geo.stripByteCounts[sfav248.strip_row]).toBe(sfav248.strip_byte_count);
    const strip = new Uint8Array(Buffer.from(sfav248.strip_base64, "base64"));
    expect(lzwDecode(strip, geo.width * 4).byteLength).toBe(6000);
    // 48 h total at Wheeler Peak NV covers the same storm as the 24 h 1.78 in.
    expect(valueFromStrip(geo, strip, 292)).toBeGreaterThanOrEqual(1.78);
    expect(valueFromStrip(geo, strip, 0)).toBeNull();
  });

  it("LZW-decodes a strip to exactly one row of float32", () => {
    const header = new Uint8Array(Buffer.from(sfav2.header_base64, "base64"));
    const geo = parseTiffHeader(header);
    const strip = new Uint8Array(Buffer.from(sfav2.strip_base64, "base64"));
    const raw = lzwDecode(strip, geo.width * 4);
    expect(raw.byteLength).toBe(6000);
  });
});
