# Wynla — Technical Specification

---

## 1. Tech Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Map:** Mapbox GL JS
- **State Management:** React hooks + Zustand (if needed)
- **Forms:** React Hook Form + Zod validation

### Backend / Database
- **Database:** Supabase (PostgreSQL)
- **Auth (future):** Supabase Auth
- **Storage:** Supabase Storage (for images)

### External APIs
- **Maps:** Mapbox GL JS
- **Weather:** Open-Meteo (free) → upgrade to Tomorrow.io if needed
- **Drive Time:** Mapbox Directions API or Google Distance Matrix
- **Affiliates:** Booking.com Partner API

### Hosting & Deployment
- **Frontend:** Vercel
- **Database:** Supabase Cloud
- **Domain:** TBD (e.g., wynla.app)
- **Analytics:** Plausible or PostHog (free tier)

### Development Tools
- **Editor:** Cursor (AI-powered IDE)
- **Version Control:** Git + GitHub
- **Package Manager:** npm or pnpm
- **Linter:** ESLint
- **Formatter:** Prettier

---

## 2. Why These Choices

### Why Next.js?
- Perfect for SEO (resort pages will rank in Google)
- Server-side rendering = faster page loads
- Easy deploy to Vercel
- Large community, good with AI assistants
- Free tier covers MVP needs

### Why Supabase over Firebase?
- PostgreSQL = standard SQL (easier to learn)
- Better for complex queries (filtering, sorting)
- Generous free tier (500MB database, 50K monthly active users)
- Built-in auth when we need it
- Open source = avoid vendor lock-in

### Why Mapbox over Google Maps?
- Better customization (custom styles for ski theme)
- Cheaper at scale (50K free loads/month vs Google's $200 credit)
- Better performance for many pins
- Cleaner API for AI assistants to work with

### Why Open-Meteo over Tomorrow.io?
- 100% free, no API key needed for basic usage
- No rate limits for reasonable use
- Good accuracy for general forecast
- Can upgrade to Tomorrow.io later for snow-specific predictions

### Why TypeScript?
- AI assistants write better code with TypeScript
- Catches bugs before runtime
- Self-documenting code
- Industry standard

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────┐
│         User's Browser (Next.js)         │
│  ┌────────┐  ┌────────┐  ┌─────────┐    │
│  │  Map   │  │ Filter │  │ Detail  │    │
│  │ (Mapbox)│  │  Bar   │  │  Page   │    │
│  └────────┘  └────────┘  └─────────┘    │
└─────────────────────────────────────────┘
              │              │
              │              │
        ┌─────▼──────┐  ┌────▼────────┐
        │  Supabase   │  │  Open-Meteo  │
        │  Database   │  │  Weather API │
        │  (Resorts)  │  │              │
        └─────────────┘  └──────────────┘
              │
        ┌─────▼──────┐
        │   Mapbox    │
        │ Directions  │
        │    API      │
        └─────────────┘
```

---

## 4. Folder Structure

```
wynla/
├── public/
│   ├── images/
│   │   └── resorts/          # Resort photos
│   └── icons/                # SVG icons
│
├── src/
│   ├── app/
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Home page (map view)
│   │   ├── resort/
│   │   │   └── [slug]/
│   │   │       └── page.tsx  # Resort detail page
│   │   └── api/              # API routes
│   │       └── weather/
│   │           └── route.ts  # Weather fetcher
│   │
│   ├── components/
│   │   ├── Map/
│   │   │   ├── MapView.tsx
│   │   │   ├── ResortPin.tsx
│   │   │   └── MapControls.tsx
│   │   ├── Filter/
│   │   │   ├── FilterBar.tsx
│   │   │   ├── PassFilter.tsx
│   │   │   └── DistanceFilter.tsx
│   │   ├── Resort/
│   │   │   ├── ResortDetail.tsx
│   │   │   ├── WeatherForecast.tsx
│   │   │   └── ResortLinks.tsx
│   │   └── ui/               # Reusable UI components
│   │
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client
│   │   ├── mapbox.ts         # Mapbox helpers
│   │   ├── weather.ts        # Weather API
│   │   ├── distance.ts       # Drive time calculation
│   │   └── utils.ts          # General utilities
│   │
│   ├── types/
│   │   ├── resort.ts         # TypeScript types
│   │   └── weather.ts
│   │
│   └── styles/
│       └── globals.css       # Tailwind + custom CSS
│
├── data/
│   ├── resorts.json          # Initial resort data
│   └── seed.sql              # Database seed
│
├── .env.local                # Environment variables (gitignored)
├── .env.example              # Template for env vars
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 5. Environment Variables

Create `.env.local` (never commit):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxx

# Weather (Open-Meteo doesn't need key)
# Future: Tomorrow.io
# TOMORROW_IO_API_KEY=xxx

# Affiliate (when ready)
# BOOKING_PARTNER_ID=xxx
```

---

## 6. Initial Setup Commands

```bash
# 1. Create Next.js project
npx create-next-app@latest wynla --typescript --tailwind --app

# 2. Navigate into project
cd wynla

# 3. Install dependencies
npm install @supabase/supabase-js mapbox-gl
npm install -D @types/mapbox-gl

# 4. Initialize git
git init
git add .
git commit -m "Initial commit"

# 5. Connect to GitHub
git remote add origin https://github.com/USERNAME/wynla.git
git push -u origin main

# 6. Deploy to Vercel
# (Use Vercel dashboard, connect GitHub repo)
```

---

## 7. Key Implementation Patterns

### 7.1 Loading Resort Data

```typescript
// src/lib/resorts.ts
import { supabase } from './supabase'

export async function getAllResorts() {
  const { data, error } = await supabase
    .from('resorts')
    .select('*')
    .eq('active', true)
  
  if (error) throw error
  return data
}

export async function getResortBySlug(slug: string) {
  const { data, error } = await supabase
    .from('resorts')
    .select('*, features(*), trails(*)')
    .eq('slug', slug)
    .single()
  
  if (error) throw error
  return data
}
```

### 7.2 Weather Fetching (Open-Meteo)

```typescript
// src/lib/weather.ts
export async function getWeatherForecast(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lon}&` +
    `daily=temperature_2m_max,temperature_2m_min,snowfall_sum,windspeed_10m_max&` +
    `timezone=America/New_York&forecast_days=7`
  
  const res = await fetch(url, { 
    next: { revalidate: 3600 } // Cache 1 hour
  })
  return res.json()
}
```

### 7.3 Drive Time (Mapbox)

```typescript
// src/lib/distance.ts
export async function getDriveTime(
  fromLat: number, 
  fromLon: number,
  toLat: number,
  toLon: number
) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/` +
    `${fromLon},${fromLat};${toLon},${toLat}?` +
    `access_token=${token}&overview=false`
  
  const res = await fetch(url)
  const data = await res.json()
  return data.routes[0]?.duration // seconds
}
```

### 7.4 Map Component (Mapbox)

```typescript
// src/components/Map/MapView.tsx
'use client'

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export default function MapView({ resorts }) {
  const mapContainer = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!mapContainer.current) return
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-74.0, 42.0], // NYC area
      zoom: 7
    })
    
    resorts.forEach(resort => {
      new mapboxgl.Marker()
        .setLngLat([resort.longitude, resort.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`
          <h3>${resort.name}</h3>
          <p>${resort.pass}</p>
        `))
        .addTo(map)
    })
    
    return () => map.remove()
  }, [resorts])
  
  return <div ref={mapContainer} className="w-full h-screen" />
}
```

---

## 8. Caching Strategy

### Static Data (resorts info):
- Cache forever, invalidate on update
- Use Supabase + Next.js ISR (Incremental Static Regeneration)

### Weather Data:
- Cache for 1 hour
- Refresh in background

### Drive Times:
- Cache per user session
- Pre-calculate from major cities (NYC, Boston) to all resorts

### Images:
- Use Next.js Image component
- CDN through Vercel

---

## 9. Performance Targets

- **Page load:** <2 seconds
- **Map render:** <1 second
- **Filter update:** <100ms
- **Lighthouse score:** 90+
- **Mobile-friendly:** Required

---

## 10. Security Considerations

### What to protect:
- Supabase service key (server-side only)
- API rate limiting on weather/distance endpoints
- Sanitize all user inputs

### Public-safe:
- Mapbox public token (rate-limited by Mapbox)
- Supabase anon key (with Row Level Security)

### Row Level Security (RLS):
```sql
-- Anyone can read resorts
CREATE POLICY "Public read resorts"
ON resorts FOR SELECT
TO anon
USING (active = true);

-- Only admin can modify
CREATE POLICY "Admin write resorts"
ON resorts FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 11. Deployment Workflow

```
Local development
       ↓
Push to GitHub (main branch)
       ↓
Vercel auto-deploys
       ↓
Live at wynla.app
```

### Deploy commands:
```bash
git add .
git commit -m "Description of change"
git push
# Vercel handles the rest
```

### Preview deployments:
- Every PR gets its own preview URL
- Test before merging to main

---

## 12. Testing Strategy (Phase 2)

For MVP: manual testing is fine.

For production:
- Unit tests: Vitest
- E2E tests: Playwright
- Type checking: TypeScript

---

## 13. Monitoring (Phase 2)

When live:
- **Vercel Analytics** (free, basic)
- **Plausible** for privacy-friendly analytics
- **Supabase logs** for database issues
- **Sentry** for error tracking (optional)

---

## 14. Cost Breakdown (Monthly)

### Free Tier (MVP):
- Vercel: $0
- Supabase: $0 (free tier)
- Mapbox: $0 (under 50K loads)
- Open-Meteo: $0
- Domain: ~$1/month ($12/year)
- **Total: ~$1/month**

### When Scaling (10K-50K users):
- Vercel: $0-20
- Supabase: $0-25
- Mapbox: $0-50
- Tomorrow.io (if upgraded): $35
- Domain: $1
- **Total: ~$50-150/month**

---

## 15. Decision Log (Important)

### Decided:
- ✅ Next.js over Remix (better Vercel integration)
- ✅ Supabase over Firebase (SQL + open source)
- ✅ Mapbox over Google Maps (better customization)
- ✅ Tailwind over CSS modules (AI assistants work better)
- ✅ TypeScript over JavaScript (fewer bugs)
- ✅ App Router over Pages Router (newer Next.js)

### Open Questions:
- 🤔 PWA vs eventual native app
- 🤔 When to add user accounts
- 🤔 Open-Meteo accuracy for snow forecast (test in season)

---

*Update this document as technical decisions are made.*
