import { describe, expect, it } from "vitest";
import {
  makeUnsubscribeToken,
  parseUnsubscribeList,
  unsubscribeUrl,
  verifyUnsubscribeToken,
} from "@/lib/digestUnsubscribe";

const SECRET = "test-secret-do-not-use";

describe("digest unsubscribe tokens", () => {
  it("round-trips a subscription id", () => {
    const t = makeUnsubscribeToken(42, SECRET);
    expect(t).toMatch(/^42\.[0-9a-f]{64}$/);
    expect(verifyUnsubscribeToken(t, SECRET)).toBe(42);
  });

  it("rejects tampered ids, tampered signatures and other secrets", () => {
    const t = makeUnsubscribeToken(42, SECRET);
    const [, sig] = t.split(".");
    expect(verifyUnsubscribeToken(`43.${sig}`, SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(`42.${"0".repeat(64)}`, SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(t, "another-secret")).toBeNull();
  });

  it("rejects malformed input without throwing", () => {
    for (const bad of [null, undefined, "", "abc", "42", "42.", "-1.deadbeef", "0." + "a".repeat(64)]) {
      expect(verifyUnsubscribeToken(bad, SECRET)).toBeNull();
    }
    expect(() => makeUnsubscribeToken(0, SECRET)).toThrow();
    expect(() => makeUnsubscribeToken(1.5, SECRET)).toThrow();
  });

  it("builds the endpoint URL with the token encoded and no double slash", () => {
    const t = makeUnsubscribeToken(7, SECRET);
    const url = unsubscribeUrl("https://wynla.app/", t);
    expect(url).toBe(`https://wynla.app/api/digest/unsubscribe?token=${encodeURIComponent(t)}`);
  });

  it("scopes the Thursday picks link to its own list and leaves the digest link unchanged", () => {
    const t = makeUnsubscribeToken(7, SECRET);
    expect(unsubscribeUrl("https://wynla.app", t, "thursday")).toBe(
      `https://wynla.app/api/digest/unsubscribe?token=${encodeURIComponent(t)}&list=thursday`,
    );
    expect(unsubscribeUrl("https://wynla.app", t, "digest")).toBe(unsubscribeUrl("https://wynla.app", t));
    expect(parseUnsubscribeList("thursday")).toBe("thursday");
    expect(parseUnsubscribeList("digest")).toBe("digest");
    expect(parseUnsubscribeList("anything-else")).toBe("digest");
    expect(parseUnsubscribeList(null)).toBe("digest");
  });
});
