# Wynla — Design Guide

---

## 1. Design Philosophy

### Core Principle: **"Show, don't decide"**

We give users information. They make decisions.

We don't:
- Tell users which mountain is "best"
- Use AI to suggest where to go
- Add visual ratings or scores
- Imply "good" or "bad" conditions

We do:
- Show clear, accurate data
- Make filtering effortless
- Link out for live verification
- Trust user intelligence

---

## 2. Visual Identity

### Brand Personality

- **Confident** — but not arrogant
- **Helpful** — like a friend who knows mountains
- **Clean** — no clutter, no ads
- **Trustworthy** — honest about what we know and don't

### Avoid:
- Overly playful (this is a planning tool)
- Stock photography clichés (people jumping with skis)
- Generic mountain illustrations
- "Dynamic" gradients and effects

### Embrace:
- Real photography (nature, atmosphere)
- Generous white space
- Strong typography
- Functional iconography

---

## 3. Color Palette

### Primary Colors

```css
/* Snow & Sky */
--wn-white: #FFFFFF;
--wn-off-white: #F8FAFC;
--wn-light-gray: #E2E8F0;
--wn-mid-gray: #94A3B8;
--wn-dark-gray: #334155;
--wn-black: #0F172A;

/* Brand */
--wn-primary: #2563EB;        /* Ski blue */
--wn-primary-dark: #1E40AF;
--wn-primary-light: #DBEAFE;

/* Semantic (use sparingly) */
--wn-success: #059669;        /* Trail open */
--wn-warning: #D97706;        /* Caution */
--wn-info: #0891B2;          /* Weather */

/* Pass Colors — verified from official brand standards (2026) */
--wn-epic: #F37021;                /* Vail Resorts orange */
--wn-ikon: #000000;                /* Alterra/Ikon black */
--wn-indy: #DC2626;                /* Indy Pass red, post-2023 rebrand */
--wn-mountain-collective: #1E3A8A; /* Mountain Collective navy */
--wn-independent: #6B7280;         /* Independent neutral gray */

/* Pass tag styling spec (used in popups + badges) */
/* Solid background = brand color, white text, WCAG AA contrast */
/* Border-radius: 6-8px, padding: 2px 8px, font-weight: 500-600, font-size: 11-12px */
```

### Usage Rules

- **Backgrounds:** mostly white/off-white
- **Text:** dark gray (--wn-dark-gray) for body, black for headers
- **Primary action buttons:** ski blue
- **Avoid red/green for conditions** (don't imply judgment)

---

## 4. Typography

### Font Stack

```css
/* Headers */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 700;

/* Body */
font-family: 'Inter', system-ui, sans-serif;
font-weight: 400;

/* Mono (data) */
font-family: 'JetBrains Mono', monospace;
```

### Type Scale

```css
/* Display (hero) */
--text-display: 3.5rem;      /* 56px */
font-weight: 800;

/* H1 */
--text-h1: 2.25rem;          /* 36px */
font-weight: 700;

/* H2 */
--text-h2: 1.875rem;         /* 30px */
font-weight: 700;

/* H3 */
--text-h3: 1.5rem;           /* 24px */
font-weight: 600;

/* Body */
--text-body: 1rem;           /* 16px */
font-weight: 400;
line-height: 1.6;

/* Small */
--text-small: 0.875rem;      /* 14px */

/* Caption */
--text-caption: 0.75rem;     /* 12px */
```

### Rules

- Maximum line length: 65 characters for readability
- Line height: 1.6 for body, 1.2 for headers
- Never use thin weights below 400 (hard to read)
- Always have hierarchy (H1 > H2 > H3 > body)

---

## 5. Spacing System

Base unit: **4px**

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-24: 6rem;     /* 96px */
```

### Usage

- Card padding: `--space-6` (24px)
- Section spacing: `--space-12` (48px)
- Between elements: `--space-4` (16px)
- Tight grouping: `--space-2` (8px)

---

## 6. Components

### Buttons

```tsx
// Primary action
<button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
  View Resort
</button>

// Secondary
<button className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50">
  Compare
</button>

// Tertiary (link-style)
<button className="text-blue-600 font-medium hover:underline">
  Learn more →
</button>
```

### Cards

```tsx
<div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
  {/* Content */}
</div>
```

### Pills / Tags / Badges

```tsx
// Pass badge
<span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
  Ikon Pass
</span>

// Feature tag
<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
  Terrain Park
</span>
```

### Forms

```tsx
// Input
<input
  type="text"
  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Search resorts..."
/>

// Select
<select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
  <option>Any pass</option>
</select>

// Checkbox
<label className="flex items-center gap-2">
  <input type="checkbox" className="rounded text-blue-600" />
  <span>Has terrain park</span>
</label>
```

---

## 7. Layout Patterns

### Map Page (Home)

```
┌─────────────────────────────────────────┐
│  Logo      Filter Bar       Profile     │  Header (60px)
├─────────────────────────────────────────┤
│  ┌──────────────┐                       │
│  │              │                       │
│  │   Filters    │                       │
│  │  (sidebar)   │     Map Area          │
│  │              │                       │
│  │ Pass: ___    │                       │
│  │ Distance: __ │                       │
│  │ Skill: ____  │                       │
│  │ Features: __ │                       │
│  │              │                       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

### Mobile Layout

```
┌──────────────┐
│  Logo  Menu  │
├──────────────┤
│              │
│    Map       │
│              │
├──────────────┤
│  Filter Btn  │
└──────────────┘
```

### Resort Detail Page

```
┌─────────────────────────────────────────┐
│  ← Back          [Hero Image]           │
│                                         │
│  Hunter Mountain          [Ikon Badge]  │
│  Catskills, NY • 2h 15m drive           │
├─────────────────────────────────────────┤
│  📅 Weather Forecast                    │
│  ┌────┬────┬────┬────┐                  │
│  │ Today │Tom │+2 │+3                   │
│  └────┴────┴────┴────┘                  │
├─────────────────────────────────────────┤
│  🏔️ Mountain Stats                      │
│  Vertical: 1,600 ft | 67 trails        │
│  • Beginner: 20  | Intermediate: 27    │
│  • Advanced: 15  | Expert: 5            │
├─────────────────────────────────────────┤
│  🎿 Features                            │
│  ✓ Terrain Park (4)                     │
│  ✓ Glades                               │
│  ✓ Snowmaking 100%                      │
├─────────────────────────────────────────┤
│  🌐 [Visit Resort Website]              │
│  🗺️ [Open in Google Maps]               │
│  🎟️ [Book Lift Ticket]                   │
└─────────────────────────────────────────┘
```

---

## 8. Iconography

### Style

- **Line icons**, 2px stroke
- 24x24 base size
- Use [Lucide Icons](https://lucide.dev) (free, well-designed)

### Specific Icons

```
🗺️ Map          → MapIcon
🎿 Ski/Snow     → MountainIcon (Lucide)
☁️ Weather       → CloudIcon
🌡️ Temperature   → ThermometerIcon
💨 Wind         → WindIcon
🚗 Drive        → CarIcon
🎫 Pass         → TicketIcon
⏱️ Hours        → ClockIcon
📍 Location     → MapPinIcon
```

### Don't Use

- ❌ Emoji directly (inconsistent rendering)
- ❌ Filled icons (looks heavy)
- ❌ Multi-color icons
- ❌ Custom illustration (until Phase 3)

---

## 9. Map Style

### Mapbox Style

Use: `mapbox://styles/mapbox/outdoors-v12`

This provides:
- Topographic detail
- Trail visibility on resort terrain
- Natural color palette
- Mountain emphasis

### Custom Pin Design

```
   ▼
  ◉ <- Resort circle
     [Pass Color]
     
On hover/click: expand with name
```

### Pin Colors by Pass (verified brand colors)

- Epic: Orange (#F37021) — Vail Resorts
- Ikon: Black (#000000) — Alterra
- Indy: Red (#DC2626) — post-2023 rebrand
- Mountain Collective: Navy (#1E3A8A)
- Independent: Gray (#6B7280)

For resorts on multiple passes (e.g. Whiteface = independent + Mountain Collective),
the pin uses the FIRST pass in `passes[]` as the primary color, and the popup shows
all passes as separate badges.

---

## 10. Imagery Guidelines

### Hero Images

**Sources (legal, free):**
- Unsplash (https://unsplash.com)
- Pexels (https://pexels.com)
- Pixabay (https://pixabay.com)

**Style:**
- Real mountains (not stock photo skiing)
- Natural light
- Atmospheric, not action-packed
- Wide aspect ratio (16:9 or 21:9)

### Avoid:
- Smiling families on perfect powder days
- Heavy filters
- Sunset/sunrise overload
- Generic "skiing" stock photos

### Image Treatment

```css
.hero-image {
  width: 100%;
  height: 320px;
  object-fit: cover;
  filter: brightness(0.9);     /* Slight darken for text overlay */
}
```

---

## 11. Animations

### Principles

- **Subtle** — never distracting
- **Functional** — only when adds clarity
- **Fast** — 200-300ms
- **Respectful** — respect prefers-reduced-motion

### Common Animations

```css
/* Hover lift */
.card:hover {
  transform: translateY(-2px);
  transition: transform 200ms ease;
}

/* Fade in */
.fade-in {
  animation: fadeIn 300ms ease-out;
}

/* Pin pop */
.pin-active {
  transform: scale(1.2);
  transition: transform 200ms ease-out;
}
```

### Avoid

- Bouncing animations
- Spinning loaders longer than 1 sec
- Auto-playing carousels
- Parallax scrolling

---

## 12. Loading States

### Loading Skeleton (preferred over spinner)

```tsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

### Empty States

When no resorts match filter:

```
   🏔️
   
   No resorts match your filters.
   
   [Clear filters]
```

---

## 13. Mobile Responsiveness

### Breakpoints (Tailwind defaults)

```
sm: 640px    /* Mobile landscape */
md: 768px    /* Tablet */
lg: 1024px   /* Desktop */
xl: 1280px   /* Large desktop */
```

### Mobile-First Rules

1. Design for 375px width first (iPhone)
2. Filter sidebar becomes bottom sheet
3. Detail page becomes single column
4. Buttons are min 44px tall (touch target)
5. Text minimum 16px (prevent zoom)

---

## 14. Accessibility

### Must Have:

- [ ] Color contrast 4.5:1 minimum
- [ ] All interactive elements keyboard accessible
- [ ] Alt text on all images
- [ ] ARIA labels on icon-only buttons
- [ ] Focus indicators visible
- [ ] Form labels associated correctly

### Test With:

- Keyboard only (no mouse)
- Screen reader (VoiceOver on Mac)
- Lighthouse accessibility audit
- Color blindness simulator

---

## 15. Tone of Voice

### Examples

**Page titles:**
- ✅ "Find your mountain"
- ❌ "Welcome to Wynla!"

**Empty states:**
- ✅ "No mountains match your filters. Try fewer constraints."
- ❌ "Oops! Something went wrong! 😅"

**Errors:**
- ✅ "Couldn't load weather. Try again in a moment."
- ❌ "ERROR: Failed to fetch from API endpoint"

**Buttons:**
- ✅ "View resort"
- ❌ "Click here for more info"

**Disclaimers:**
- ✅ "Always check the resort site for live trail status."
- ❌ "We are not responsible for any inaccuracies in our data."

---

## 16. Don't Do These

- ❌ Auto-playing video backgrounds
- ❌ Pop-up email signup forms
- ❌ Cookie consent walls (unless required)
- ❌ Chat bots / customer service widgets
- ❌ Social media floating buttons
- ❌ "As seen on..." badges
- ❌ Testimonial carousels
- ❌ FOMO countdowns ("Sale ends in 2h!")
- ❌ Hamburger menu on desktop

---

## 17. Reference Designs

### Inspirations to Look At:

- **Linear.app** — clean, focused UI
- **Stripe** — typography and spacing
- **Apple Maps** — map interaction patterns
- **AllTrails** — outdoor app design done right
- **Notion** — content density

### What NOT to Look At:

- Marketing-heavy SaaS landing pages
- Crypto/Web3 sites (overdesigned)
- Stock-photo heavy travel sites
- Old ski resort websites (cluttered)

---

## 18. Implementation Notes for Cursor

When generating code:

1. Use Tailwind utility classes (no custom CSS unless necessary)
2. Use Lucide React for icons: `import { Mountain } from 'lucide-react'`
3. Follow the spacing scale strictly
4. Always make it mobile-responsive
5. Default to white backgrounds with gray borders
6. Test with both light data (1 resort) and heavy data (30 resorts)

---

*This is a living document. As we get user feedback, we'll refine these guidelines.*
