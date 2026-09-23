// @vitest-environment jsdom

// Render tests for the ui primitives: the a11y wiring (roles, aria ids,
// disabled + busy states) that a visual review does not catch.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Button from "./Button";
import Chip from "./Chip";
import Field from "./Field";
import Input from "./Input";
import EmptyState from "./EmptyState";
import Notice from "./Notice";
import PageHeader from "./PageHeader";
import Section from "./Section";
import Skeleton, { SkeletonPage } from "./Skeleton";

afterEach(cleanup);

describe("Button", () => {
  it("renders a button by default and a link with href", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveProperty("type", "button");
    render(<Button href="/trips">Trips</Button>);
    expect(screen.getByRole("link", { name: "Trips" }).getAttribute("href")).toBe("/trips");
  });

  it("disables and announces busy while loading, keeping the label", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveProperty("disabled", true);
    expect(btn.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps the 44 px phone target on md and 36 px on sm", () => {
    render(
      <>
        <Button>md</Button>
        <Button size="sm">sm</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "md" }).className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: "sm" }).className).toContain("min-h-9");
  });
});

describe("Chip", () => {
  it("is a pressed toggle when it has onClick", () => {
    render(
      <Chip selected onClick={() => {}}>
        Ikon
      </Chip>,
    );
    expect(screen.getByRole("button", { name: "Ikon" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("is a link with aria-current when it has href", () => {
    render(
      <Chip href="/state/co" selected>
        Colorado
      </Chip>,
    );
    expect(screen.getByRole("link", { name: "Colorado" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("Field + Input", () => {
  it("links label, hint and error to the control", () => {
    render(
      <Field label="Email" hint="One email, no spam." error="That address is not valid.">
        {(a11y) => <Input {...a11y} type="email" />}
      </Field>,
    );
    const input = screen.getByLabelText("Email");
    const described = input.getAttribute("aria-describedby") ?? "";
    expect(described.split(" ")).toHaveLength(2);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("That address is not valid.");
    expect(described).toContain(alert.id);
  });

  it("omits describedby when there is nothing to describe", () => {
    render(<Field label="Name">{(a11y) => <Input {...a11y} />}</Field>);
    const input = screen.getByLabelText("Name");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });
});

describe("Notice", () => {
  it("uses alert for danger and status otherwise", () => {
    render(
      <>
        <Notice tone="danger">Bad</Notice>
        <Notice tone="success">Good</Notice>
      </>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Bad");
    expect(screen.getByRole("status").textContent).toContain("Good");
  });
});

describe("EmptyState / Section / PageHeader", () => {
  it("renders title, body and action", () => {
    render(<EmptyState title="No trips yet" body="Plan one on the map." action={<Button href="/">Open the map</Button>} />);
    expect(screen.getByText("No trips yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open the map" })).toBeTruthy();
  });

  it("Section labels itself by its heading when it has an id", () => {
    render(
      <Section id="sources" title="Sources">
        <p>body</p>
      </Section>,
    );
    const section = document.getElementById("sources");
    expect(section?.getAttribute("aria-labelledby")).toBe("sources-title");
    expect(screen.getByRole("heading", { level: 2, name: "Sources" })).toBeTruthy();
  });

  it("PageHeader renders one h1 and an optional back link", () => {
    render(<PageHeader title="Pass deals" eyebrow="2026-27" back={{ href: "/guides", label: "Guides" }} />);
    expect(screen.getByRole("heading", { level: 1, name: "Pass deals" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Guides" }).getAttribute("href")).toBe("/guides");
  });
});

describe("Skeleton", () => {
  it("hides pieces from assistive tech and announces once at page level", () => {
    render(
      <SkeletonPage label="Loading trips">
        <Skeleton className="h-4 w-20" />
      </SkeletonPage>,
    );
    expect(screen.getByRole("status").textContent).toBe("Loading trips");
    // The main landmark survives while loading (the status role sits on
    // the hidden label, not on <main>).
    expect(screen.getByRole("main").getAttribute("aria-busy")).toBe("true");
    expect(document.querySelectorAll('[aria-hidden="true"]').length).toBe(1);
  });
});
