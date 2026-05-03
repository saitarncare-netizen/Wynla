# Wynla — Development Roadmap

---

## Overview

This roadmap is designed for a **non-technical founder building with AI assistance** (Cursor + Claude).

**Total time to MVP:** 4-6 weeks at full-time effort

**Philosophy:** Ship something every day. Even if small.

---

## 🎯 Long-Term Vision: Web → PWA → Native Mobile App

**The end goal is for Wynla to live on users' phones as a native app** (App Store + Google Play). However, we are taking a **web-first approach** for these strategic reasons:

1. **Speed to market:** Web launches in 6 weeks, native app takes 6+ months
2. **Cost efficiency:** Web costs $0-15/year, native requires $99/year + dev time
3. **Validation first:** Test idea with real users before investing in mobile
4. **Iteration speed:** Web updates deploy instantly, app updates wait 1-7 days for review
5. **Discoverability:** Users find us via Google search before App Store

### The 3-Phase Mobile Strategy

```
Phase 1: WEB (Month 1-2)  ← MVP, current focus
   ↓
Phase 2: PWA (Month 3)    ← Add "Install on Phone" capability
   ↓
Phase 3: NATIVE APP (Month 6+) ← Full App Store presence
```

### What Carries Forward (Reusable across all phases)

✅ **100% Reusable:**
- Database (Supabase) — same backend for web, PWA, and native app
- API endpoints — same calls work everywhere
- Business logic — filtering, search, drive time calculations
- Brand identity — Wynla name, colors, typography, voice
- User flows + UX design

⚠️ **Partial Rewrite for Native App:**
- UI components (50% — React → React Native)
- Map implementation (Mapbox GL JS → Mapbox GL Native)
- Navigation (Next.js Router → React Navigation)

### Mobile Decision Tree

```
After Web MVP launches:
├─ Users asking "is there an app?" → Add PWA (3 days, $0)
├─ 1000+ monthly users → Build native app (Capacitor or React Native)
└─ <1000 users → Keep optimizing web until traction
```

### Mobile Conversion Options (when ready)

| Method | Time | Cost | App Store | Code Reuse |
|--------|------|------|-----------|------------|
| **PWA** | 2-3 days | $0 | ❌ | 100% |
| **Capacitor** (wrap web) | 2-3 weeks | $99/yr | ✅ | 80% |
| **React Native** (rebuild) | 2-3 months | $99/yr | ✅ | 50% |

**Recommended path:** Start with PWA in Month 3 (cheap insurance), evaluate native app in Month 6+ based on user traction.

---

## 🏁 Phase 0: Setup (Week 1)

**Goal:** Have everything ready to start coding.

### Day 1: Project Initialization

**Tasks:**
1. Open Cursor
2. Open Terminal in Cursor (Ctrl + ` ` ` )
3. Run: `npx create-next-app@latest wynla --typescript --tailwind --app`
4. When prompted, choose: ESLint Yes, src/ folder Yes, App Router Yes, default import alias
5. `cd wynla`
6. `npm run dev`
7. Open http://localhost:3000 — see Next.js welcome page
8. **Win!** First milestone done.

**Verification:** Default Next.js page loads in browser

### Day 2: Git + GitHub

**Tasks:**
1. Initialize git: `git init`
2. Create .gitignore (already exists)
3. Add: `git add .` and commit: `git commit -m "Initial commit"`
4. Create new repo on GitHub: `wynla`
5. Connect: `git remote add origin https://github.com/USERNAME/wynla.git`
6. Push: `git push -u origin main`
7. Visit GitHub, see your code

**Verification:** Code visible on github.com

### Day 3: Vercel Deployment

**Tasks:**
1. Go to vercel.com
2. "Import Project" → Choose wynla repo
3. Click Deploy
4. Wait 1 minute
5. Visit your live URL (e.g., wynla-abc123.vercel.app)

**Verification:** Live URL works, default Next.js page shows

### Day 4: Supabase Setup

**Tasks:**
1. Go to supabase.com, create new project
2. Wait for setup (~2 minutes)
3. Go to SQL Editor
4. Paste schema from `DATABASE_SCHEMA.md` (the resorts table)
5. Run query
6. Go to Table Editor, see empty `resorts` table
7. Insert Hunter Mountain sample data (from schema doc)
8. Verify: `SELECT * FROM resorts;`

**Verification:** One row in resorts table

### Day 5: Mapbox Account

**Tasks:**
1. Sign up at mapbox.com
2. Get public access token
3. Save token (we'll use it next week)

**Verification:** Token visible in Mapbox dashboard

### Day 6: Environment Setup

**Tasks:**
1. In your project, create `.env.local`
2. Add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_MAPBOX_TOKEN=...
   ```
3. Get Supabase keys from: Project Settings → API
4. Get Mapbox token from: Account Dashboard
5. Add `.env.local` to `.gitignore` (already there)

**Verification:** All 3 env vars set, NOT committed to git

### Day 7: Buffer Day

Use this day to:
- Catch up on anything stuck
- Read documentation
- Watch tutorial on Next.js basics (optional, 30 min)
- Prepare resort data spreadsheet

---

## 🏗️ Phase 1: Resort Data (Week 2)

**Goal:** Have 30 resorts in database, ready to display.

### Day 1-2: Resort Data Collection

**Tasks:**
1. Open Google Sheet
2. Copy the resort list from `DATABASE_SCHEMA.md`
3. For each resort (30 total), fill in:
   - Lat/Lng (from Google Maps)
   - Pass affiliation
   - Trail counts
   - Vertical drop
   - Features (terrain park, etc.)
   - Website URL
   - Trail map URL
4. Use AI to help: "Find lat/lng for Hunter Mountain ski resort NY"

**Time saver:** Use Cursor AI to help parse Wikipedia pages

### Day 3: Hero Images

**Tasks:**
1. For each resort, find a free image:
   - Search Unsplash for "Catskills mountains snow"
   - Save URL of suitable image
   - Add to spreadsheet
2. Don't search for resort name (copyright issues)
3. Use generic mountain/snow photos

### Day 4: Database Import

**Tasks:**
1. Convert spreadsheet to JSON
2. Use AI: "Convert this CSV to SQL INSERT statements for Supabase"
3. Paste SQL into Supabase SQL Editor
4. Run, verify all 30 resorts inserted

**Verification:** `SELECT COUNT(*) FROM resorts` returns 30

### Day 5: Drive Time Pre-computation

**Tasks:**
1. Choose 4 origin cities: NYC, Boston, Philadelphia, Hartford
2. For each (resort × origin), get drive time from Mapbox
3. Insert into `drive_time_cache` table
4. **Tip:** Cursor AI can write a script to do this

### Day 6-7: Buffer / Refinement

Use to:
- Fix data errors
- Add missing fields
- Verify accuracy
- Take a break (avoid burnout)

---

## 🗺️ Phase 2: Map View (Week 3)

**Goal:** Interactive map showing all resorts.

### Day 1: Install Mapbox

**Tasks:**
```bash
npm install mapbox-gl
npm install -D @types/mapbox-gl
```

In Cursor, ask:
> "Help me create a basic Mapbox map component in /src/components/Map/MapView.tsx that shows the Northeast US"

### Day 2: Connect Supabase

**Tasks:**
```bash
npm install @supabase/supabase-js
```

Create `/src/lib/supabase.ts` (Cursor will help)

Test connection:
```typescript
const { data } = await supabase.from('resorts').select('*')
console.log(data) // Should see 30 resorts
```

### Day 3: Display Resorts as Pins

**Tasks:**
- Fetch resorts from Supabase
- Loop through, create Mapbox marker for each
- Customize pin color by pass

Ask Cursor:
> "Update MapView.tsx to fetch resorts from Supabase and display each as a colored pin based on their pass"

### Day 4: Pin Interactivity

**Tasks:**
- Click pin → show popup with name, drive time, pass
- Hover pin → highlight
- Pin styling per design guide

### Day 5: Layout & Header

**Tasks:**
- Add header with logo (text for now)
- Sidebar placeholder for filters
- Make map responsive (mobile + desktop)

### Day 6-7: Polish & Test

- Test on mobile
- Fix bugs
- Deploy to Vercel
- **Share with 5 friends for first feedback**

---

## 🔍 Phase 3: Filters (Week 4)

**Goal:** Users can filter resorts on the map.

### Day 1: Filter UI

**Tasks:**
- Build filter sidebar component
- Pass selector (Epic/Ikon/Indy/Independent)
- Distance dropdown (2/3/4/5 hours)
- Skill level checkboxes

Ask Cursor:
> "Create a FilterBar component with these filters: pass (single select), distance (single select), skill levels (multi select)"

### Day 2: State Management

**Tasks:**
- Use React state to track filter values
- Pass state from FilterBar to MapView
- Update map pins based on filters

### Day 3: Filter Logic

**Tasks:**
- Implement filtering query in Supabase
- Or filter on client side (simpler for MVP)
- Test: select Ikon, only Ikon resorts show

### Day 4: More Filters

**Tasks:**
- Features filter (terrain park, glades, etc.)
- Trail width preference
- Beginner area size

### Day 5: Filter Persistence

**Tasks:**
- Save filters to localStorage
- Restore on page reload
- Add "Clear filters" button

### Day 6-7: Polish

- Mobile filter UI (bottom sheet?)
- Animations
- Empty state when no matches
- Deploy

---

## 📋 Phase 4: Resort Detail Page (Week 5)

**Goal:** Click pin → see full resort details.

### Day 1: Routing

**Tasks:**
- Create `/src/app/resort/[slug]/page.tsx`
- Fetch resort by slug
- Display basic info

### Day 2: Layout

**Tasks:**
- Hero image with resort name
- Drive time indicator
- Pass badge
- Quick stats (vertical, trails, lifts)

### Day 3: Weather Integration

**Tasks:**
- Create `/src/lib/weather.ts` 
- Fetch from Open-Meteo
- Display 7-day forecast

Ask Cursor:
> "Help me build a weather forecast component that fetches from Open-Meteo and shows next 7 days for a given lat/lng"

### Day 4: External Links

**Tasks:**
- "Visit Resort Website" button → opens in new tab (or in-app browser)
- "Open in Google Maps" → opens Maps app
- "Book Lift Ticket" → external link (with affiliate later)

### Day 5: In-App Browser

**Tasks:**
- Iframe with resort website
- Header with "Back to Wynla" button
- Handle iframe security (some sites block embedding)

### Day 6-7: Polish & Buffer

---

## ✨ Phase 5: Polish & Launch (Week 6)

**Goal:** Make it ready for real users.

### Day 1: Bug Hunt

**Tasks:**
- Test every feature
- Fix obvious bugs
- Test on iPhone, Android, desktop

### Day 2: Performance

**Tasks:**
- Optimize images (Next.js Image component)
- Add loading states
- Cache weather data
- Lighthouse audit

### Day 3: SEO

**Tasks:**
- Meta tags for each page
- Open Graph for social sharing
- Sitemap
- robots.txt

### Day 4: Analytics

**Tasks:**
- Add Plausible or PostHog
- Track key events:
  - Page view
  - Resort detail view
  - External link click
  - Filter applied

### Day 5: Domain & Branding

**Tasks:**
- Buy domain (e.g., wynla.app)
- Connect to Vercel
- Add basic logo (text-based for MVP)
- Favicon

### Day 6: Soft Launch

**Tasks:**
- Post in Facebook groups (where you posted before)
- Share with friends
- Reddit r/skiing introduction post
- Track first 100 visitors

### Day 7: Listen & Iterate

**Tasks:**
- Read all feedback
- Fix critical issues
- Plan next features
- **Celebrate!** You shipped a real product.

---

## 📅 Beyond MVP (Week 7+)

Once MVP is live:

### Week 7-8: User Feedback Loop
- Collect feedback systematically
- Fix top 3 issues
- Add 1-2 most-requested features

### Week 9-10: Affiliate Integration
- Sign up: Booking.com Partner Program
- Add affiliate links
- Track conversion

### Month 3: Growth + Phase 6 Mobile (PWA)
- SEO content (resort guides)
- Content marketing
- Reach out to ski influencers
- Submit to Product Hunt
- **Phase 6: PWA Implementation** (see below)

### Month 4-5: Phase 2 Features
- User accounts
- Save favorites
- Trip planner
- Premium tier

### Month 6+: Phase 7 Native Mobile App
- **Decision point:** If 1000+ monthly users → invest in native app
- See Phase 7 details below

---

## 📱 Phase 6: PWA Implementation (Month 3)

**Goal:** Make Wynla installable on users' phones — bridge between web and native app.

**Why PWA first:** Users get app-like experience without App Store wait. Costs $0, takes 2-3 days, validates whether users actually want to install.

### Day 1: PWA Setup

**Tasks:**
1. Create `manifest.json` in `/public`:
   - App name: "Wynla"
   - Short name: "Wynla"
   - Icons: 192x192, 512x512
   - Theme color: #1E2952 (Wynla navy)
   - Display: standalone
   - Start URL: /

2. Create app icons (5 sizes):
   - 72x72, 96x96, 144x144, 192x192, 512x512
   - Use Wynla "W" logo or wordmark

**Ask Claude Code:**
> "Set up PWA for Wynla. Create manifest.json with brand colors and add to Next.js app. Generate placeholder icons in 5 sizes."

### Day 2: Service Worker

**Tasks:**
1. Install `next-pwa` package:
   ```bash
   npm install next-pwa
   ```
2. Configure in `next.config.js`
3. Test offline mode (basic caching)
4. Cache resort data for offline viewing

**Verification:** Open Chrome DevTools → Application → Service Workers shows registered SW.

### Day 3: Install Prompt + Polish

**Tasks:**
1. Add "Install on Phone" button in header (mobile only)
2. Customize install prompt
3. Test on iPhone Safari + Android Chrome
4. Verify icon appears on home screen
5. Test offline behavior

**Verification:**
- iPhone: Safari → Share → "Add to Home Screen" → Wynla icon
- Android: Chrome shows install banner automatically

**Result:** Users can install Wynla on phone home screen. Looks/feels like native app. No App Store needed.

---

## 📱 Phase 7: Native Mobile App (Month 6+)

**Goal:** Wynla in App Store + Google Play Store.

**Decision criteria — only proceed if:**
- ✅ 1000+ monthly active users on web
- ✅ Users asking "is there an app?" frequently
- ✅ MVP features stable (no major bugs)
- ✅ Have $200-500 budget for store fees + tools

### Choose Your Path

**Option A: Capacitor (Faster, 80% code reuse) — RECOMMENDED**

Wraps existing Next.js web app into native iOS + Android apps.

**Timeline:** 2-3 weeks

**Steps:**
1. Install Capacitor: `npm install @capacitor/core @capacitor/ios @capacitor/android`
2. Initialize: `npx cap init Wynla com.wynla.app`
3. Add platforms: `npx cap add ios && npx cap add android`
4. Build web: `npm run build && npx cap sync`
5. Open in Xcode (iOS) or Android Studio
6. Configure splash screens, app icons
7. Test on physical devices
8. Submit to App Store + Google Play

**Pros:** Fast, reuses existing code, single codebase
**Cons:** Some animations less smooth than true native

**Option B: React Native (Premium, 50% code reuse)**

Rebuild UI in React Native for best mobile performance.

**Timeline:** 2-3 months

**Steps:**
1. Initialize React Native project (separate codebase)
2. Reuse: API calls, business logic, types
3. Rebuild: All UI components in React Native
4. Use `react-native-mapbox-gl` for maps
5. Submit to stores

**Pros:** True native performance, smooth animations, professional feel
**Cons:** Significantly more time + maintenance (two codebases)

### Required for Both Paths

- **Apple Developer Account:** $99/year
- **Google Play Console:** $25 one-time
- **App icons:** 1024x1024 master + various sizes
- **Screenshots:** 6.5" iPhone, 5.5" iPhone, iPad, Android phone, Android tablet
- **Privacy policy:** Required by both stores
- **App description:** Compelling pitch in store listing

### Submission Timeline

- **Apple:** 1-7 days review (often 24-48 hours)
- **Google:** 1-3 days review (often same day)
- **First submission:** Allow 2 weeks for fixes/resubmission

### Post-Launch Mobile Strategy

- Monitor app store reviews
- Respond to feedback within 48 hours
- Push notifications for snow alerts (Phase 2 feature)
- App Store Optimization (ASO) — keywords, screenshots
- Promote app download from web (banner)

---

## 🚧 Common Pitfalls & How to Avoid

### Pitfall 1: Scope Creep
**Symptom:** "Let me also add this small feature..."
**Solution:** Write feature on Phase 2 list, ship MVP first

### Pitfall 2: Perfectionism
**Symptom:** "It's not pretty enough to share"
**Solution:** Share at 70% perfect. Polish based on feedback.

### Pitfall 3: Tech Debt Spiral
**Symptom:** Code becomes messy fast
**Solution:** Refactor every 2 weeks for 1 day

### Pitfall 4: Solo Burnout
**Symptom:** Working 12+ hours daily
**Solution:** Sustainable pace. Take weekends off when possible.

### Pitfall 5: No User Validation
**Symptom:** Building features no one asked for
**Solution:** Talk to real users every week

---

## 📊 Daily Routine Suggestion

```
9:00 AM  - Open Cursor, review yesterday's work
9:30 AM  - Code/build (deep work)
12:00 PM - Lunch break
1:00 PM  - Code/build continue
4:00 PM  - Test what you built today
5:00 PM  - Commit & push to GitHub
5:30 PM  - Plan tomorrow's tasks
6:00 PM  - Done. Don't work after dinner.
```

**Weekly:**
- Monday: Plan week
- Friday: Demo to friend, get feedback
- Saturday: Off
- Sunday: Read/learn (optional)

---

## 🆘 When You're Stuck

### Stuck on a coding problem?
1. Ask Cursor AI (built-in)
2. Search exact error on Google
3. Check Stack Overflow
4. Take a break, come back fresh

### Stuck on a decision?
1. Default to simpler option
2. Ship it, iterate later
3. Ask in startup Discord/Reddit

### Stuck mentally?
1. Talk to a skier friend about Wynla
2. Re-read your "why"
3. Take a day off
4. Don't be a hero — sustainable > sprints

---

## 🎯 Success Metrics by Phase

### Phase 0-1 (Setup): Done = Working dev environment
### Phase 2 (Map): Done = Map shows resorts on live site
### Phase 3 (Filters): Done = Filters change visible resorts
### Phase 4 (Detail): Done = Click pin → see full info + weather
### Phase 5 (Launch): Done = 100+ real users have visited
### Phase 6 (PWA): Done = Users install on phone home screen
### Phase 7 (Native App): Done = Wynla live in App Store + Google Play

---

## 🏆 You'll Know You're Doing Well When:

- [ ] You ship something every week
- [ ] Friends use it without you asking
- [ ] Random Facebook user emails feedback
- [ ] You wake up excited to keep building
- [ ] First affiliate dollar comes in
- [ ] Someone asks "is this your job?"
- [ ] A resort emails to ask about partnership

---

*Update this roadmap weekly. Cross off tasks. Celebrate wins.*

**Remember:** Most successful founders look back and realize the journey was more valuable than the destination. Enjoy the build.
