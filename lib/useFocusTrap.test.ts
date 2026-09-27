import { describe, expect, it } from "vitest";
import {
  TRAP_KEEP_ATTR,
  TrapStack,
  collectInertTargets,
  nextTabTarget,
  resolveFocusTrapOptions,
  resolveReturnTarget,
  supportsInert,
  type InertNode,
  type ReturnFocusCandidate,
} from "./useFocusTrap";

// No jsdom in the toolchain, so the DOM-shaped helpers are exercised with
// tiny fake trees. The hook itself is a thin effect over these helpers.

describe("nextTabTarget", () => {
  const items = ["a", "b", "c"] as const;

  it("returns null when there is nothing to focus", () => {
    expect(nextTabTarget([], null, false, true)).toBeNull();
  });

  it("wraps forward from the last item to the first", () => {
    expect(nextTabTarget(items, "c", false, true)).toBe("a");
  });

  it("wraps backward from the first item to the last", () => {
    expect(nextTabTarget(items, "a", true, true)).toBe("c");
  });

  it("lets the browser move focus between inner items", () => {
    expect(nextTabTarget(items, "b", false, true)).toBeNull();
    expect(nextTabTarget(items, "b", true, true)).toBeNull();
  });

  it("pulls focus back inside when it escaped the container", () => {
    expect(nextTabTarget(items, null, false, false)).toBe("a");
    expect(nextTabTarget(items, null, true, false)).toBe("c");
  });

  it("wraps from the container itself (or a tabindex=-1 element inside it)", () => {
    // After the fallback focus lands on the dialog, or a click on blank
    // dialog area, the active element is inside but not a Tab stop.
    // Shift+Tab must go to the last item, Tab to the first, so the
    // aria-hidden fallback path cannot let focus leave the modal.
    expect(nextTabTarget(items, "container", true, true)).toBe("c");
    expect(nextTabTarget(items, "container", false, true)).toBe("a");
  });
});

describe("resolveFocusTrapOptions", () => {
  it("keeps the legacy positional call sites on Tab wrap only", () => {
    // useFocusTrap(ref, open) and useFocusTrap(ref, open, initialRef)
    // predate inert and scroll lock; InstallSheet's click-to-close
    // backdrop is a sibling of the trapped panel and would go inert.
    const bare = resolveFocusTrapOptions(undefined);
    expect(bare).toMatchObject({ modal: true, inert: false, lockScroll: false, autoFocus: true });
    expect(bare.initialFocusRef).toBeUndefined();
    const initial = { current: null };
    const withRef = resolveFocusTrapOptions(initial);
    expect(withRef.initialFocusRef).toBe(initial);
    expect(withRef).toMatchObject({ modal: true, inert: false, lockScroll: false });
  });

  it("gives an options object the full modal by default", () => {
    expect(resolveFocusTrapOptions({})).toMatchObject({
      modal: true,
      inert: true,
      lockScroll: true,
      autoFocus: true,
    });
  });

  it("derives inert and scroll lock from modal unless overridden", () => {
    expect(resolveFocusTrapOptions({ modal: false })).toMatchObject({
      modal: false,
      inert: false,
      lockScroll: false,
    });
    expect(resolveFocusTrapOptions({ modal: true, inert: false })).toMatchObject({
      modal: true,
      inert: false,
      lockScroll: true,
    });
    expect(resolveFocusTrapOptions({ modal: false, lockScroll: true })).toMatchObject({
      modal: false,
      inert: false,
      lockScroll: true,
    });
  });

  it("passes the callbacks and refs through", () => {
    const onEscape = () => {};
    const initialFocusRef = { current: null };
    const returnFocusRef = { current: null };
    const r = resolveFocusTrapOptions({ onEscape, initialFocusRef, returnFocusRef, autoFocus: false });
    expect(r.onEscape).toBe(onEscape);
    expect(r.initialFocusRef).toBe(initialFocusRef);
    expect(r.returnFocusRef).toBe(returnFocusRef);
    expect(r.autoFocus).toBe(false);
  });
});

function candidate(attrs: Record<string, string> = {}, isConnected = true): ReturnFocusCandidate {
  return { isConnected, getAttribute: (n) => attrs[n] ?? null };
}

describe("resolveReturnTarget", () => {
  it("prefers an explicit return target that is still in the document", () => {
    const explicit = candidate();
    const recorded = candidate();
    expect(resolveReturnTarget(explicit, recorded)).toBe(explicit);
  });

  it("falls back to the recorded element when the explicit one is gone", () => {
    const recorded = candidate();
    expect(resolveReturnTarget(candidate({}, false), recorded)).toBe(recorded);
    expect(resolveReturnTarget(null, recorded)).toBe(recorded);
  });

  it("never returns focus to a hidden or tabindex=-1 helper", () => {
    // The iOS keyboard primer is aria-hidden + tabindex=-1 and is
    // removed before close; a hidden element must not be the target.
    expect(resolveReturnTarget(null, candidate({ "aria-hidden": "true" }))).toBeNull();
    expect(resolveReturnTarget(null, candidate({ tabindex: "-1" }))).toBeNull();
    expect(resolveReturnTarget(null, candidate({}, false))).toBeNull();
    expect(resolveReturnTarget(null, null)).toBeNull();
  });
});

type FakeEl = InertNode & { name: string; attrs: Set<string>; kids: FakeEl[] };

function el(name: string, attrs: string[] = [], kids: FakeEl[] = []): FakeEl {
  const node: FakeEl = {
    name,
    attrs: new Set(attrs),
    kids,
    parentElement: null,
    get children() {
      return node.kids;
    },
    hasAttribute(a: string) {
      return node.attrs.has(a);
    },
  };
  for (const k of kids) k.parentElement = node;
  return node;
}

describe("collectInertTargets", () => {
  it("collects siblings of the container and of every ancestor up to the root", () => {
    const dialog = el("dialog");
    const header = el("header");
    const map = el("map");
    const tree = el("body", [], [header, el("main", [], [map, dialog]), el("footer")]);
    const names = collectInertTargets(dialog, tree).map((n) => n.name);
    expect(names.sort()).toEqual(["footer", "header", "map"]);
  });

  it("never includes the container, its ancestors or the root", () => {
    const dialog = el("dialog");
    const wrapper = el("wrapper", [], [dialog]);
    const body = el("body", [], [wrapper]);
    expect(collectInertTargets(dialog, body)).toEqual([]);
  });

  it("skips elements that opted out or are already inert", () => {
    const dialog = el("dialog");
    const backdrop = el("backdrop", [TRAP_KEEP_ATTR]);
    const alreadyInert = el("toast", ["inert"]);
    const sidebar = el("sidebar");
    const body = el("body", [], [backdrop, alreadyInert, sidebar, dialog]);
    expect(collectInertTargets(dialog, body).map((n) => n.name)).toEqual(["sidebar"]);
  });

  it("walks to the document top when no root is given", () => {
    const dialog = el("dialog");
    const other = el("other");
    const html = el("html", [], [el("head"), el("body", [], [other, dialog])]);
    void html;
    expect(collectInertTargets(dialog, null).map((n) => n.name).sort()).toEqual(["head", "other"]);
  });
});

describe("TrapStack", () => {
  it("only the most recently opened trap is on top", () => {
    const s = new TrapStack<string>();
    s.push("search", true);
    s.push("filters", true);
    expect(s.isTop("filters")).toBe(true);
    expect(s.isTop("search")).toBe(false);
    s.remove("filters");
    expect(s.isTop("search")).toBe(true);
    s.remove("search");
    expect(s.isTop("search")).toBe(false);
    expect(s.size).toBe(0);
  });

  it("locks scroll once and restores it only after the last modal closes", () => {
    const s = new TrapStack<string>();
    let lockCalls = 0;
    const restored: string[] = [];
    const lock = () => {
      lockCalls += 1;
      return "auto";
    };
    s.push("a", true, lock);
    s.push("b", true, lock);
    expect(lockCalls).toBe(1);
    s.remove("b", (v) => restored.push(v));
    expect(restored).toEqual([]);
    s.remove("a", (v) => restored.push(v));
    expect(restored).toEqual(["auto"]);
  });

  it("does not lock scroll for non-modal traps", () => {
    const s = new TrapStack<string>();
    let lockCalls = 0;
    s.push("popover", false, () => {
      lockCalls += 1;
      return "";
    });
    expect(lockCalls).toBe(0);
    expect(s.modalCount()).toBe(0);
    s.remove("popover");
  });

  it("carries a structured lock state (overflow + padding) through to restore", () => {
    const s = new TrapStack<string, { overflow: string; paddingRight: string }>();
    const restored: Array<{ overflow: string; paddingRight: string }> = [];
    s.push("a", true, () => ({ overflow: "auto", paddingRight: "" }));
    s.remove("a", (v) => restored.push(v));
    expect(restored).toEqual([{ overflow: "auto", paddingRight: "" }]);
  });

  it("removing an id that is not on the stack is harmless", () => {
    const s = new TrapStack<string>();
    s.push("a", true, () => "x");
    s.remove("ghost");
    expect(s.isTop("a")).toBe(true);
    expect(s.modalCount()).toBe(1);
  });
});

describe("supportsInert", () => {
  it("detects the inert property on a prototype", () => {
    expect(supportsInert({ inert: false })).toBe(true);
    expect(supportsInert({})).toBe(false);
    expect(supportsInert(undefined)).toBe(false);
  });
});
