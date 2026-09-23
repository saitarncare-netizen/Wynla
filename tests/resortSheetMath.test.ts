import { describe, expect, it } from "vitest";
import {
  bodyGestureFor,
  bottomStackPx,
  clampDragHeight,
  directionsUrl,
  formatRelativeAge,
  heroHeightFor,
  HERO_PX,
  mapBottomPadding,
  mobileChromeTotal,
  nearestSnap,
  PEEK_PX,
  resolveSnap,
  snapHeights,
  TITLE_BAR_PX,
  velocityFrom,
} from "@/components/Map/ResortSheetMath";

const IPHONE = 812;

describe("snapHeights", () => {
  it("uses peek 140 / half 52% / full 92% on an iPhone 13", () => {
    const s = snapHeights(IPHONE);
    expect(s.peek).toBe(PEEK_PX);
    expect(s.half).toBe(Math.round(IPHONE * 0.52));
    expect(s.full).toBe(Math.round(IPHONE * 0.92));
    // A map sliver stays visible at full.
    expect(IPHONE - s.full).toBeGreaterThanOrEqual(60);
  });
  it("keeps half tall enough for the stat row on short viewports", () => {
    const s = snapHeights(480);
    expect(s.half).toBeGreaterThanOrEqual(PEEK_PX + 120);
    expect(s.half).toBeLessThan(s.full);
  });
});

describe("resolveSnap", () => {
  const s = snapHeights(IPHONE);
  it("slow release picks the nearest snap", () => {
    expect(resolveSnap(s.half + 20, 0, "half", s)).toBe("half");
    expect(resolveSnap(s.full - 30, 0, "half", s)).toBe("full");
    expect(resolveSnap(s.peek + 10, 0.1, "peek", s)).toBe("peek");
  });
  it("flick down steps one snap lower and closes from peek", () => {
    expect(resolveSnap(s.full - 40, 0.9, "full", s)).toBe("half");
    expect(resolveSnap(s.half - 20, 0.9, "half", s)).toBe("peek");
    expect(resolveSnap(s.peek - 10, 0.9, "peek", s)).toBe("closed");
  });
  it("flick up steps one snap higher and caps at full", () => {
    expect(resolveSnap(s.peek + 30, -0.9, "peek", s)).toBe("half");
    expect(resolveSnap(s.half + 30, -0.9, "half", s)).toBe("full");
    expect(resolveSnap(s.full, -0.9, "full", s)).toBe("full");
  });
  it("a long slow drag past a snap does not go backwards on a flick", () => {
    // Dragged from peek up past half, then flicked up: lands on full.
    expect(resolveSnap(s.half + 40, -0.9, "peek", s)).toBe("full");
  });
  it("dropping below half of peek closes", () => {
    expect(resolveSnap(40, 0, "peek", s)).toBe("closed");
  });
});

describe("clampDragHeight", () => {
  const s = snapHeights(IPHONE);
  it("never goes negative and rubber-bands past full", () => {
    expect(clampDragHeight(-50, s)).toBe(0);
    expect(clampDragHeight(s.full + 100, s)).toBeLessThan(s.full + 30);
    expect(clampDragHeight(s.full + 100, s)).toBeGreaterThan(s.full);
  });
});

describe("hero collapse + map padding", () => {
  const s = snapHeights(IPHONE);
  it("hero stays full-size at peek and half, title bar at full", () => {
    expect(heroHeightFor(s.peek, s)).toBe(HERO_PX);
    expect(heroHeightFor(s.half, s)).toBe(HERO_PX);
    expect(heroHeightFor(s.full, s)).toBe(TITLE_BAR_PX);
    const mid = heroHeightFor((s.half + s.full) / 2, s);
    expect(mid).toBeGreaterThan(TITLE_BAR_PX);
    expect(mid).toBeLessThan(HERO_PX);
  });
  it("pads the map by the sheet up to half, then holds", () => {
    expect(mapBottomPadding(s.peek, s)).toBe(s.peek);
    expect(mapBottomPadding(s.half, s)).toBe(s.half);
    expect(mapBottomPadding(s.full, s)).toBe(s.half);
  });
  it("nearestSnap", () => {
    expect(nearestSnap(0, s)).toBe("peek");
    expect(nearestSnap(s.full + 200, s)).toBe("full");
  });
});

describe("bodyGestureFor (Google nested-scroll rule)", () => {
  it("below full any move drags the sheet", () => {
    expect(bodyGestureFor("peek", -10, 0)).toBe("drag");
    expect(bodyGestureFor("half", -10, 40)).toBe("drag");
    expect(bodyGestureFor("half", 10, 40)).toBe("drag");
  });
  it("at full: up scrolls, down drags only from the top", () => {
    expect(bodyGestureFor("full", -10, 0)).toBe("scroll");
    expect(bodyGestureFor("full", 10, 120)).toBe("scroll");
    expect(bodyGestureFor("full", 10, 0)).toBe("drag");
  });
});

describe("velocityFrom", () => {
  it("reads px/ms from a ~60 ms window", () => {
    const v = velocityFrom([
      { y: 0, t: 0 },
      { y: 30, t: 30 },
      { y: 60, t: 60 },
      { y: 90, t: 90 },
    ]);
    expect(v).toBeCloseTo(1, 1);
  });
  it("is 0 with fewer than two samples or no time", () => {
    expect(velocityFrom([{ y: 5, t: 5 }])).toBe(0);
    expect(velocityFrom([{ y: 0, t: 5 }, { y: 50, t: 5 }])).toBe(0);
  });
});

describe("formatRelativeAge", () => {
  const now = new Date("2026-09-23T12:00:00Z");
  it("formats minutes, hours and days", () => {
    expect(formatRelativeAge("2026-09-23T11:59:40Z", now)).toBe("just now");
    expect(formatRelativeAge("2026-09-23T11:48:00Z", now)).toBe("12m ago");
    expect(formatRelativeAge("2026-09-23T09:00:00Z", now)).toBe("3h ago");
    expect(formatRelativeAge("2026-09-20T12:00:00Z", now)).toBe("3d ago");
  });
  it("returns null for missing or bad input", () => {
    expect(formatRelativeAge(null, now)).toBeNull();
    expect(formatRelativeAge("nope", now)).toBeNull();
  });
});

describe("directionsUrl", () => {
  it("builds a Google Maps driving link", () => {
    expect(directionsUrl(44.5, -72.78)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=44.50000,-72.78000&travelmode=driving",
    );
  });
});

describe("mobile chrome budget", () => {
  it("stays under 170 px on a 375 x 812 phone with every row showing", () => {
    expect(mobileChromeTotal({ secondary: true, banner: true })).toBeLessThan(170);
  });
  it("is 92 px with only the two mandatory rows", () => {
    expect(mobileChromeTotal({ secondary: false, banner: false })).toBe(92);
  });
});

describe("bottomStackPx", () => {
  it("keeps the attribution band clear by default", () => {
    expect(bottomStackPx({ installNudgeVisible: false, sheetHeight: null, sheetSnap: null })).toBe(40);
  });
  it("rises above the install nudge", () => {
    expect(bottomStackPx({ installNudgeVisible: true, sheetHeight: null, sheetSnap: null })).toBe(148);
  });
  it("sits on the shoulder of a peek sheet", () => {
    expect(bottomStackPx({ installNudgeVisible: true, sheetHeight: 140, sheetSnap: "peek" })).toBe(152);
  });
  it("ignores the sheet at half and full (pills hide there)", () => {
    expect(bottomStackPx({ installNudgeVisible: false, sheetHeight: 420, sheetSnap: "half" })).toBe(40);
  });
});
