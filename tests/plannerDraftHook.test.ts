// @vitest-environment jsdom

// usePlannerDraftSlugs drives the resort sheet's gold button ("Plan trip"
// / "Add to trip" / "View trip"). The planner writes its draft to
// sessionStorage in the SAME tab, where the browser fires no `storage`
// event, so the hook depends on writeStorage's own change event. These
// tests pin that wiring and the empty / expired cases.

import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { SESSION_DRAFT_KEY, usePlannerDraftSlugs, writeStorage } from "@/lib/plannerDraft";

function draft(slugs: string[], savedAt = Date.now()) {
  return JSON.stringify({ stops: slugs.map((slug) => ({ slug, days: 1 })), draftName: "", savedAt });
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("usePlannerDraftSlugs", () => {
  it("is empty when no trip is being planned", () => {
    const { result } = renderHook(() => usePlannerDraftSlugs());
    expect(result.current).toEqual([]);
  });

  it("reads the draft already in sessionStorage", () => {
    window.sessionStorage.setItem(SESSION_DRAFT_KEY, draft(["vail", "beaver-creek"]));
    const { result } = renderHook(() => usePlannerDraftSlugs());
    expect(result.current).toEqual(["vail", "beaver-creek"]);
  });

  it("follows same-tab writes from the planner, including the clear after save", () => {
    const { result } = renderHook(() => usePlannerDraftSlugs());
    act(() => writeStorage("session", SESSION_DRAFT_KEY, draft(["vail"])));
    expect(result.current).toEqual(["vail"]);
    act(() => writeStorage("session", SESSION_DRAFT_KEY, draft(["vail", "aspen"])));
    expect(result.current).toEqual(["vail", "aspen"]);
    act(() => writeStorage("session", SESSION_DRAFT_KEY, null));
    expect(result.current).toEqual([]);
  });

  it("ignores an expired draft", () => {
    window.sessionStorage.setItem(SESSION_DRAFT_KEY, draft(["vail"], Date.now() - 25 * 60 * 60 * 1000));
    const { result } = renderHook(() => usePlannerDraftSlugs());
    expect(result.current).toEqual([]);
  });
});
