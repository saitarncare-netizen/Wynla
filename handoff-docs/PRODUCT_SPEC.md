# Wynla — Product Specification

---

## 1. Product Vision

**Wynla** is a map-based ski and snowboard trip planning web app for skiers and snowboarders in the United States, starting with the Northeast (NYC, NJ, CT, VT, NH, MA, PA region).

The product solves a specific, validated problem: **skiers currently use 3-4 different apps to plan a single trip.**

### The Problem (Validated)

Before going skiing, users currently open:
- 🗺️ **Google Maps** — to check drive time and location
- ☁️ **Weather app** — to check forecast
- 🎿 **Resort website** — to check trail status and conditions
- 📋 **Pass website** — to verify their pass works at that mountain

This fragmentation leads to:
- Wasted time researching
- Driving hours only to find disappointing conditions
- Confusion about which mountain to choose
- Missing weather windows for good conditions

### The Solution

**One web app** that combines:
- Map view of all resorts with key info
- Weather forecast (3-7 days)
- Pass affiliation clearly shown
- Resort details (trails, features, opening hours)
- Direct links to resort websites for live updates
- Drive time and route planning

---

## 2. Target User

### Primary: Northeast US Weekend Warriors

**Demographics:**
- Age: 22-40
- Location: NYC, NJ, CT, Boston, Philadelphia metropolitan areas
- Income: $50K-150K/year
- Skiing frequency: 5-15 days per season
- Has a pass: Epic, Ikon, or Indy

**Behavior:**
- Plans trips 1-3 days in advance (sometimes night before)
- Drives 1-4 hours to mountains
- Uses smartphone primarily, sometimes desktop
- Active in Facebook groups, Reddit communities

**Pain points:**
- "I don't want to drive 3 hours and find out conditions suck"
- "Which mountain is good this weekend?"
- "Does my Ikon Pass work here?"
- "Is it too icy for beginners today?"

### Secondary Users (Phase 2)

- Trip planners (multi-day trips)
- Beginners/families
- Out-of-state visitors

---

## 3. Core Features (MVP)

### 3.1 Map View (Home Screen)

**What user sees:**
- Interactive map of US Northeast
- Pin for each resort
- Each pin shows: Resort name, drive time from user, pass icon

**What user can do:**
- Zoom and pan
- Click any pin to see details
- Filter resorts using filter bar

### 3.2 Filter System

Users can filter resorts by:

**Pass:**
- Epic Pass
- Ikon Pass
- Indy Pass
- Independent (no pass needed)

**Distance from user:**
- Within 2 hours
- Within 3 hours
- Within 4 hours
- Within 5 hours

**Skill Level:**
- Beginner-friendly
- Intermediate
- Advanced/Expert
- Mixed

**Features (multi-select):**
- Has terrain park
- Has halfpipe
- Has glades
- Wide trails (mostly)
- Long runs (>3 km)
- Big beginner area
- Night skiing available

**Important:** We do NOT label resorts as "good for ski" or "good for snowboard" — both can do all features.

### 3.3 Resort Detail Page

When user clicks a resort pin or filter result, they see:

**Hero Section:**
- Resort photo (use Unsplash/Pexels for free, or embed from resort site)
- Resort name
- Drive time from user
- Pass affiliation badge

**Quick Info:**
- Address
- Operating hours (typical season hours)
- Vertical drop
- Number of trails by difficulty (Beginner/Intermediate/Advanced)
- Number of lifts
- Features (terrain park, glades, etc.)

**Weather Forecast:**
- Today, Tomorrow, +2 days, +3 days
- Temperature high/low
- Snowfall (inches)
- Wind speed
- Conditions icon

**External Links:**
- 🌐 "Visit Resort Website" (opens in-app browser)
- 🗺️ "Open in Google Maps" (for navigation)
- 🎟️ "Book Lift Ticket" (affiliate link)
- 🏨 "Book Hotel" (affiliate link to Booking.com)

### 3.4 In-App Browser

When user clicks "Visit Resort Website":
- Opens within Wynla interface
- User stays in our app context
- Can return to map easily
- Resort gets traffic credit (good for partnerships)

### 3.5 User Location

- Browser geolocation (with permission)
- Default to NYC if not granted
- Used for drive time calculations
- Stored locally (no account needed for MVP)

---

## 4. Features NOT in MVP

These are intentionally excluded from version 1:

- ❌ User accounts / authentication
- ❌ AI recommendations
- ❌ Real-time trail status
- ❌ Crowd level estimates
- ❌ Trail map reproduction
- ❌ Mobile native app
- ❌ Multi-day trip planner
- ❌ Compare resorts side-by-side (Phase 2)
- ❌ Save favorites (Phase 2 — needs accounts)
- ❌ Push notifications
- ❌ Social features

---

## 5. User Journey (Critical Flow)

```
1. User opens Wynla.app
   ↓
2. Allow location? → Yes
   ↓
3. See map with resorts near them
   ↓
4. Apply filter: "Ikon Pass" + "Within 3 hours" + "Has terrain park"
   ↓
5. Map updates: now showing 5 resorts
   ↓
6. Click on Windham Mountain pin
   ↓
7. See detail page with:
   - Photo, drive time, pass badge
   - Weather: Tomorrow looks good, fresh snow
   - 6 terrain parks confirmed
   ↓
8. Click "Visit Resort Website" → see live trail status in embedded browser
   ↓
9. Looks good → click "Open in Google Maps" → drive there!
```

**Total time from open to decision: 2-3 minutes** (vs. 15-20 minutes with current 4-app workflow)

---

## 6. Success Metrics

### Phase 1 (MVP Launch):
- 1,000+ unique visitors in first month
- 5-minute average session duration
- 30%+ users return within 7 days
- 50+ Facebook group members try it

### Phase 2 (3-6 months):
- 10,000+ monthly active users
- 100+ affiliate clicks/week
- $500+/month in affiliate revenue
- 4.5+ rating from beta users

### Phase 3 (1 year):
- 50,000+ MAU
- $5,000+/month total revenue
- Featured in ski community publications
- Resort partnership inquiries

---

## 7. Design Principles

### Simplicity First
- Map should be the hero
- Maximum 3 actions visible at once
- No clutter, no cognitive overload

### Speed
- Page load <2 seconds
- Filter changes update map instantly
- Weather data cached aggressively

### Honesty
- Always show data source and last updated time
- Tell users to verify trail status on resort site
- No fake "real-time" claims

### Generosity
- Free tier is fully functional
- No "feature locked" messages on MVP
- Make user successful first, monetize later

---

## 8. Brand Voice

**Tone:** Friendly, direct, helpful — like a knowledgeable ski buddy

**Avoid:**
- Marketing jargon
- Corporate speak
- Over-promising
- Claiming "AI-powered" or "smart" features

**Examples:**

❌ "Wynla leverages AI-powered recommendations to optimize your ski experience"
✅ "Find the best mountain for this weekend — no guessing, no 4 apps."

❌ "Our advanced algorithm predicts perfect conditions"
✅ "Here's the forecast. Here's what your pass works at. You decide."

---

## 9. Competitive Differentiation

| Feature | OpenSnow | OnTheSnow | Slopes | Wynla |
|---------|----------|-----------|--------|----------|
| Pre-trip planning | Partial | Limited | No | **Core focus** |
| Pass filtering | No | No | No | **Yes** |
| Drive time | No | No | No | **Yes** |
| Weather forecast | Best | Yes | No | Yes |
| Free tier | Limited | Yes | Limited | **Generous** |
| In-app browser | No | No | No | **Yes** |
| Trip planning UX | No | No | No | **Yes** |

**Our position:** "The pre-trip planning hub that combines what 4 apps do."

---

## 10. Privacy & Data

### What we collect:
- Approximate location (for drive time)
- Filter preferences (stored locally)
- Anonymous usage analytics

### What we DON'T collect:
- Personal info (no accounts in MVP)
- Precise GPS tracking
- Email addresses (until user opts in)
- Anything that identifies individuals

### Future data strategy:
- Aggregate insights only (never raw data)
- "73% of NYC users visit Hunter first time" — yes
- "John Smith visited Hunter on Jan 15" — never

---

## 11. Monetization (Future)

### Free Forever:
- Map view
- All resorts
- Basic forecast (3 days)
- Filter system
- Resort details
- External links

### Premium ($19/season — Phase 2):
- 7-day forecast
- Multi-mountain compare
- Save favorites
- Trip planner
- Email alerts
- No analytics tracking

### Affiliate Revenue:
- Lift ticket bookings
- Hotel bookings (Booking.com partner)
- Equipment rental
- Equipment purchases

### B2B (Year 2+):
- Sponsored resort listings
- Featured placements
- Aggregated analytics for resorts/passes

---

## 12. Legal & Ethical

### Will Do:
- Use only public information about resorts
- Cite weather data sources
- Respect resort intellectual property
- Privacy-first design
- Honest disclaimers about data accuracy

### Will NOT Do:
- Scrape protected content
- Reproduce copyrighted trail maps
- Sell user data to third parties
- Make claims we can't back up
- Help users circumvent ToS of other services

---

*This is a living document. Update as the product evolves and we learn from users.*
