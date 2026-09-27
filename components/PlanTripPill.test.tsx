// @vitest-environment jsdom

// Render tests for the resort page hero's gold trip pill: it must say
// what the map sheet's ActionBar says for the same resort (Plan trip /
// Add to trip / View trip, from this tab's planner draft), always link
// with ?add=, follow the closed-mountain rule, and hydrate from the
// server's "Plan trip" to the draft's label without a mismatch.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";
import Icon from "@/components/icons/Icon";
import { SESSION_DRAFT_KEY, writeStorage } from "@/lib/plannerDraft";
import PlanTripPill from "./PlanTripPill";

// Written the way the planner writes it (writeStorage also fires the
// same-tab change event the pill listens for).
function setDraft(slugs: string[]) {
  writeStorage(
    "session",
    SESSION_DRAFT_KEY,
    JSON.stringify({ stops: slugs.map((slug) => ({ slug, days: 1 })), draftName: "", savedAt: Date.now() }),
  );
}

// The svg body of a named icon, to tell check from trips in the pill.
function iconMarkup(name: "check" | "trips"): string {
  const host = document.createElement("div");
  host.innerHTML = renderToString(<Icon name={name} />);
  return host.querySelector("svg")!.innerHTML;
}

beforeEach(() => window.sessionStorage.clear());
afterEach(cleanup);

describe("PlanTripPill", () => {
  it("says Plan trip with no draft and links with ?add=, never ?route=", () => {
    render(<PlanTripPill slug="mt-rose" name="Mt. Rose" closed={false} />);
    const link = screen.getByRole("link", { name: "Plan trip to Mt. Rose" });
    expect(link.textContent).toBe("Plan trip");
    expect(link.getAttribute("href")).toBe("/?plan=1&add=mt-rose");
    expect(link.querySelector("svg")!.innerHTML).toBe(iconMarkup("trips"));
  });

  it("says Add to trip when another mountain is being planned", () => {
    setDraft(["aspen-snowmass"]);
    render(<PlanTripPill slug="vail" name="Vail" closed={false} />);
    const link = screen.getByRole("link", { name: "Add to trip: Vail" });
    expect(link.textContent).toBe("Add to trip");
    expect(link.getAttribute("href")).toBe("/?plan=1&add=vail");
  });

  it("says View trip with a check when the resort is already a stop", () => {
    setDraft(["aspen-snowmass", "vail"]);
    render(<PlanTripPill slug="vail" name="Vail" closed={false} />);
    const link = screen.getByRole("link", { name: "View trip with Vail" });
    expect(link.textContent).toBe("View trip");
    expect(link.querySelector("svg")!.innerHTML).toBe(iconMarkup("check"));
  });

  it("follows a draft change made later in this tab", () => {
    render(<PlanTripPill slug="vail" name="Vail" closed={false} />);
    expect(screen.getByRole("link").textContent).toBe("Plan trip");
    act(() => setDraft(["vail"]));
    expect(screen.getByRole("link").textContent).toBe("View trip");
  });

  it("hides on a permanently closed mountain unless it is already in the trip", () => {
    const { container, rerender } = render(<PlanTripPill slug="old-hill" name="Old Hill" closed />);
    expect(container.innerHTML).toBe("");
    setDraft(["vail"]);
    rerender(<PlanTripPill slug="old-hill" name="Old Hill" closed />);
    expect(container.innerHTML).toBe("");
    setDraft(["old-hill"]);
    rerender(<PlanTripPill slug="old-hill" name="Old Hill" closed />);
    expect(screen.getByRole("link", { name: "View trip with Old Hill" })).toBeTruthy();
  });

  describe("server render + hydration", () => {
    async function hydrate(ui: ReactElement) {
      const html = renderToString(ui);
      const host = document.createElement("div");
      host.innerHTML = html;
      document.body.appendChild(host);
      const onRecoverableError = vi.fn();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      let root: Root | undefined;
      await act(async () => {
        root = hydrateRoot(host, ui, { onRecoverableError });
      });
      const errors = consoleError.mock.calls;
      consoleError.mockRestore();
      return {
        html,
        host,
        onRecoverableError,
        errors,
        done: () => {
          act(() => root!.unmount());
          host.remove();
        },
      };
    }

    it("renders Plan trip on the server and switches to the draft label with no mismatch", async () => {
      setDraft(["vail"]);
      const out = await hydrate(<PlanTripPill slug="vail" name="Vail" closed={false} />);
      // The server has no sessionStorage: always the no-draft label.
      expect(out.html).toContain("Plan trip");
      expect(out.html).not.toContain("View trip");
      expect(out.host.textContent).toBe("View trip");
      expect(out.onRecoverableError).not.toHaveBeenCalled();
      expect(out.errors).toEqual([]);
      out.done();
    });

    it("renders nothing on the server for a closed mountain, then View trip when it is a stop", async () => {
      setDraft(["old-hill"]);
      const out = await hydrate(<PlanTripPill slug="old-hill" name="Old Hill" closed />);
      expect(out.html).toBe("");
      expect(out.host.textContent).toBe("View trip");
      expect(out.onRecoverableError).not.toHaveBeenCalled();
      expect(out.errors).toEqual([]);
      out.done();
    });
  });
});
