import { describe, expect, it } from "vitest";
import { airportByIata, allAirports } from "./airports";

// Every distinct closest_airport_iata in the resorts table (2026-09-23).
const DB_CODES =
  "ALB RNO BTV SLC MHT PWM MSP DEN TVC BDL MKE SYR LEB BZN BOS JAC AVP ONT GEG ASE DTW FCA DRO DLH BGR EGE IMT BUF CLE PDX EAT PIT PLN EWR AVL SEA CMX ORD ABQ FAR ANC IWD GTF SUN MSN ROC TSM BOI CKB FAT ABE HDN AUG YKM MMH LWS MBS RDM MYL CLT PQI COD MTJ AZO TWF SLK SAF COS DSM MSO DBQ RDD ELP JNU CWA BWI BKW CPR BKE GFK BRD TYS MLI LWB ATW CVG OMA CHA PDT IPT GRR TEX TUS LKV CHO ERI MSS MCI FAI LAR GWS LAS SOW CDV EUG TRI RHI IDA AXN EAU HPN HGR BIL GUC PHL SHR MDT CMH CLM EKO PSC BJI ART SBN HLN FLG ROA FSD GJT LBE RAP LSE MGW BLI BIS ALS SDF SWF SGU GRB RKD SHD OAK PIH LGU BTM UNV".split(" ");

describe("airports", () => {
  it.each(DB_CODES)("knows %s", (code) => {
    const a = airportByIata(code);
    expect(a, code).not.toBeNull();
    expect(a!.name.length).toBeGreaterThan(3);
    expect(a!.state).toMatch(/^[A-Z]{2}$/);
    expect(Math.abs(a!.lat)).toBeLessThan(72);
    expect(a!.lng).toBeLessThan(-66);
  });
  it("is case-insensitive and null-safe", () => {
    expect(airportByIata("btv")?.name).toBe("Burlington International");
    expect(airportByIata(" den ")?.city).toBe("Denver");
    expect(airportByIata("XXX")).toBeNull();
    expect(airportByIata(null)).toBeNull();
  });
  it("has no duplicate codes", () => {
    const codes = allAirports().map((a) => a.iata);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
