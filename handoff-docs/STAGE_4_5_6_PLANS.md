# Wynla — Stage 4, 5, 6 Detailed Plans

These are the upcoming stages after the Data Refresh is complete.

---

## 🗺️ STAGE 4: Beautiful Map Experience

**Time estimate:** 3-4 days total, split into 4 sub-stages
**Goal:** Map UX feels like AllTrails / Komoot quality

### Sub-stage split (locked 2026-05-04 kickoff)

| Sub-stage | Focus | Time |
|-----------|-------|------|
| **4.1 Map Foundation** | 2D US map + Alaska inset, pin clustering, pass-color + size-tier pins, initial filters (pass + size), mobile touch fix | 1–1.5 days |
| **4.2 Detail Experience** | Side panel (desktop) / bottom sheet (mobile), filter persistence in URL, **Windy.com + OpenSnow link-outs** | 1 day |
| **4.3 Smart Features** | Drive-time calc (OpenRouteService), distance filter (day-trip/weekend modes), sorting | 1 day |
| **4.4 Polish** | Animations, empty/loading states, virtualized rendering for 451 markers | 0.5 day |

Cadence: each sub-stage is its own session — confirm + commit + report between.

### Stage 4.1 — confirmed scope (start here)

- 2D US map (Mapbox) + Alaska inset (lower-left corner)
- Pin clustering when zoomed out (Mapbox supercluster)
- Pin colors per pass (Ikon = `#F2C200`)
- Filters: pass (chips) + size (3-tier by vertical drop)
- Pin sizes: 12/16/20 px visible, **44×44 px touch target NON-NEGOTIABLE**
- Mobile responsive (click-vs-drag detection at clickTolerance=5)
- Multi-pass rendering: Claude Code proposes 1–2 options at start of 4.1; user picks

### Stage 4.2 — side panel external links

- **Windy.com** (wind, NEW) — `https://www.windy.com/?wind,{lat},{lng},12` — auto-gen per resort, no API
- **OpenSnow** (snow, existing) — keep current pattern
- Resorts without lat/lng: hide Windy button OR fallback to windy.com homepage



### 4.1 Map Strategy: 2D Flat Map (NOT 3D Globe)

DECISION: Use 2D flat map with Alaska inset
- Better UX for trip planning (vs rotating globe)
- Standard for outdoor apps
- Better mobile performance
- Easier pin clustering and filters

### 4.2 Layout: Mainland + Alaska Inset

Default view:
- Main map: Mainland USA (lower 48 states)
- Inset (bottom-left): Alaska (separate small map, ~6 pins)

Alaska inset specs:
- Position: Bottom-left corner
- Size: 200x150px desktop, 120x90px mobile
- Bordered, slightly transparent
- Label: "ALASKA"
- Same pin system as main map

### 4.3 Custom Mapbox Theme
- Use Mapbox Studio for custom style
- Wynla aesthetic:
  - Background: Off-white #FAFAF7 with subtle texture
  - Water: Light blue (#E0F2FE)
  - Snow regions: White highlights at higher elevations
  - Roads: Subtle gray
  - State borders: Soft lines

### 4.4 Pin System

Featured resorts:
- Custom marker with pass color background
- Star icon overlay
- Size: 32px
- Hover: scale to 40px (200ms)

Listed resorts:
- Smaller circle marker
- Pass color (70% opacity)
- Size: 16px (visual) + 24px (touch target via padding)
- Hover: scale to 20px

### 4.5 Pin Clustering (Mapbox supercluster)
- Zoom 1-4: Cluster heavily, show numbers like "157"
- Zoom 5-7: Mix of clusters + featured pins
- Zoom 8-10: Individual pins
- Zoom 11+: Full detail with labels

### 4.6 Interactions

Hover pin:
- Tooltip with thumbnail + name + drive time
- Smooth fade in/out (200ms)

Click pin:
- Side panel slides from right (350px desktop)
- Mobile: bottom sheet (50% screen, swipe to expand)
- Heart icon to favorite (Stage 5)

### 4.7 Filters Panel
- Pass filter (5 colored chips)
- From city selector
- Drive time slider
- Featured Only toggle

### 4.8 Mobile Adaptations
- Touch-friendly buttons (min 44x44px)
- Map gestures (pinch zoom, drag)
- Bottom sheet on mobile
- Hamburger menu for filters

### 4.9 Drive Times for Listed Tier
- Use OpenRouteService API (free 2000/day)
- Compute on-demand when user clicks listed resort
- Cache results in DB
- Show from selected origin city

### 4.10 Mobile UX Fixes (from Stage 2 issues)
- Fix click vs drag detection (clickTolerance: 5)
- Disable accidental pitch/rotate on mobile
- Add visual feedback on tap (scale + ripple)
- Replace popups with bottom sheet on mobile

---

## 🔐 STAGE 5: User Authentication + Saved Items

**Time estimate:** 5-7 days
**Goal:** Users can sign up, save favorites, plan trips

### 5.1 Authentication (Supabase Auth)

Methods:
1. Magic Link (email - passwordless, easiest UX) — PRIMARY
2. Google OAuth (one-click)
3. Optional: Apple Sign In

User flow:
1. Click "Sign in" in header
2. Modal: "Continue with Google" + email magic link
3. Magic link: email with auto-login link
4. Branded with Wynla colors

### 5.2 User Profile

Database table: profiles
- id (uuid, FK to auth.users)
- email
- display_name (optional)
- avatar_url
- preferred_city (NYC/Boston/Philly/Hartford)
- created_at, updated_at

UI:
- Avatar in top-right when logged in
- Dropdown: Profile, Favorites, Trips, History, Sign out
- Profile page: edit name, change preferred city

### 5.3 Favorite Resorts

Table: favorites
- user_id, resort_id, created_at
- Composite unique key

UI:
- Heart icon on cards and detail pages
- Click → toggle (optimistic UI)
- "Pop" animation when adding
- /favorites page: grid of saved resorts

### 5.4 Trip Planning

Table: trips
- id, user_id, name, planned_date, description
- created_at, updated_at

Table: trip_resorts
- trip_id, resort_id, order_index, notes

UI:
- "Add to trip" button on resort detail
- Modal: select existing or create new
- /trips: list of all trips
- /trips/[id]: detail with map + drag to reorder
- Total drive time calculator

### 5.5 Recently Viewed

Table: viewed_resorts
- user_id, resort_id, viewed_at
- Auto-track on detail page visits
- Show last 20 in /history

### 5.6 Auth Guards
Public: /, /resort/[id]
Auth required: /favorites, /trips, /profile, /history

### 5.7 Row Level Security (Supabase RLS)
- Users can only access their own data
- Resorts table: public read

---

## ✨ STAGE 6: Final Premium Polish

**Time estimate:** 3-5 days
**Goal:** Production-ready launch

### 6.1 Animations & Micro-interactions
- Page transitions (smooth fade, 300ms)
- Card hover (scale 1.02, shadow lift)
- Loading skeletons (not blank)
- Pin hover animations
- Heart icon "pop" when favoriting

### 6.2 States
**Loading:** Skeleton loaders matching layout
**Empty:**
- No filter results: illustration + "Try different filters"
- Empty favorites: "No favorites yet — explore!"
- Empty trips: "Plan your first trip"

**Error:**
- Network error: "Connection issue. Reload?"
- 404: branded + "Back to map"

### 6.3 Mobile Responsive (Critical)
Test on: 320px, 375px, 414px, 768px
- Touch targets 44x44px+
- Bottom sheet (instead of side panel)
- Hamburger menu
- Mobile-optimized auth

### 6.4 Performance
Targets:
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 95+

Optimizations:
- Next.js Image (WebP)
- Lazy loading
- Code splitting
- Cache API responses
- Prefetch on hover

### 6.5 SEO
- Meta tags per page
- Open Graph (1200x630)
- Twitter Cards
- Sitemap.xml (all 500 resort pages)
- robots.txt
- Schema.org SkiResort
- Canonical URLs

### 6.6 Analytics
Use Vercel Analytics or Plausible:
Track: page_view, filter_used, resort_clicked, signup, favorite_added, trip_created

Privacy:
- Cookie consent (GDPR/CCPA)
- Privacy policy
- Terms of service

### 6.7 Email (Welcome flow)
Use Supabase + Resend:
- Welcome email after signup
- Branded with Wynla colors
- Unsubscribe link

### 6.8 Connect wynla.app Domain
- Add domain in Vercel
- Configure DNS in Namecheap
- SSL auto-provisions
- Update environment variables: NEXT_PUBLIC_SITE_URL=https://wynla.app
- Update OpenGraph URLs
- Update sitemap URLs
- Submit to Google Search Console

### 6.9 PWA — pulled forward from Month 3 (locked 2026-05-07)
**Why moved up:** user wants "feels like an app" experience at launch, not 3 months after.
- Add `manifest.json` (icons 192/512, theme color, display=standalone)
- Add service worker (offline shell + Mapbox tile cache)
- Apple touch icon + iOS splash screens
- "Add to Home Screen" prompt (custom UI on first map view)
- Test: iOS Safari + Android Chrome both → install icon, fullscreen, no Safari chrome
- Estimated +1.5 days within Stage 6
- **80% of native-app feel without App Store review overhead.** Native iOS deferred to Stage 7.

### 6.9 Final QA Checklist

Before deployment:
- [ ] All resorts loading correctly
- [ ] Map clustering smooth
- [ ] Alaska inset functional
- [ ] All filter combinations tested
- [ ] Auth flow (magic link + Google) works
- [ ] Favorites persist
- [ ] Trips work end-to-end
- [ ] Mobile responsive iOS Safari
- [ ] Mobile responsive Android Chrome
- [ ] Lighthouse scores met
- [ ] No console errors
- [ ] No broken links
- [ ] SEO meta tags present
- [ ] Analytics firing
- [ ] Welcome email sends
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

---

## 🚀 LAUNCH DAY

After Stage 6 complete:

1. **Soft launch** (Day 1):
   - Post in NYC snowboard Facebook groups
   - Post in r/skiing, r/snowboarding (Reddit)
   - DM 10-20 commenters from Snowboard The East post (warm leads)
   - Target: 100 visitors first day

2. **Iterate** (Week 1-2):
   - Watch analytics
   - Listen to feedback
   - Fix top 3 issues
   - Add 1-2 most-requested features

3. **Scale** (Month 2+):
   - SEO content (resort guides)
   - Affiliate integration
   - Reach out to ski influencers
   - Submit to Product Hunt

---

## 🎯 STAGE 7: Native iOS App (post-launch milestone)

**Trigger:** ~500–1,000 PWA users with measurable retention. Don't start before that signal — the cost (3-4 weeks + $99/yr + App Store review cycle) is only worth it once we know users WILL come back, not just once.

**Time estimate:** 2-3 weeks (Capacitor wrap of existing web app)

**Why post-launch (locked 2026-05-07):**
- App Store first-submission review = 2-4 weeks for solo dev
- $99/yr Apple Developer Program (bootstrap cash cost)
- Each update = 1-7 day review cycle (kills iteration speed)
- Real moat is best-in-class UX + SEO compounding, not "we have an app too"
- Komoot wasn't first hiking app; OnTheSnow ships apps for 10+ years — niche-app first-mover risk is overrated
- PWA covers 80% of native value (home-screen icon, fullscreen, push) at 5% of effort

### 7.1 Capacitor wrap
- `npx cap add ios` against existing Next.js export
- Native shell: navigation, status bar, splash screen
- Mapbox SDK iOS native (better perf than mapbox-gl in webview)
- Native location services for "find resorts near me"

### 7.2 App Store assets
- App icon (1024×1024 + variants)
- 6 screenshots per device (6.7", 6.1", 5.5")
- App Store description + keywords (ASO)
- Privacy policy URL
- Demo video (App Preview)

### 7.3 iOS-specific features (justifying native vs PWA)
- Native push notifications (snow alerts, drive-time updates)
- Apple Maps integration (deeplink for navigation)
- Haptic feedback on filter changes / pin selection
- iOS share sheet integration ("Share resort with friend")

### 7.4 Submission + iteration
- TestFlight beta (50 user limit free)
- App Store Connect submission
- Phased rollout (1% → 10% → 100% over 7 days)

---

## 📈 Post-Launch Roadmap (Optional)

### Stage 7 (above): Native iOS
Triggered by retention signal, not calendar.

### Phase 2 features (Month 4-5)
- Snow alerts (push notifications) — works in PWA on Android, native on iOS
- Save trip preferences
- "Plan with friends" (shared trips)
- Pro tier launch ($19.99/year)
- **Pro waitlist form should be live from Stage 6 launch** to collect willingness-to-pay signal pre-paywall

### Android native (Month 8+)
- If iOS hits 5K users → mirror to Android via same Capacitor codebase
- Lower priority than iOS for ski/snowboard demographic (skews iOS)

---

## 💡 Important Reminders

1. Don't skip stages
2. Test thoroughly between stages
3. Commit + push after every stage
4. Mobile responsive at EVERY stage
5. User principle: NULL > guess
6. Quality over coverage (Tiered approach)
7. Honest with users (Trust signals)

---

**See CURRENT_STATUS.md for current state and next action.**
