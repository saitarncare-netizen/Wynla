# Wynla design guide

Rewritten 2026-09-23 for the Season 1 round 3 design package. This is the
human-readable half of the system; the machine half is `app/globals.css`
(`@theme` tokens) and `components/ui/*` (primitives). When the two
disagree, the code is right and this file needs an edit.

The old guide described a product that never shipped (ski-blue #2563EB,
Inter, Lucide, gray palette; audit finding design-system-28). Everything
below is what the app actually uses.

## 1. Principles

1. **Show, don't decide.** Numbers, not verdicts. Every user-visible
   number is labelled with how we know it (Measured / Forecast /
   Estimated / Reported) and when (see section 8).
2. **One of each.** One button, one card, one chip, one input, one icon
   language, one muted colour, one H1 scale. If a page needs a second
   version of something, the primitive grows a prop; the page does not
   grow a class string.
3. **Phone first, 44 px.** Design at 375 px. Every tap target is at least
   44 px on phones (36 px is allowed for chips and desktop-only dense
   rows). Inputs are 16 px on phones so iOS never zooms.
4. **Honest chrome.** Emoji live in copy (editorial personality), never
   as a button glyph, a tab icon or a status dot. Chrome uses the
   monoline `Icon` set.
5. **Respect the person's settings.** `prefers-reduced-motion` kills
   every animation globally (`app/globals.css`); keyboard focus is
   always visible; muted text never drops below 4.5:1.

## 2. Tokens (`app/globals.css`)

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `wn-navy` | `#1E2952` | Primary fill, headings, links, focus ring |
| `wn-sky` | `#5BAFE6` | Brand accent on navy surfaces only. **Never text on white** (2.4:1). |
| `wn-gold` | `#F5C443` | The one gold: primary CTA on a navy surface, badges on navy. **Never text on white** (1.6:1). |
| `wn-gold-halo` | `#CEA846` | Gold mixed with 18 % navy for the light map style (pin rings, route line). Replaces the ad-hoc `#D4A84B`. |
| `wn-offwhite` | `#FAFAF7` | Page background |
| `wn-charcoal` | `#2A2A2A` | Body text |
| `wn-muted` | `#5C5C5B` | Secondary text. 6.4:1 on off-white, 6.7:1 on white. Replaces every `text-wn-charcoal/45..75`. |
| `wn-subtle` | `#767675` | Decorative text and icons only (4.2:1). Replaces `text-wn-charcoal/35..40`. |
| `wn-line` | `#E5E5E5` | Borders and dividers. Replaces `border-wn-charcoal/10..20`. |
| `wn-navy-deep` | `#0F1530` | The dark end of every navy gradient (was `#0B1028`, `#141A3A`, `#0F1530`). |
| `wn-focus` / `wn-focus-on-dark` | navy / gold | Focus ring colour on light / dark surfaces |
| `wn-success` `-bg` | `#1B7F4B` / `#ECFDF3` | Confirmations |
| `wn-danger` `-bg` | `#B42318` / `#FEF3F2` | Errors, sold out |
| `wn-warning` `-bg` | `#B54708` / `#FFFAEB` | Caution notices |
| `wn-info` `-bg` | `#0F6ABF` / `#EFF6FF` | Neutral notices |

Utilities: `text-wn-muted`, `bg-wn-line`, `border-wn-line`,
`bg-wn-success-bg`, `text-wn-danger`, `bg-wn-navy/5` (tints via `/NN`
are fine for **backgrounds**, never for text).

Where the second gold still lives (owners migrate to `wn-gold-halo` /
`#CEA846`): `components/Map/MapView.tsx` (5 literals), `components/Map/
MapPage.tsx:1790`, `app/go/og/route.tsx`, `lib/ogCard.tsx`,
`lib/emailTemplates.ts`, `lib/email/templates/thursdayPicks.ts`. Email and
OG code cannot read CSS variables, so they keep a literal; the literal
should be `#CEA846` with a comment pointing here.

Pass colours stay in `lib/passColors.ts` (Epic `#F37021`, Ikon `#F2C200`,
Indy `#DC2626`, Mountain Collective `#1E3A8A`, independent `#6B7280`).
Ikon yellow is close to the brand gold on purpose (Ikon's brand); do not
use gold next to an Ikon badge for decoration.

Text on a pass colour (badges, rank dots, pass-coloured heroes) takes its
colour from `textOn(bg)` in `lib/contrast.ts`, never a hardcoded white:
white is 1.7:1 on Ikon yellow and 2.9:1 on Epic orange, so those get navy
(8.7:1 / 4.8:1); Indy, Mountain Collective and independent keep white.
`PageHeader accent` runs the accent through `accentOnNavy()` so the white
title and the 70 % white eyebrow stay above 4.5:1 for any list colour.
`text-wn-subtle` (4.35:1 on off-white) is for icons and decoration only;
placeholders, footnotes and error references use `text-wn-muted`.

### Type scale

Six body steps with fixed line heights, plus display steps for hero
titles. `text-eyebrow` (11 px, 0.08em tracking) is the only size below
12 px and is only for uppercase labels. `text-[9px]`, `text-[10px]`,
`text-[11px]`, `text-[13px]` are not allowed.

The four small steps are Tailwind's own utilities (same sizes). Every
step above 18 px is a Wynla utility with a `wn-` prefix. Tailwind's
`text-xl` .. `text-6xl` are deliberately left at Tailwind's defaults
(20 / 24 / 30 / 36 / 48 / 60 px) so files that have not migrated yet do
not change size under their owners; new and migrated code uses only the
`text-wn-*` steps.

| Utility | Size / line | Use |
| --- | --- | --- |
| `text-eyebrow` | 11 / 16 | Uppercase labels above titles, stat labels |
| `text-xs` | 12 / 16 | Captions, timestamps, footnotes, tab bar labels |
| `text-sm` | 14 / 20 | Body in cards, buttons, labels |
| `text-base` | 16 / 24 | Article body, inputs on phones |
| `text-lg` | 18 / 28 | Section titles (`Section`), card titles |
| `text-wn-xl` | 22 / 28 | Large card titles, login H1, stat values from `sm` |
| `text-wn-2xl` | 28 / 34 | Page H1 on phones, article H2 |
| `text-wn-3xl` | 32 / 38 | Prices, hero numbers |
| `text-wn-4xl` | 40 / 44 | Page H1 from `sm` |
| `text-wn-5xl` | 48 / 52 | Directory H1 (`PageHeader size="lg"`) from `lg` |

Class mapping for files that migrate (the size changes are intended;
check each at 375 px):

| Legacy utility | Tailwind size | Replace with | New size |
| --- | --- | --- | --- |
| `text-xl` | 20 px | `text-wn-xl` | 22 px |
| `text-2xl` | 24 px | `text-wn-2xl` | 28 px |
| `text-3xl` | 30 px | `text-wn-3xl` | 32 px |
| `text-4xl` | 36 px | `text-wn-4xl` | 40 px |
| `text-5xl` | 48 px | `text-wn-5xl` | 48 px (line height 52) |
| `text-6xl` | 60 px | `text-wn-5xl`, or keep `text-6xl` for the resort hero only | 48 px |

Keep the breakpoint prefix: `sm:text-3xl` becomes `sm:text-wn-3xl`. A
page H1 should become the `PageHeader` title instead of a mapped class.

H1 = `PageHeader`: 28 px on phones, 40 px from `sm`, 48 px on `lg` for
directories. H2 = `Section` title, 18 px bold navy. H3 = 16 px bold navy.
Eyebrow = `text-eyebrow font-semibold uppercase text-wn-muted` (the token
carries the tracking; do not add `tracking-*`).

Font: Geist (`--font-sans`), Geist Mono for codes and numbers where
alignment matters (`tabular-nums` on every number column).

### Radius, shadow, spacing

| Token | Value | Legacy equivalents |
| --- | --- | --- |
| `rounded-wn-sm` | 8 px | `rounded-md`, `rounded-lg` (buttons, inputs, chips that are not pills) |
| `rounded-wn-md` | 12 px | `rounded-xl` (cards) |
| `rounded-wn-lg` | 16 px | `rounded-2xl` (sheets, marketing cards) |
| `rounded-full` | pill | chips, avatars |
| `shadow-wn-sm` | resting card | `shadow-sm` |
| `shadow-wn-md` | hover / floating | `shadow-md`, `shadow-lg` |

Spacing rhythm: 4 px base. Inside a card 16 px (20 px from `sm`).
Between blocks on a page 32 px (`space-y-8`), 48 px between major
sections on desktop. Page gutter 16 px (`px-4`), 24 px from `sm`.
Content widths: `max-w-2xl` (forms, /early), `max-w-3xl` (articles,
legal), `max-w-5xl` (directories), `max-w-6xl` (compare, shell).

### Layout variables (`:root`)

| Variable | Value | Use |
| --- | --- | --- |
| `--wn-shell-h` | 3.5rem | AppShell bar height. Pages' `min-h` is reduced by it automatically; sticky things use `top: calc(var(--wn-shell-h) + env(safe-area-inset-top))`. |
| `--wn-bottom-stack` | safe-area inset, or the tab bar height while it shows | Floating pills / toasts: `bottom: calc(var(--wn-bottom-stack) + 12px)`. |
| `--wn-tab-bar-h` | 3.5rem + inset | Set only while the phone tab bar is visible (`html[data-tab-bar="1"]`). |

`--wn-header-h` is NOT a shell token: it belongs to the map. MapPage sets
it on its own root after measuring its floating header, and MapView /
ResortPanel depend on it being unset before that (fallbacks 140 px /
64 px). Never define it on `:root` or read it outside `components/Map`.

### Focus

Global `:focus-visible` rule: 2 px navy outline, 2 px offset. Add the
`on-dark` class to a navy surface and the outline turns gold. Do not
write `focus:outline-none` without a replacement ring; `Input` already
carries `focus:ring-2 focus:ring-wn-navy/25`.

## 3. Primitives (`components/ui`)

All primitives are hook-free (except `Field`, which uses `useId`) and
work in server and client components.

### Button

```tsx
import Button from "@/components/ui/Button";
<Button>Plan a trip</Button>                         // primary, 44 px
<Button variant="secondary" size="sm" href="/guides">Guides</Button>
<Button variant="ghost" onClick={...}>Resend code</Button>
<Button variant="danger" onClick={...}>Delete account</Button>
<Button variant="gold">Find my Saturday</Button>     // only on navy, one per screen
<Button loading block type="submit">Sign in</Button> // spinner, aria-busy, disabled
<Button iconLeft={<Icon name="map" />} iconRight={<Icon name="arrow-right" />}>...</Button>
```

`href` renders a `next/link` (external `https://` / `mailto:` render an
`<a>`), so a navigation and an action look identical. `buttonClasses()`
is exported for the rare case where a third-party element needs the look.

### Card

```tsx
<Card>…</Card>                                  // 12 px radius, line border, sm shadow, 16/20 px padding
<Card href="/resort/vail" accent={passColor}>   // link card: hover lift, `group` for arrow nudges
<Card padding="lg" className="text-center">     // marketing / CTA cards
<Card padding="none">                            // image tops, tables
```

### Chip

```tsx
<Chip href="/state/co">Colorado</Chip>                       // route chip
<Chip selected onClick={toggle} dot={passColor}>Ikon</Chip>  // toggle, aria-pressed
<Chip tone="dark">Best for: powder</Chip>                    // on a navy hero
```

36 px tall pill. Keep 8 px between chips.

### Input, Textarea, Field

```tsx
<Field label="Email" hint="One email, no spam." error={error}>
  {(a11y) => <Input {...a11y} type="email" autoComplete="email" />}
</Field>
<Input font="code" inputMode="numeric" autoComplete="one-time-code" />
```

`Field` generates the id, `aria-describedby` (hint + error) and
`aria-invalid`; the error has `role="alert"`. Placeholder text is never
the label: use `hideLabel` to keep the label for screen readers.

### Section

```tsx
<Section title="Sources" description="…" action={<Button size="sm" variant="ghost">See all</Button>} card>
```

One H2 style. `level="h3"` when nested. `card` wraps the body in a Card.
Give it an `id` and it labels itself for the landmark list.

### PageHeader

```tsx
<PageHeader eyebrow="Legal" title="Privacy policy" meta="Last updated …" description="…" />
<PageHeader tone="navy" size="lg" eyebrow="Editorial" title="Wynla guides" actions={<Button variant="secondary" size="sm" href="/lists">Lists</Button>} />
<PageHeader tone="navy" accent={list.accent} …>{chips}</PageHeader>
```

The header never renders "← Map": the AppShell bar owns back navigation.
`back` exists for a nested page whose parent `lib/nav.ts` cannot guess.

### EmptyState, Notice, Skeleton

```tsx
<EmptyState icon="list" title="No trips yet" body="…" action={<Button href="/">Open the map</Button>} />
<EmptyState tone="bare" …>          // full-page (404, error)
<Notice tone="danger">That code didn't work.</Notice>   // role=alert
<Notice tone="success" title="You're in.">…</Notice>     // role=status

// app/<route>/loading.tsx
<SkeletonPage label="Loading trips">
  <SkeletonHero /> | <SkeletonPlainHeader />
  <SkeletonStats count={4} />
  <SkeletonCard lines={3} accent />
</SkeletonPage>
```

Skeletons match the page they stand in for (same widths and paddings)
so the real page lands without a jump. One `role="status"` per page.

## 4. Icons (`components/icons/Icon`)

24×24 monoline, 1.5 px stroke, `currentColor`. 44 glyphs; names are
Lucide-compatible so a library swap later is a rename.

```tsx
<Icon name="arrow-right" className="h-4 w-4" />
<Icon name="alert" title="Warning" />   // role=img when it is the label
```

Replacements for the emoji-as-chrome the audit counted:

| Emoji | Icon | | Emoji | Icon |
| --- | --- | --- | --- | --- |
| 🗺️ | `map` | | 🔍 | `search` |
| 📍 | `pin` | | ☰ | `filter` / `menu` |
| 🏔️ ⛷️ | `mountain` / `skier` | | 🔔 | `bell` |
| ❄️ 🌨️ | `snowflake` / `snow-cloud` | | 🎟️ | `ticket` |
| ☀️ ☁️ 💨 🌡️ | `sun` `cloud` `wind` `thermometer` | | 📖 ⭐ | `book` / `star` |
| ✈️ 🚗 | `plane` / `car` | | ✨ | `sparkle` |
| ✓ ✗ × ✕ | `check` / `close` | | ▾ ↗ → | `chevron-down` `external` `arrow-right` |
| 🟢 🔴 🟡 | status text + `wn-success` / `wn-danger` / `wn-warning` colour, never a dot emoji | | 👤 ⚙️ | `user` / `settings` |

Editorial emoji in copy ("Ride well, ride safe", a guide's intro) are
fine. Emoji inside an accessible name ("✨ Optimize order") are not.

## 5. Shell (`components/AppShell.tsx`, `components/AppTabBar.tsx`, `components/Footer.tsx`)

- **Top bar** on every route except `/`: designer lockup, desktop links
  Map · Today · Saturday · Guides · Trips, Account avatar or Sign in.
  Phones get back link · lockup · one action (Sign in, or the Saturday
  pick when signed in); the link row is hidden because the tab bar has it.
- **Tab bar** (phones): Map · Today · Trips · Account. Hidden on flow
  routes (`/login`, `/auth/*`, `/get`, `/trip/share/*`) and while a map
  sheet is open.
- Both read `lib/nav.ts`: one list of items, one `match()` per item, one
  `backLinkFor()`. A route is active in exactly one place (tested).
- **Sign-in state** is resolved in the browser (`getSession`, no network)
  because reading the auth cookie in the root layout would make all ~480
  ISR pages dynamic. Pass `initialUser` to `<AppShell>` from a route
  group layout if a section already has the user on the server.
- **Footer**: mark, all content hubs, legal, contact, install. 12 px
  muted, never smaller.
- **Map header** (`components/Map/MapPage.tsx`, sheet package): replace
  the text "Wynla" pill with `<BrandMark variant="lockup" size="sm" />`
  (or `variant="mark"` where only the glyph fits). `components/
  BrandMark.tsx` uses the trimmed PNGs from `scripts/gen-brand-shell-
  assets.mjs` with explicit dimensions (no CLS).

## 6. Do / don't

- Do use `Button` for anything clickable that is not inline prose. Don't
  write `rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white`
  again.
- Do use `text-wn-muted` for secondary text. Don't use `text-wn-charcoal/NN`.
- Do use `border-wn-line`. Don't use `border-wn-charcoal/10|15|20`.
- Do use `text-eyebrow` for uppercase labels. Don't use `text-[10px]
  tracking-[0.18em]`.
- Do use `Notice` for inline status. Don't hand-roll `bg-red-50 text-red-800`.
- Do use `Card accent={...}` for the coloured top bar. Don't add a
  `h-1.5` div in every card.
- Do use `var(--color-wn-navy)` / `var(--color-wn-navy-deep)` in inline
  gradients. Don't paste `#1E2952` (37 places, code-health-16).
- Do label numbers: "Measured 6:00 am", "Forecast for Sat", "Estimated",
  "Reported by the resort, checked Sep 23". Don't show a bare number.
- Do write sentence case. Don't use exclamation marks or Title Case
  headings.
- Don't put gold or sky as text on white. Don't use gold outside the one
  primary CTA per navy surface.
- Don't add a "← Map" link to a page: the shell has it.

## 7. Loading and empty states

- Every data route has `loading.tsx` (resort, trips, trip, go, today,
  guides, guides/[slug], lists, lists/[slug], state, favorites, compare).
  Match the page's skeleton to its layout; a nested route inherits the
  parent's file, so give it its own when the layouts differ (an article
  under a card index).
- `SkeletonPage` keeps `<main>` as the landmark (`aria-busy`) and puts
  `role="status"` on a visually hidden label, so the page announces
  "Loading" once without losing the main landmark.
- Client-side waits inside a page use `Skeleton` pieces sized like the
  content they replace, never a spinner alone.
- Empty results use `EmptyState` with one CTA. Copy pattern: what is
  empty, why (if known), the one next step. No "Oops".

## 8. Numbers and honesty

Every user-visible number carries a source word and a time:

| Word | Meaning | Example |
| --- | --- | --- |
| Measured | an instrument or station reading | "Base 42 in · Measured 6:00 am" |
| Forecast | a model output for a future time | "6 in · Forecast for Sat" |
| Estimated | derived by Wynla (drive time, straight-line miles, averages) | "4 h 20 · Estimated" |
| Reported | a figure a resort or operator published, copied by hand | "$1,449 · Reported, checked Sep 23" |

Use `tabular-nums` on any column of numbers. Never round a Reported
figure; never show a Forecast without its date.

## 9. Migration checklist (pages other packages own)

Work file by file; each step is a find-and-replace with a visual check
at 375 px.

1. Delete the page's own `<header>` back link ("← Map", "← Wynla",
   white pill, ghost pill). `AppShell` provides it. Keep only in-page
   actions (Compare / Favorite toggles).
2. Replace the hero `<header style={{ background: "linear-gradient(… #1E2952 … #0B1028)" }}>` with
   `<PageHeader tone="navy" …>`; keep grain layers as `children` if
   wanted.
3. Replace `<h1 className="text-3xl … sm:text-5xl">` with the
   `PageHeader` title. One H1 scale.
4. `text-wn-charcoal/45..75` → `text-wn-muted`; `/35..40` → `text-wn-subtle`.
5. `border-wn-charcoal/10..20` → `border-wn-line`;
   `divide-wn-charcoal/10` → `divide-wn-line`.
6. `text-[9px]`, `text-[10px]`, `text-[11px]` → `text-eyebrow` for
   uppercase labels, `text-xs` otherwise; `text-[13px]` → `text-sm`.
7. Any `<button>` / `<Link>` / `<a>` with `bg-wn-navy` or a border →
   `<Button>` (`variant`, `size`, `href`). Height h-9/10/12 → md (44) or
   sm (36).
8. `rounded-xl border border-wn-charcoal/10 bg-white … shadow-sm` → `<Card>`.
9. Pass chips / filter pills → `<Chip>`; pass badges stay on
   `lib/passColors.ts` but use `text-eyebrow` and `rounded-wn-sm`.
10. Inputs → `<Input>` inside `<Field>` (label, hint, error wired).
11. `bg-red-50 text-red-800` / `bg-emerald-50 …` → `<Notice tone>`.
12. Emoji used as a glyph in a button, tab, badge or status → `<Icon>`
    (table in section 4). Emoji inside an `aria-label` → remove.
13. Inline `#1E2952` → `var(--color-wn-navy)`; `#0B1028` / `#0F1530` /
    `#141A3A` → `var(--color-wn-navy-deep)`; `#D4A84B` → `#CEA846` /
    `var(--color-wn-gold-halo)`.
14. Floating elements at the bottom of the screen → `bottom:
    calc(var(--wn-bottom-stack) + 12px)`.
15. Add `loading.tsx` if the route fetches (already done for the twelve
    routes in section 7).
16. `text-xl` .. `text-6xl` → `text-wn-*` per the class mapping in
    section 2 (keep breakpoint prefixes). Text on a pass colour →
    `color: textOn(bg)` from `lib/contrast.ts`.
17. Run `npx tsc --noEmit`, `npm run lint`, `npm test`; check 375 px and
    the installed-app safe area.

Package owners and their files at the time of writing: map + sheet
(`components/Map/*`, `components/*Resort*`), resort page
(`app/resort/[slug]/page.tsx`), trips / trip / favorites / account /
compare (`app/trips`, `app/trip`, `app/favorites`, `app/account`,
`app/compare`), go / today (`app/go`, `app/today`), pro / early upsell
(`app/pro`, `components/Pro*`, `components/UpsellModal.tsx`).

Files still on Tailwind's `text-xl` .. `text-6xl` (73 uses on
2026-09-23; migrate with the section 2 mapping when the owner next
touches the file):

- map + sheet: `components/Map/FiltersDrawer.tsx`, `MapPage.tsx`,
  `ResortPanel.tsx`, `ResortPicker.tsx`, `ResortReviews.tsx`,
  `TripPlannerPanel.tsx`; `components/NearbyActivities.tsx`,
  `NearbyRestaurants.tsx`, `OnboardingCard.tsx`, `PlanYourTrip.tsx`,
  `PowderDayScore.tsx`, `SimilarResorts.tsx`, `SnowSurfaceForecast.tsx`,
  `WhereToStay.tsx`, `auth/FavoriteToggle.tsx`
- resort page: `app/resort/[slug]/page.tsx`
- trips / trip / favorites / account / compare: `app/trips/page.tsx`,
  `app/trip/[id]/page.tsx`, `app/trip/[id]/TripNameEditor.tsx`,
  `app/trip/share/[token]/page.tsx`, `app/favorites/page.tsx`,
  `app/account/page.tsx`, `app/account/digest/page.tsx`,
  `app/account/feedback/page.tsx`, `app/account/pro/page.tsx`,
  `app/compare/page.tsx`
- go / today: `app/go/page.tsx`, `app/today/page.tsx`
- pro / upsell: `app/pro/page.tsx`, `components/UpsellModal.tsx`

White text on a pass colour also still appears in files other packages
own: `app/trip/[id]/page.tsx` (pass badges), and `app/favorites/page.tsx`
/ `app/compare/page.tsx` (their badges special-case Ikon only, so Epic
orange is still white at 2.9:1). Switch those to `textOn()`. The resort
hero (`app/resort/[slug]/page.tsx`) starts its gradient at the raw pass
colour under a white title; use `accentOnNavy()` there.

## 10. Before / after (this package's files)

Counted with a script over the 20 files this package owns (login,
guides, lists, state, deals, early, data-sources, privacy, terms, get,
not-found, error, global-error, trip-templates, layout, AppTabBar):

| Metric | Before | After |
| --- | --- | --- |
| Distinct button-like class strings | 22 | 1 (the rest are `<Button>`) |
| Distinct font-size utilities | 13 (incl. `[10px]` `[11px]` `[13px]`) | 8 (scale only) |
| `text-wn-charcoal/NN` uses | 101 | 0 |
| Hardcoded navy / deep-navy hex | 20 | 5 (`layout.tsx` themeColor and `global-error.tsx` inline styles, which cannot read CSS) |
| Emoji used as chrome | 18 | 0 |
| Route-level `loading.tsx` | 0 | 12 |
