# Wynla — Project Handoff Document

**For: Cursor AI / Any AI Assistant working on this project**
**From: Claude (planning phase)**
**Last Updated: May 2026**

---

## 🎯 What This Folder Contains

This folder is the **complete context** for the Wynla project. Read these files in order:

1. **README.md** (this file) — Quick overview
2. **PRODUCT_SPEC.md** — What we're building and why
3. **TECHNICAL_SPEC.md** — How to build it
4. **DATABASE_SCHEMA.md** — Data structure
5. **DESIGN_GUIDE.md** — UI/UX principles
6. **DEVELOPMENT_ROADMAP.md** — Step-by-step build order
7. **BUSINESS_CONTEXT.md** — Business model and strategy

---

## 🚀 Quick Start for AI Assistants

You are helping build **Wynla** — a map-based ski/snowboard trip planning web app for the US market.

**Founder profile:**
- Age 24, snowboard enthusiast
- Limited coding background (HTML/CSS/JS basics being learned)
- Time commitment: full days during the week
- Budget: $100-500/month
- Goal: Build a real business, possibly exit in 4-5 years

**Key principles when assisting:**
1. **Explain everything simply** — assume founder is non-technical
2. **Build incrementally** — small wins, ship often
3. **Use modern, simple tech** — Next.js, Supabase, Mapbox, Vercel
4. **Avoid over-engineering** — MVP first, polish later
5. **Show, don't tell** — code examples > theory

---

## 🎿 The Product in One Sentence

> "Wynla is a one-stop web app that helps NYC-area skiers and snowboarders plan their weekend trips by combining map, weather forecast, ski pass info, and resort details — all in one place."

---

## 📍 Current State

- ✅ Product vision defined
- ✅ Market research completed
- ✅ Tech stack chosen
- ✅ Service accounts created (GitHub, Vercel, Supabase, Mapbox)
- ✅ Tools installed (Node.js, Git, Cursor)
- ⏳ Database schema (next step)
- ⏳ Resort data collection (next step)
- ⏳ MVP build (next step)

---

## 📁 Folder Structure (when project starts)

```
wynla/
├── handoff-docs/          # This folder (planning docs)
├── src/
│   ├── app/               # Next.js pages
│   ├── components/        # React components
│   ├── lib/               # Utilities
│   └── styles/            # CSS
├── public/                # Static assets
├── data/
│   └── resorts.json       # Resort database
├── package.json
└── README.md
```

---

## 🗣️ Communication with Founder

**Founder's primary language:** Thai (but understands English technical terms)
**Preferred style:**
- Clear, structured explanations
- Show what's happening at each step
- Ask before making major decisions
- Use emojis sparingly to make sections scannable
- Don't assume technical knowledge

**Founder's working style:**
- Likes to understand "why" before "how"
- Wants to learn while building
- Asks good strategic questions
- Sometimes wants to skip steps — gently push back if it matters

---

## ⚠️ Important Constraints

1. **No real-time scraping of resort websites** (legal risk)
2. **No reproducing copyrighted trail maps** (link out instead)
3. **No assumptions about which resort is "better" for ski vs snowboard** (show features, let user decide)
4. **No native mobile app initially** (web-first, PWA later)
5. **Free tier must be generous** (avoid OpenSnow's mistake)

---

## 🎯 First Build Goals (MVP)

1. Map showing 30 NE US ski resorts
2. Filter by: Pass, Distance, Skill level, Features
3. Resort detail page with weather forecast
4. Embedded browser to view resort website
5. Drive time integration with Google Maps
6. Affiliate links for booking (Booking.com, etc.)

---

## 🚫 Out of Scope for MVP

- AI recommendations (use filters instead)
- Trail tracking during skiing
- Social features
- Mobile native app
- Multi-language support
- Real-time trail status
- User accounts (Phase 2)

---

## 📞 Next Action for AI Assistant

When founder opens this in Cursor and asks for help:

1. **First:** Read all .md files in this folder
2. **Then:** Acknowledge what you understand
3. **Then:** Ask: "Which task should we start with? Database setup, project initialization, or something else?"

**Recommended starting task: Initialize Next.js project + Supabase connection**

---

*This document was prepared by Claude during the planning phase. All decisions and recommendations herein are starting points — adapt based on real user feedback and execution learnings.*
