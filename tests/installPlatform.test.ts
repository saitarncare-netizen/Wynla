// Platform detection for the install prompt (components/InstallPrompt.tsx).
// Runs in the node environment: each case installs a fake window/navigator
// with the user agent under test and tears it down afterwards.

import { afterEach, describe, expect, it } from "vitest";
import { detectInstallPlatform } from "@/components/InstallPrompt";

type FakeEnv = {
  ua: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayModeStandalone?: boolean;
};

function installFakeWindow({
  ua,
  maxTouchPoints = 0,
  standalone = false,
  displayModeStandalone = false,
}: FakeEnv) {
  const g = globalThis as Record<string, unknown>;
  g.window = {
    matchMedia: (q: string) => ({
      matches: displayModeStandalone && q.includes("standalone"),
    }),
    navigator: { standalone },
  };
  g.navigator = { userAgent: ua, maxTouchPoints, standalone };
}

afterEach(() => {
  const g = globalThis as Record<string, unknown>;
  delete g.window;
  delete g.navigator;
});

const IPHONE_SAFARI_26 =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1";
const IPHONE_TIKTOK =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_40.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US BytedanceWebview/d8a21c6";
const ANDROID_INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
const DESKTOP_EDGE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0";
const DESKTOP_FIREFOX =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
const IPAD_AS_MAC =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const MAC_SAFARI_16 =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15";
const ANDROID_FIREFOX =
  "Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0";

describe("detectInstallPlatform", () => {
  it("returns the neutral default when there is no window (SSR)", () => {
    expect(detectInstallPlatform().platform).toBe("other");
  });

  it("reports installed when running in standalone display mode", () => {
    installFakeWindow({ ua: IPHONE_SAFARI_26, standalone: true });
    expect(detectInstallPlatform().platform).toBe("installed");
    installFakeWindow({ ua: ANDROID_CHROME, displayModeStandalone: true });
    expect(detectInstallPlatform().platform).toBe("installed");
  });

  it("classifies iOS Safari with the iOS major version", () => {
    installFakeWindow({ ua: IPHONE_SAFARI_26 });
    const r = detectInstallPlatform();
    expect(r.platform).toBe("ios");
    expect(r.iosBrowser).toBe("safari");
    expect(r.iosMajor).toBe(26);
    expect(r.isIpad).toBe(false);
  });

  it("treats Chrome on iOS as installable (iOS 16.4+), not excluded", () => {
    installFakeWindow({ ua: IPHONE_CHROME });
    const r = detectInstallPlatform();
    expect(r.platform).toBe("ios");
    expect(r.iosBrowser).toBe("chrome");
  });

  it("recognises iPadOS masquerading as a Mac via touch points", () => {
    installFakeWindow({ ua: IPAD_AS_MAC, maxTouchPoints: 5 });
    const r = detectInstallPlatform();
    expect(r.platform).toBe("ios");
    expect(r.isIpad).toBe(true);
  });

  it("detects in-app browsers before the iOS / Android split", () => {
    installFakeWindow({ ua: IPHONE_TIKTOK });
    expect(detectInstallPlatform()).toMatchObject({ platform: "in-app", inAppName: "TikTok" });
    installFakeWindow({ ua: ANDROID_INSTAGRAM });
    expect(detectInstallPlatform()).toMatchObject({
      platform: "in-app",
      inAppName: "Instagram",
      isAndroid: true,
    });
  });

  it("classifies Chromium on Android and desktop", () => {
    installFakeWindow({ ua: ANDROID_CHROME });
    expect(detectInstallPlatform()).toMatchObject({ platform: "chromium", isAndroid: true });
    installFakeWindow({ ua: DESKTOP_EDGE });
    expect(detectInstallPlatform()).toMatchObject({ platform: "chromium", isAndroid: false });
  });

  it("marks installed and in-app as canInstall false / true respectively", () => {
    installFakeWindow({ ua: ANDROID_CHROME, displayModeStandalone: true });
    expect(detectInstallPlatform().canInstall).toBe(false);
    installFakeWindow({ ua: IPHONE_TIKTOK });
    expect(detectInstallPlatform().canInstall).toBe(true);
  });

  it("treats non-Chromium Android browsers as installable from their menu", () => {
    installFakeWindow({ ua: ANDROID_FIREFOX });
    expect(detectInstallPlatform()).toMatchObject({
      platform: "other",
      isAndroid: true,
      canInstall: true,
      macSafariDock: false,
    });
  });

  it("reports no install for desktop Firefox and Safari before 17", () => {
    installFakeWindow({ ua: DESKTOP_FIREFOX });
    expect(detectInstallPlatform()).toMatchObject({ platform: "other", canInstall: false });
    installFakeWindow({ ua: MAC_SAFARI_16 });
    expect(detectInstallPlatform()).toMatchObject({
      platform: "other",
      canInstall: false,
      macSafariDock: false,
    });
  });

  it("offers Add to Dock on Safari 17+ for macOS (no touch points)", () => {
    installFakeWindow({ ua: IPAD_AS_MAC, maxTouchPoints: 0 });
    expect(detectInstallPlatform()).toMatchObject({
      platform: "other",
      canInstall: true,
      macSafariDock: true,
      isIpad: false,
    });
  });
});
