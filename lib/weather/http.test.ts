import { afterEach, describe, expect, it, vi } from "vitest";
import { errorText, fetchWithTimeout, HttpError, redactUrl, runWithDeadline } from "./http";

const SNOCOUNTRY = "http://feeds.snocountry.net/getSnowReport.php?apiKey=SECRET123&states=vt&output=json";
const OPEN_METEO = "https://customer-api.open-meteo.com/v1/forecast?latitude=40&daily=snowfall_sum&apikey=om_SECRET&timezone=auto";

describe("redaction", () => {
  it("masks credential query parameters and keeps the rest of the URL", () => {
    expect(redactUrl(SNOCOUNTRY)).toBe("http://feeds.snocountry.net/getSnowReport.php?apiKey=***&states=vt&output=json");
    expect(redactUrl(OPEN_METEO)).toBe(
      "https://customer-api.open-meteo.com/v1/forecast?latitude=40&daily=snowfall_sum&apikey=***&timezone=auto",
    );
    expect(redactUrl("https://api.weather.gov/points/44.5,-72.8")).toBe("https://api.weather.gov/points/44.5,-72.8");
  });

  it("never puts the key into an HttpError message or errorText, but keeps the raw url on the instance", () => {
    const e = new HttpError(502, SNOCOUNTRY, "upstream down");
    expect(e.message).not.toContain("SECRET123");
    expect(e.message).toContain("HTTP 502 for http://feeds.snocountry.net/getSnowReport.php?apiKey=***");
    expect(e.url).toBe(SNOCOUNTRY);
    expect(errorText(new Error(`timeout for ${OPEN_METEO}`))).not.toContain("om_SECRET");
  });
});

describe("runWithDeadline", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("cancels an in-flight fetch when the deadline aborts and does not retry", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: { signal?: AbortSignal }) => {
        calls++;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }),
    );
    const ac = new AbortController();
    const started = Date.now();
    const p = runWithDeadline(ac.signal, () => fetchWithTimeout("https://example.test/slow", { timeoutMs: 60_000 }));
    setTimeout(() => ac.abort(), 20);
    await expect(p).rejects.toMatchObject({ name: "AbortError" });
    expect(Date.now() - started).toBeLessThan(5_000);
    expect(calls).toBe(1); // no second attempt once the chain is cancelled
  });

  it("refuses to start a request once the deadline has already passed", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const ac = new AbortController();
    ac.abort();
    await expect(runWithDeadline(ac.signal, () => fetchWithTimeout("https://example.test/x"))).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(f).not.toHaveBeenCalled();
  });
});
