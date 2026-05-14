"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getPreferences,
  setOnboarded,
  setPreferences,
  type Preferences,
  type SkillLevel,
} from "@/lib/preferences";

// 3-question first-run wizard. Renders as a centered card with a
// semi-opaque navy backdrop. Non-dismissable (no click-outside,
// no ESC) — we want the user to either answer or explicitly Skip,
// so we don't accidentally lose the personalization signal.
//
// Step model is index-based (0..2). On finish we:
//   1. Save the answers to localStorage via setPreferences()
//   2. Set the onboarded flag so we don't show this again
//   3. Translate answers → URL params (?pass=… &from=…) and
//      router.replace() so the map filter chips reflect them
//   4. Animate the card out (opacity + slight translate) and
//      unmount via onFinished()

type Props = {
  onFinished: () => void;
};

type OriginChoice =
  | { kind: "city"; code: string; label: string }
  | { kind: "geo"; label: "Use my location" }
  | { kind: "skip"; label: "Set later" };

const SKILL_OPTIONS: ReadonlyArray<{
  value: SkillLevel;
  label: string;
  emoji: string;
}> = [
  { value: "beginner", label: "Beginner", emoji: "🟢" },
  { value: "intermediate", label: "Intermediate", emoji: "🔵" },
  { value: "advanced", label: "Advanced", emoji: "⚫" },
  { value: "any", label: "Any / mixed", emoji: "🤷" },
];

const PASS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "ikon", label: "Ikon" },
  { value: "epic", label: "Epic" },
  { value: "indy", label: "Indy" },
  { value: "mountain_collective", label: "Mountain Collective" },
];

// We pre-fill more origin buttons than the drive-time cache currently
// supports (only NYC/Boston/Philly/Hartford have cached routes). For
// the others we still save the preference; the map URL will fall back
// to NYC for now and we can backfill the cache later. This keeps the
// UI honest about the user's real intent without blocking onboarding.
const ORIGIN_OPTIONS: ReadonlyArray<OriginChoice> = [
  { kind: "city", code: "nyc", label: "NYC" },
  { kind: "city", code: "boston", label: "Boston" },
  { kind: "city", code: "philadelphia", label: "Philly" },
  { kind: "city", code: "hartford", label: "Hartford" },
  { kind: "city", code: "denver", label: "Denver" },
  { kind: "city", code: "slc", label: "SLC" },
  { kind: "city", code: "sf", label: "San Francisco" },
  { kind: "city", code: "seattle", label: "Seattle" },
  { kind: "city", code: "chicago", label: "Chicago" },
  { kind: "geo", label: "Use my location" },
  { kind: "skip", label: "Set later" },
];

export default function OnboardingCard({ onFinished }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Hydrate from any existing prefs (e.g. user cleared the onboarded
  // flag but kept their answers). Falls back to neutral defaults.
  const initial = useMemo<Preferences>(() => {
    const existing = getPreferences();
    return (
      existing ?? {
        skillLevel: "any",
        passes: [],
        origin: null,
      }
    );
  }, []);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(initial.skillLevel);
  const [passes, setPasses] = useState<string[]>(initial.passes);
  // origin is captured directly inside handlePickOrigin (each origin
  // button is the terminal action), so we don't need local setter state
  // for it — we just read initial.origin as the default.
  const origin = initial.origin;
  const [closing, setClosing] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);

  // Lock body scroll while the card is up — keeps the map static
  // behind the backdrop and prevents accidental two-finger pans
  // on iOS Safari.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function applyAndClose(finalPrefs: Preferences, extraParams?: Record<string, string>) {
    setPreferences(finalPrefs);
    setOnboarded();

    // Apply URL params based on preferences.
    const params = new URLSearchParams(searchParams.toString());
    if (finalPrefs.passes.length > 0) {
      params.set("pass", finalPrefs.passes.join(","));
    }
    if (finalPrefs.origin) {
      params.set("from", finalPrefs.origin.code);
    }
    if (extraParams) {
      for (const [k, v] of Object.entries(extraParams)) {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });

    // Animate out, then unmount.
    setClosing(true);
    window.setTimeout(() => {
      onFinished();
    }, 200);
  }

  function handleSkip() {
    // Mark onboarded but don't save preferences — user explicitly
    // declined to share, we respect that.
    setOnboarded();
    setClosing(true);
    window.setTimeout(() => {
      onFinished();
    }, 200);
  }

  function handleFinish() {
    applyAndClose({ skillLevel, passes, origin });
  }

  function handlePickOrigin(choice: OriginChoice) {
    if (choice.kind === "city") {
      const next: Preferences = {
        skillLevel,
        passes,
        origin: { kind: "city", code: choice.code },
      };
      applyAndClose(next);
      return;
    }
    if (choice.kind === "skip") {
      const next: Preferences = { skillLevel, passes, origin: null };
      applyAndClose(next);
      return;
    }
    // Geolocation — request permission, then apply as ?from=geo&fromLat&fromLng
    if (!("geolocation" in navigator)) {
      const next: Preferences = { skillLevel, passes, origin: null };
      applyAndClose(next);
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        const next: Preferences = {
          skillLevel,
          passes,
          // Geo origin isn't persisted as a stable code — store null and
          // let the URL params carry the live coords.
          origin: null,
        };
        setPreferences(next);
        setOnboarded();
        const params = new URLSearchParams(searchParams.toString());
        if (next.passes.length > 0) params.set("pass", next.passes.join(","));
        params.set("from", "geo");
        params.set("fromLat", pos.coords.latitude.toFixed(5));
        params.set("fromLng", pos.coords.longitude.toFixed(5));
        router.replace(`?${params.toString()}`, { scroll: false });
        setClosing(true);
        window.setTimeout(() => onFinished(), 200);
      },
      () => {
        setGeoBusy(false);
        // Permission denied or timeout — close gracefully without geo.
        const next: Preferences = { skillLevel, passes, origin: null };
        applyAndClose(next);
      },
      { timeout: 8000, maximumAge: 60_000 },
    );
  }

  function togglePass(value: string) {
    setPasses((cur) =>
      cur.includes(value) ? cur.filter((p) => p !== value) : [...cur, value],
    );
  }

  function clearPasses() {
    setPasses([]);
  }

  const progressPct = ((step + 1) / 3) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Wynla"
      className={[
        "fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity duration-200",
        closing ? "opacity-0" : "opacity-100",
      ].join(" ")}
    >
      {/* Backdrop — semi-opaque navy with blur. Non-interactive
          (no click-to-dismiss) because we want explicit answers. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-wn-navy/30 backdrop-blur-sm"
      />

      <div
        className={[
          "relative w-full max-w-[420px] rounded-2xl bg-white shadow-xl transition-transform duration-200",
          closing ? "translate-y-2 scale-[0.98]" : "translate-y-0 scale-100",
        ].join(" ")}
      >
        {/* Progress + step counter */}
        <div className="px-6 pt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
              Step {step + 1} of 3
            </span>
            <span className="text-[11px] text-wn-charcoal/45">
              Quick setup · about 20 seconds
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-wn-charcoal/10">
            <div
              className="h-full rounded-full bg-wn-navy transition-all duration-200"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="px-6 py-6">
          {step === 0 && (
            <div>
              <h2 className="mb-1 text-xl font-extrabold tracking-tight text-wn-navy">
                What&apos;s your skill level?
              </h2>
              <p className="mb-4 text-xs text-wn-charcoal/65">
                We&apos;ll highlight resorts with terrain that matches.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SKILL_OPTIONS.map((opt) => {
                  const active = skillLevel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSkillLevel(opt.value)}
                      aria-pressed={active}
                      className={[
                        "flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-sm font-semibold transition active:scale-[0.98]",
                        active
                          ? "border-wn-navy bg-wn-navy/5 text-wn-navy ring-2 ring-wn-navy/30"
                          : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-navy/40",
                      ].join(" ")}
                    >
                      <span className="text-base" aria-hidden="true">
                        {opt.emoji}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="mb-1 text-xl font-extrabold tracking-tight text-wn-navy">
                Which pass do you have?
              </h2>
              <p className="mb-4 text-xs text-wn-charcoal/65">
                Pick all that apply — we&apos;ll filter resorts to ones you can ride.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PASS_OPTIONS.map((opt) => {
                  const active = passes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => togglePass(opt.value)}
                      aria-pressed={active}
                      className={[
                        "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition active:scale-[0.97]",
                        active
                          ? "border-wn-navy bg-wn-navy text-white"
                          : "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-navy/40",
                      ].join(" ")}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={clearPasses}
                  aria-pressed={passes.length === 0}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition active:scale-[0.97]",
                    passes.length === 0
                      ? "border-wn-charcoal/40 bg-wn-charcoal/5 text-wn-charcoal"
                      : "border-dashed border-wn-charcoal/25 bg-white text-wn-charcoal/70 hover:border-wn-charcoal/50",
                  ].join(" ")}
                >
                  No pass yet
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="mb-1 text-xl font-extrabold tracking-tight text-wn-navy">
                Where do you typically drive from?
              </h2>
              <p className="mb-4 text-xs text-wn-charcoal/65">
                We&apos;ll sort resorts by drive time from here.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ORIGIN_OPTIONS.map((opt) => {
                  const isCity = opt.kind === "city";
                  const isGeo = opt.kind === "geo";
                  const isSkip = opt.kind === "skip";
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => handlePickOrigin(opt)}
                      disabled={isGeo && geoBusy}
                      className={[
                        "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60",
                        isSkip
                          ? "border-dashed border-wn-charcoal/25 bg-white text-wn-charcoal/65 hover:border-wn-charcoal/50"
                          : isGeo
                            ? "border-wn-sky/50 bg-wn-sky/10 text-wn-navy hover:bg-wn-sky/20"
                            : isCity
                              ? "border-wn-charcoal/15 bg-white text-wn-charcoal hover:border-wn-navy/40 hover:bg-wn-navy/[0.03]"
                              : "border-wn-charcoal/15 bg-white text-wn-charcoal",
                      ].join(" ")}
                    >
                      {isGeo && geoBusy ? "Locating…" : opt.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-[11px] text-wn-charcoal/45">
                You can change this any time from the filters.
              </p>
            </div>
          )}
        </div>

        {/* Footer — Back / Skip / Continue. On step 2, the Continue
            button is hidden because each origin button is itself the
            final action ("Show my resorts"). */}
        <div className="flex items-center justify-between gap-2 border-t border-wn-charcoal/10 px-6 py-4">
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 0 ? 0 : ((s - 1) as 0 | 1 | 2)))}
                className="rounded-md px-2 py-1 text-xs font-semibold text-wn-charcoal/70 hover:text-wn-navy"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={handleSkip}
              className="rounded-md px-2 py-1 text-xs font-medium text-wn-charcoal/50 underline hover:text-wn-charcoal"
            >
              Skip onboarding
            </button>
          </div>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => ((s + 1) as 0 | 1 | 2))}
              className="rounded-md bg-wn-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-wn-navy/90 active:scale-[0.97]"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="rounded-md bg-wn-navy px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-wn-navy/90 active:scale-[0.97]"
            >
              Show my resorts →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
