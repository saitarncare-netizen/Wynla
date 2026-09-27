import { describe, expect, it } from "vitest";
import resortsFixture from "@/lib/saturday/__fixtures__/resorts.json";
import offSeasonFixture from "@/lib/saturday/__fixtures__/resorts-off-season.json";
import powderFixture from "@/lib/saturday/__fixtures__/weather-powder.json";
import { rankForSaturday, type RankResort, type RankWeather } from "@/lib/saturday/rank";
import { buildThursdayPicksEmail } from "./thursdayPicks";

const NOW = new Date("2027-01-14T14:00:00Z");
const NYC = { lat: 40.7128, lon: -74.006, name: "NYC" };
const resorts = resortsFixture as unknown as RankResort[];

function weatherMap(rows: RankResort[]): Map<number, RankWeather> {
  const fixture = powderFixture as unknown as Record<string, RankWeather>;
  return new Map(rows.flatMap((r) => (fixture[r.slug] ? [[r.id, fixture[r.slug]] as [number, RankWeather]] : [])));
}

const common = {
  userName: "Saitarn",
  cityName: "NYC",
  passLabel: "Ikon Pass",
  goUrl: "https://wynla.app/go?city=nyc&pass=ikon&product=ikon-pass",
  siteBase: "https://wynla.app",
  unsubscribeUrl: "https://wynla.app/api/digest/unsubscribe?token=1.abc",
  preferencesUrl: "https://wynla.app/go",
  now: NOW,
};

describe("buildThursdayPicksEmail", () => {
  it("names the three picks in the subject and labels every number", () => {
    const result = rankForSaturday({
      resorts,
      weatherById: weatherMap(resorts),
      passFamily: "ikon",
      product: "ikon-pass",
      origin: NYC,
      targetDate: "2027-01-16",
      maxDriveHours: 6,
      now: NOW,
    });
    const mail = buildThursdayPicksEmail({ ...common, result });
    expect(mail.subject).toBe("Sat, Jan 16 from NYC: Sugarbush, Killington");
    expect(mail.html).toContain("Hi Saitarn,");
    expect(mail.html).toContain("10 in forecast (NWS forecast, refreshed 2 h ago)");
    expect(mail.html).toContain("Resort reports 0 in in 24 h (3 h ago)");
    expect(mail.html).toContain("Surface: Powder (medium confidence, estimated from forecast)");
    expect(mail.html).toContain("Medium confidence");
    expect(mail.html).toContain("https://wynla.app/resort/sugarbush");
    expect(mail.html).toContain(common.unsubscribeUrl);
    expect(mail.text).toContain("1. Sugarbush (VT)");
    expect(mail.text).toContain("Unsubscribe: https://wynla.app/api/digest/unsubscribe?token=1.abc");
    expect(mail.text).not.toContain("!");
  });

  it("sends the countdown before the season instead of fake picks", () => {
    const result = rankForSaturday({
      resorts: offSeasonFixture as unknown as RankResort[],
      weatherById: new Map(),
      passFamily: "ikon",
      product: "ikon-pass",
      origin: NYC,
      targetDate: "2026-09-26",
      maxDriveHours: 6,
      now: new Date("2026-09-24T14:00:00Z"),
    });
    const mail = buildThursdayPicksEmail({ ...common, now: new Date("2026-09-24T14:00:00Z"), result });
    expect(mail.subject).toBe("Season countdown from NYC: Killington opens Nov 14");
    expect(mail.html).toContain("Projected to open Nov 14");
    expect(mail.html).toContain("Opens Nov 21 (58 days)");
    expect(mail.text).toContain("projected to open Nov 14");
    expect(mail.html).not.toContain("Surface:");
  });

  it("explains a blackout Saturday rather than skipping silently", () => {
    const result = rankForSaturday({
      resorts,
      weatherById: weatherMap(resorts),
      passFamily: "ikon",
      product: "ikon-base-pass",
      origin: NYC,
      targetDate: "2027-01-16",
      maxDriveHours: 6,
      now: NOW,
    });
    const mail = buildThursdayPicksEmail({ ...common, passLabel: "Ikon Base Pass", result });
    expect(mail.subject).toBe("Sat, Jan 16 from NYC: nothing fits your pass yet");
    expect(mail.html).toContain("Ikon Base blackout on Jan 16");
  });

  it("credits an Open-Meteo day to Open-Meteo and says the list is separate from the digest", () => {
    const fixture = powderFixture as unknown as Record<string, RankWeather>;
    const weather = new Map(
      resorts.flatMap((r) =>
        fixture[r.slug]
          ? [[r.id, { ...fixture[r.slug], days: fixture[r.slug].days.map((d) => ({ ...d, source: "open-meteo" as const })) }] as [number, RankWeather]]
          : [],
      ),
    );
    const result = rankForSaturday({
      resorts,
      weatherById: weather,
      passFamily: "ikon",
      product: "ikon-pass",
      origin: NYC,
      targetDate: "2027-01-16",
      maxDriveHours: 6,
      now: NOW,
    });
    const mail = buildThursdayPicksEmail({
      ...common,
      unsubscribeUrl: "https://wynla.app/api/digest/unsubscribe?token=1.abc&list=thursday",
      result,
    });
    expect(mail.html).toContain("10 in forecast (Open-Meteo forecast, refreshed 2 h ago)");
    expect(mail.html).not.toContain("NWS forecast");
    expect(mail.html).toContain("separate from the weekly snow digest");
    expect(mail.text).toContain("Unsubscribe: https://wynla.app/api/digest/unsubscribe?token=1.abc&list=thursday");
    expect(mail.text).not.toContain("!");
  });
});
