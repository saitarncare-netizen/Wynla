import { describe, expect, it } from "vitest";
import { buildDigestEmail, type FavoriteResortSnapshot } from "@/lib/emailTemplates";

const vail: FavoriteResortSnapshot = {
  name: "Vail",
  slug: "vail",
  state: "CO",
  tempHigh: 28,
  conditions: "Snow showers",
  snowNew24h: 9,
  snowNew7d: 22,
  snowSource: "Reported",
  statusLabel: "Open",
  operating: true,
  statusKnown: true,
  surfaceLabel: "Powder",
  reportFresh: true,
  primaryPass: "Epic Pass",
};

const closedHill: FavoriteResortSnapshot = {
  name: "Mount <Closed>",
  slug: "mount-closed",
  state: "VT",
  tempHigh: null,
  conditions: null,
  snowNew24h: 4,
  snowNew7d: null,
  snowSource: "Measured",
  statusLabel: "Off-season",
  operating: false,
  statusKnown: true,
  surfaceLabel: null,
  reportFresh: true,
  primaryPass: "Independent",
};

const unknownHill: FavoriteResortSnapshot = {
  name: "Mystery Peak",
  slug: "mystery-peak",
  state: "CO",
  tempHigh: 20,
  conditions: "Snow",
  snowNew24h: 5,
  snowNew7d: null,
  snowSource: "Measured",
  statusLabel: "Status unknown",
  operating: false,
  statusKnown: false,
  surfaceLabel: null,
  reportFresh: true,
  primaryPass: "Epic Pass",
};

const base = {
  isRecap: false,
  unsubscribeUrl: "https://wynla.app/api/digest/unsubscribe?token=1.abc",
  preferencesUrl: "https://wynla.app/account/digest",
  date: "2026-12-15",
  frequency: "daily" as const,
};

describe("buildDigestEmail", () => {
  it("greets by display name and labels every number", () => {
    const out = buildDigestEmail({ ...base, userName: "Saitarn", favoriteResortSnapshots: [vail] });
    expect(out.html).toContain("Hi Saitarn,");
    expect(out.text.startsWith("Hi Saitarn,")).toBe(true);
    expect(out.subject).toBe("9 in of new snow at Vail, your Wynla daily digest");
    expect(out.html).toContain("9 in new snow in 24 h (resort-reported)");
    expect(out.html).toContain("22 in in the last 7 days");
    expect(out.html).toContain("High 28°F");
    expect(out.html).toContain("Surface: Powder");
    expect(out.text).toContain("Surface: Powder");
    expect(out.text).toContain("high 28F");
  });

  it("falls back to a neutral greeting and a dated subject with no powder", () => {
    const out = buildDigestEmail({ ...base, userName: null, favoriteResortSnapshots: [closedHill] });
    expect(out.html).toContain("Hi there,");
    expect(out.subject).toBe("Your Wynla daily snow digest for 2026-12-15");
    // Closed resorts never present measured snow as a number.
    expect(out.html).toContain("No report while closed");
    expect(out.html).not.toContain("4 in new snow");
  });

  it("escapes HTML in resort names and carries both unsubscribe and preferences links", () => {
    const out = buildDigestEmail({ ...base, userName: null, favoriteResortSnapshots: [closedHill] });
    expect(out.html).toContain("Mount &lt;Closed&gt;");
    expect(out.html).not.toContain("Mount <Closed>");
    expect(out.html).toContain(base.unsubscribeUrl);
    expect(out.html).toContain(base.preferencesUrl);
    expect(out.text).toContain(`Unsubscribe: ${base.unsubscribeUrl}`);
    expect(out.text).toContain(`Change cadence or threshold: ${base.preferencesUrl}`);
  });

  it("never calls an unknown-status resort closed, and labels its measured number", () => {
    // Mixed case: the open favorite unlocks the send, the unknown one must
    // not read "Status unknown" on one line and "closed" on the next.
    const out = buildDigestEmail({ ...base, userName: null, favoriteResortSnapshots: [vail, unknownHill] });
    expect(out.html).toContain("Status unknown");
    expect(out.html).not.toContain("No report while closed");
    expect(out.html).toContain("5 in new snow in 24 h (measured, open status unconfirmed)");
    expect(out.text).toContain("5 in new snow in 24 h (measured, open status unconfirmed)");
    // Unknown status never drives the subject line: only operating resorts do.
    expect(out.subject).toBe("9 in of new snow at Vail, your Wynla daily digest");

    const none = buildDigestEmail({
      ...base,
      userName: null,
      favoriteResortSnapshots: [vail, { ...unknownHill, snowNew24h: null }],
    });
    expect(none.html).toContain("No snow report available");
    expect(none.html).not.toContain("No report while closed");
  });

  it("marks stale reports instead of showing an old number", () => {
    const out = buildDigestEmail({
      ...base,
      userName: null,
      favoriteResortSnapshots: [{ ...vail, reportFresh: false }],
    });
    expect(out.html).toContain("Snow report not updated recently");
    expect(out.subject).toBe("Your Wynla daily snow digest for 2026-12-15");
  });
});
