# RideWise — Business Context

---

## 1. The Business in One Page

**What:** Map-based ski/snowboard trip planning web app

**Who:** Northeast US weekend warriors (NYC area, age 22-40, has a ski pass)

**Why now:** OpenSnow raised prices, no competitor solves end-to-end planning, AI tools enable rapid building

**How we make money:**
- Affiliate revenue (lift tickets, hotels)
- Premium subscription (later)
- B2B partnerships (year 2+)

**Long-term vision:** Become the default planning tool for US skiers, then expand internationally

---

## 2. Founder Profile

**Personal:**
- Age 24
- Aspires to be successful entrepreneur
- Snowboard enthusiast (lives the problem)
- Some business knowledge background
- Limited coding experience

**Time/Resources:**
- Full-time during weekday
- $100-500/month budget
- Solo founder (no co-founder yet)

**Long-term goal:**
- Build great business
- Possible exit in 4-6 years

---

## 3. Market Size

### Total Addressable Market (TAM)
- **7.6 million** US snowboard participants
- **480 ski resorts** in US
- **$16 billion** global ski/snowboard market
- **$4.2 billion** US ski resort market

### Serviceable Available Market (SAM)
- **~3 million** Northeast US skiers/snowboarders
- **50 resorts** within 4 hours of NYC

### Serviceable Obtainable Market (SOM) — Year 1
- **~50,000** active monthly users (2% of NYC area skiers)

---

## 4. Competition

### Direct Competitors

#### OpenSnow (Biggest threat)
- **Strength:** Best snow forecast model (PEAKS)
- **Weakness:** Expensive ($89.99/year), forecast-only, no planning
- **Opportunity:** Their price hike caused user revolt — perfect time to enter

#### OnTheSnow
- **Strength:** Large database, free
- **Weakness:** Old UI, no planning workflow
- **Opportunity:** Modernized version captures users

#### Slopes
- **Strength:** Best tracking app, beautiful design
- **Weakness:** Focus on tracking during skiing, not planning before
- **Opportunity:** Different use case — pre-trip vs in-trip

#### Resort Native Apps
- **Strength:** Most accurate for that resort
- **Weakness:** One mountain only
- **Opportunity:** We aggregate, they specialize

### Indirect Competitors

- Google Maps (used for drive time)
- Weather apps (used for forecast)
- Resort websites
- Reddit/Facebook groups (community advice)

### Why They Won't Crush Us

1. **OpenSnow:** Forecast purist, won't add planning features
2. **Resort apps:** Won't aggregate competitors
3. **Google:** Too generic, doesn't care about ski
4. **Big tech:** Market too small ($100M ceiling) to matter

---

## 5. Business Model

### Revenue Streams

#### Stream 1: Affiliate (Start Day 1)

**Affiliate Programs to Join:**

| Program | Type | Commission | When to Join |
|---------|------|-----------|--------------|
| Booking.com | Hotels | 4-7% | Week 1 |
| Expedia | Hotels/packages | 3-6% | Week 1 |
| Liftopia (if available) | Lift tickets | 5-8% | Week 2 |
| REI Co-op | Equipment | 5% | Week 2 |
| Backcountry | Equipment | 4-8% | Week 2 |
| Amazon Associates | Anything | 1-10% | Week 1 |

**Revenue Projection (Affiliate):**

Year 1:
- 10,000 monthly users
- 5% click affiliate link
- 10% of clicks convert
- Average commission: $10
- Monthly revenue: 10,000 × 0.5% × $10 = **$500/month**

Year 2:
- 50,000 monthly users
- Similar conversion
- **$2,500/month**

Year 3:
- 200,000 monthly users
- **$10,000/month**

#### Stream 2: Premium Subscription (Phase 2)

**Pricing:** $19/season (undercut OpenSnow's $89)

**Premium Features:**
- 7-day forecast
- Multi-mountain compare
- Save favorites
- Email alerts
- No analytics tracking (privacy plus)
- Trip planner

**Conversion Rate Target:** 3-5% of free users

**Revenue Projection (Subscription):**

Year 2:
- 50,000 free users → 1,500 paying ($19) = $28,500/year

Year 3:
- 200,000 free → 8,000 paying = $152,000/year

#### Stream 3: B2B / Partnerships (Year 2+)

**Sponsored Resort Listings:**
- $200-500/month per resort
- 20 resorts in Year 2 = $48,000-120,000/year

**Resort Aggregated Analytics:**
- Sell anonymized insights
- "Where are your users going?"
- $5,000-20,000/year per resort

**Pass Company Partnerships:**
- Featured pass in app
- Co-marketing
- Revenue share on pass purchases

#### Stream 4: NEVER Sell User Data

**Important:** We will not sell individual user data.
- Privacy backlash kills brands
- Legal risk (GDPR, CCPA)
- Aggregated insights ≠ user data

---

## 6. Customer Acquisition

### Phase 1: Free Organic (Year 1)

**Channels:**
1. **Reddit** (r/skiing, r/snowboarding) — share tools genuinely
2. **Facebook Groups** — already established
3. **SEO** — resort detail pages rank for "[resort] snow forecast"
4. **Word of Mouth** — generous free tier creates advocates
5. **Niche Newsletters** — pitch to ski blogs

**Cost:** Time only, $0 spent

### Phase 2: Paid Acquisition (Year 2)

**Channels (when revenue allows):**
1. Reddit ads ($1-5K/month)
2. Instagram ski community
3. Influencer partnerships (small ski YouTubers)
4. Content marketing (resort guides)

**Target CAC:** <$5 per active user
**Target LTV:** $20-30

---

## 7. Unit Economics

### Cost Per User (Year 1)

**Per Active User:**
- Mapbox: $0.001 per map load
- Supabase: ~$0.005 (storage + queries)
- Vercel: ~$0.001
- Weather API: $0 (free tier)
- **Total: ~$0.01 per active user**

### Revenue Per User

**Free user (with affiliate):**
- 0.5% × $10 commission = $0.05 average

**Premium user:**
- $19/year revenue
- 1 user pays for ~1900 free users

**Conclusion:** Even at small scale, profitable from affiliate alone

---

## 8. Competitive Moats

### What Makes Us Defensible?

#### 1. **First-Mover in "Pre-trip Planning"**
No one occupies this position yet.

#### 2. **Data Network Effect (Year 2+)**
- More users = more behavioral data
- Better recommendations possible (later)
- Harder for new entrants to catch up

#### 3. **Brand & Community**
- Become "the ski planner"
- Loyal user base
- Word of mouth growth

#### 4. **Resort Relationships**
- As we drive traffic, resorts want partnerships
- Exclusive data deals possible
- Better than competitors

#### 5. **Niche Focus**
- Big tech won't bother (market too small)
- General weather apps can't match specificity
- We can go deeper than they want

---

## 9. Strategic Decisions

### Critical Decisions Made

#### Decision 1: Free + Affiliate vs Subscription First
**Chose:** Free + Affiliate
**Why:** OpenSnow's price hike showed users hate subscriptions; build user base first

#### Decision 2: Web vs Native App
**Chose:** Web (PWA later)
**Why:** Faster to build, deploy, iterate; SEO benefits

#### Decision 3: Northeast Only or Nationwide
**Chose:** Northeast first, then expand
**Why:** Founder knows market; easier to get traction in concentrated area

#### Decision 4: AI Recommendations or Filters
**Chose:** Filters
**Why:** Skiers have personal preferences; AI feels presumptuous; transparent

#### Decision 5: Show "Best for Ski/Snowboard"
**Chose:** No, show neutral features
**Why:** Resort-friendly (don't lose customer groups); user-empowering

---

## 10. Risks & Mitigation

### Top Risks

#### Risk 1: Solo Founder Burnout
**Probability:** High
**Impact:** Critical (kills project)
**Mitigation:**
- Sustainable pace (5-6 days/week max)
- Find accountability partner
- Set clear milestones
- Celebrate wins

#### Risk 2: OpenSnow Adds Planning Features
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Move fast on UX
- Build community moat
- Niche deeper than they will

#### Risk 3: Climate Change Reduces Skiing
**Probability:** High (long-term)
**Impact:** Medium
**Mitigation:**
- Already planned for shorter seasons
- Indoor skiing growing
- Expand to Southern Hemisphere

#### Risk 4: Vail/Alterra Build Their Own
**Probability:** Low (busy with bigger problems)
**Impact:** High
**Mitigation:**
- Focus on multi-pass users (they won't)
- Independent + Indy resort focus

#### Risk 5: User Acquisition Plateau
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Multi-channel approach
- Content marketing
- Geographic expansion

#### Risk 6: Affiliate Programs Reduce Commissions
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Diversify revenue (subscription + B2B)
- Direct resort relationships

---

## 11. Funding Strategy

### Phase 1 (MVP - Year 1): Bootstrap
- $100-500/month from founder
- No external funding needed
- Goal: Reach $1K/month revenue

### Phase 2 (Growth - Year 2): Revenue-funded
- Reinvest revenue into growth
- Possibly: angel round if growth is exceptional ($100-250K)
- Goal: $10K/month revenue

### Phase 3 (Scale - Year 3+):
- Possible seed round ($500K-1M)
- Or stay bootstrapped
- Goal: Profitability or strong unit economics

### When to Take Money

**Take money if:**
- Growth is constrained by capital
- Hiring would 10x output
- Strategic investor adds value

**Don't take money if:**
- Founder ego ("look at my round")
- Premature scaling
- Lifestyle business is fine

---

## 12. Exit Strategy (Long-term)

### Most Likely Exits (5-7 years)

#### Strategic Acquisition by:
1. **AllTrails** ($100M+ funded, expanding) — 25% probability
2. **Strava** (acquisitive, winter expansion) — 15%
3. **OpenSnow** (lock down competitor) — 30%
4. **Vail/Alterra** (kill competition) — 10%
5. **Travel platforms** (Booking, Expedia) — 10%
6. **Outdoor portfolio** (Outside Inc, Bending Spoons) — 10%

### Realistic Exit Range:

- **Likely:** $5-15M (Year 4-5)
- **Strong:** $20-50M (Year 5-7)
- **Home Run:** $50-200M (Year 7-10)

### Exit Multiples (industry standard):
- 3-10x annual revenue
- $50-200 per active user (niche apps)

### Note: Build for Users, Exit Comes Later

The founders who exit best:
1. Don't think about exit
2. Build product users love
3. Buyers come to them
4. Negotiate from strength

---

## 13. Team Strategy

### Year 1: Solo + AI

**You + Claude/Cursor =** functional team for MVP

**Pros:**
- Maximum equity
- Fast decisions
- Low burn

**Cons:**
- Can be lonely
- Limited bandwidth
- Single point of failure

### Year 1.5: First Hire

**When to hire:** Revenue $2K+/month

**First hire:** Either:
- **Designer** (if UX is bottleneck)
- **Marketer** (if growth is bottleneck)
- **Developer** (if features can't be built)

**Compensation:** Equity + small salary (maybe via contract)

### Year 2: Small Team

- 2-3 people
- Specialized roles
- Founder handles strategy, sales

### Year 3+: Real Company

- 5-15 people
- Department heads
- Founder transitions to CEO role

---

## 14. Metrics to Track

### Month 1-3 (MVP)
- Daily active users
- Sessions per user
- Bounce rate
- Top exit pages

### Month 4-6 (Growth)
- Monthly active users (MAU)
- Retention (Day 1, 7, 30)
- Acquisition channels
- Affiliate clicks

### Month 7-12 (Optimization)
- Customer Acquisition Cost (CAC)
- Lifetime Value (LTV)
- LTV/CAC ratio (target: 3+)
- Churn rate (subscription)

### Year 2+
- Revenue per user
- Cohort retention curves
- Net Promoter Score (NPS)
- Market share

---

## 15. Why This Will Work

### Reasons for Confidence

1. **Real problem** — founder lives it, validated through research
2. **Clear positioning** — "pre-trip planning" is empty category
3. **Right timing** — OpenSnow alienating users, Tools enable solo build
4. **Sustainable model** — no need for VC funding
5. **Defensible long-term** — niche dominance possible
6. **Founder fit** — passionate skier + business mindset

### Reasons for Caution

1. **Solo founder risk** — burnout most likely failure mode
2. **Seasonal business** — 4-5 active months/year
3. **Climate change** — long-term existential risk
4. **Network effects unproven** — might not become viral
5. **Limited TAM** — $50-200M ceiling realistic

---

## 16. North Star Metric

**Primary metric:** **Weekly Active Users (WAU)**

**Why:**
- Tracks engagement, not just signup
- Weekly cadence matches ski trip planning
- Predicts retention and growth

**Targets:**
- Month 1: 100 WAU
- Month 6: 1,000 WAU
- Month 12: 10,000 WAU
- Year 2: 50,000 WAU
- Year 3: 200,000 WAU

---

## 17. Mantras to Remember

When in doubt:

> "Make users successful first, monetize later."

> "Free + generous beats expensive + feature-rich."

> "Ship at 70% perfect. Iterate based on feedback."

> "Talk to users every week, no exceptions."

> "Default to simpler. Complexity is debt."

> "If users love it, they tell friends. If they don't, no marketing helps."

---

*This document captures business strategy decisions. Revisit quarterly.*
