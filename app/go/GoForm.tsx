"use client";

// The /go question form. A plain GET form so it works without JavaScript
// (the URL is the state); with JavaScript every change navigates
// immediately and "Use my location" fills lat/lng from the browser.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { PassFamily } from "@/lib/passAccess";
import type { GoState } from "@/lib/saturday/url";
import { goPath } from "@/lib/saturday/url";

type ProductOption = { productKey: string; product: string };

type Props = {
  state: GoState;
  cities: Array<{ code: string; label: string }>;
  families: Array<{ code: PassFamily; label: string }>;
  productsByFamily: Record<PassFamily, ProductOption[]>;
  /** True when the current URL asked for a city we do not know. */
  unknownCity: boolean;
};

const MAX_OPTIONS = [2, 3, 4, 5, 6, 8, 10, 12];

const selectClass =
  "block min-h-11 w-full rounded-lg border border-wn-charcoal/20 bg-white px-3 text-base text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-sky";
const labelClass = "mb-1 block text-[11px] font-bold uppercase tracking-wide text-wn-charcoal/60";

export default function GoForm({ state, cities, families, productsByFamily, unknownCity }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState<GoState>(state);
  const [geoStatus, setGeoStatus] = useState<"idle" | "asking" | "denied">("idle");

  // The URL is the source of truth: when the server re-renders with a
  // new state (back button, share link, our own navigation) the draft
  // follows it. Reset-during-render, not an effect, so there is no
  // one-frame flash of the old selection.
  const [syncedFor, setSyncedFor] = useState<GoState>(state);
  if (syncedFor !== state) {
    setSyncedFor(state);
    setDraft(state);
  }

  function navigate(next: GoState) {
    setDraft(next);
    startTransition(() => {
      router.push(goPath(next), { scroll: false });
    });
  }

  function onCityChange(code: string) {
    if (code === "geo") {
      if (!("geolocation" in navigator)) {
        setGeoStatus("denied");
        return;
      }
      setGeoStatus("asking");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoStatus("idle");
          navigate({
            ...draft,
            city: "geo",
            lat: pos.coords.latitude.toFixed(4),
            lng: pos.coords.longitude.toFixed(4),
          });
        },
        () => setGeoStatus("denied"),
        { maximumAge: 600_000, timeout: 10_000 },
      );
      return;
    }
    navigate({ ...draft, city: code, lat: null, lng: null });
  }

  function onPassChange(value: string) {
    const pass = families.some((f) => f.code === value) ? (value as PassFamily) : null;
    navigate({ ...draft, pass, product: null });
  }

  const products = draft.pass ? productsByFamily[draft.pass] : [];

  return (
    <form
      method="get"
      action="/go"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(draft);
      }}
      aria-busy={pending}
    >
      <div className="lg:col-span-1">
        <label htmlFor="go-city" className={labelClass}>
          From
        </label>
        <select
          id="go-city"
          name="city"
          value={draft.city}
          onChange={(e) => onCityChange(e.target.value)}
          className={selectClass}
        >
          {unknownCity && (
            <option value="" disabled>
              Pick a city
            </option>
          )}
          {cities.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
          <option value="geo">Use my location</option>
        </select>
        {draft.city === "geo" && draft.lat && draft.lng && (
          <>
            <input type="hidden" name="lat" value={draft.lat} />
            <input type="hidden" name="lng" value={draft.lng} />
          </>
        )}
        {geoStatus === "asking" && <p className="mt-1 text-xs text-wn-charcoal/60">Finding your location…</p>}
        {geoStatus === "denied" && (
          <p className="mt-1 text-xs text-red-700">Location not available. Pick a city instead.</p>
        )}
      </div>

      <div>
        <label htmlFor="go-pass" className={labelClass}>
          Pass
        </label>
        <select
          id="go-pass"
          name="pass"
          value={draft.pass ?? "any"}
          onChange={(e) => onPassChange(e.target.value)}
          className={selectClass}
        >
          <option value="any">Any pass or lift ticket</option>
          {families.map((f) => (
            <option key={f.code} value={f.code}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="go-product" className={labelClass}>
          Product
        </label>
        <select
          id="go-product"
          name="product"
          value={draft.product ?? ""}
          onChange={(e) => navigate({ ...draft, product: e.target.value || null })}
          disabled={!draft.pass}
          className={`${selectClass} disabled:bg-wn-charcoal/5 disabled:text-wn-charcoal/50`}
        >
          <option value="">{draft.pass ? "Any product" : "Pick a pass first"}</option>
          {products.map((p) => (
            <option key={p.productKey} value={p.productKey}>
              {p.product}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="go-max" className={labelClass}>
          Max drive
        </label>
        <select
          id="go-max"
          name="max"
          value={String(draft.max)}
          onChange={(e) => navigate({ ...draft, max: Number(e.target.value) })}
          className={selectClass}
        >
          {MAX_OPTIONS.map((h) => (
            <option key={h} value={h}>
              {h} h
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className={labelClass}>Day</span>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-wn-charcoal/5 p-1" role="radiogroup" aria-label="Day">
          {(["sat", "sun"] as const).map((d) => {
            const active = draft.day === d;
            return (
              <label
                key={d}
                className={`flex min-h-10 cursor-pointer items-center justify-center rounded-md text-sm font-semibold ${
                  active ? "bg-white text-wn-navy shadow-sm" : "text-wn-charcoal/60"
                }`}
              >
                <input
                  type="radio"
                  name="day"
                  value={d}
                  checked={active}
                  onChange={() => navigate({ ...draft, day: d })}
                  className="sr-only"
                />
                {d === "sat" ? "Saturday" : "Sunday"}
              </label>
            );
          })}
        </div>
      </div>

      <div className="sm:col-span-2 lg:col-span-5">
        <button
          type="submit"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-wn-navy px-4 text-sm font-semibold text-white hover:bg-wn-navy/90 disabled:opacity-60 sm:w-auto"
          disabled={pending}
        >
          {pending ? "Ranking…" : "Show picks"}
        </button>
      </div>
    </form>
  );
}
