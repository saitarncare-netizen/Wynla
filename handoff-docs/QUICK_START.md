# Wynla — Quick Start Guide

**For: Founder using Cursor for the first time on this project**

---

## ⚡ Read This First (5 minutes)

You have all the planning done. Now it's time to build.

This guide tells you **exactly** what to do in Cursor, step by step, for your first day.

---

## 🎯 Day 1 Goal

By end of today: **Working Next.js app deployed to Vercel, connected to Supabase, showing "Hello Wynla"**

Time required: 2-4 hours

---

## 📋 Pre-flight Checklist

Before opening Cursor, verify:

- [ ] Node.js installed (`node --version` shows v20+)
- [ ] Git installed (`git --version` shows version)
- [ ] Cursor installed and working
- [ ] GitHub account created
- [ ] Vercel account created (linked to GitHub)
- [ ] Supabase account created
- [ ] Mapbox account created with token saved
- [ ] This `wynla-handoff` folder downloaded to your computer

---

## 🚀 Step-by-Step: First Session in Cursor

### Step 1: Open Cursor (1 min)

1. Launch Cursor
2. Choose "Open Folder"
3. Create new folder on Desktop called `wynla`
4. Open it

### Step 2: Move Handoff Docs (1 min)

1. Inside `wynla`, create folder: `handoff-docs`
2. Copy all 7 .md files from this folder into `handoff-docs/`
3. This way Cursor AI can read your project context

### Step 3: Open Terminal in Cursor (30 sec)

1. Press `Ctrl + ` ` `  (or View → Terminal)
2. Terminal opens at bottom

### Step 4: Initialize Next.js Project (3 min)

In terminal, type:

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

When prompted:
- Use ESLint? **Yes**
- Use src/ directory? **No** (we'll use app folder directly)
- Use App Router? **Yes**
- Customize import alias? **No**

Wait 1-2 minutes for installation.

**Verification:** Type `ls` — you should see folders like `app`, `public`, `node_modules`

### Step 5: Test Default App Works (1 min)

```bash
npm run dev
```

Open browser to http://localhost:3000

**You should see:** Default Next.js welcome page

If yes: 🎉 First milestone done
If no: Stop and ask Cursor AI: "I get an error running npm run dev. Here's the error: [paste]"

Press `Ctrl + C` in terminal to stop server.

### Step 6: Open AI Chat in Cursor (30 sec)

1. Press `Ctrl + L`
2. AI chat panel opens

### Step 7: Give Cursor Context (2 min)

In the AI chat, type:

```
I'm starting a new project called Wynla.

Please read all the .md files in the handoff-docs folder 
to understand:
- What we're building (PRODUCT_SPEC.md)
- The tech stack (TECHNICAL_SPEC.md)
- Database structure (DATABASE_SCHEMA.md)
- Design principles (DESIGN_GUIDE.md)
- Roadmap (DEVELOPMENT_ROADMAP.md)
- Business context (BUSINESS_CONTEXT.md)

After reading, tell me:
1. What you understand about the project
2. What we should do first today
3. Any clarifying questions
```

Cursor will read all files and respond.

### Step 8: Customize Home Page (15 min)

Replace default Next.js page with Wynla placeholder.

Ask Cursor:

```
Replace the content in app/page.tsx with a simple landing page that says:
- "Wynla" as a big heading
- "Coming soon: Plan your next ski trip" subtitle
- Simple, clean design with Tailwind
- Use design principles from DESIGN_GUIDE.md
```

Cursor writes code → click "Apply" → save file

Run `npm run dev` again → see your custom page

### Step 9: First Git Commit (3 min)

```bash
git add .
git commit -m "Initial Wynla landing page"
```

### Step 10: Push to GitHub (5 min)

1. Go to github.com → Click "+" → "New repository"
2. Name: `wynla`
3. Private (recommended for now)
4. Don't initialize with README
5. Create repository

GitHub shows commands. Copy the "push existing repository" commands:

```bash
git remote add origin https://github.com/YOUR_USERNAME/wynla.git
git branch -M main
git push -u origin main
```

**Verification:** Refresh GitHub → see your code

### Step 11: Deploy to Vercel (5 min)

1. Go to vercel.com
2. Click "Add New" → "Project"
3. Import `wynla` repository
4. Click "Deploy"
5. Wait ~1 minute
6. Click on the deployment URL

**You should see:** Your live Wynla landing page!

### Step 12: Setup Supabase Database (10 min)

1. Go to supabase.com → New Project
2. Name: `wynla`
3. Set strong database password (save it!)
4. Choose region closest to NYC
5. Wait 2 min for setup

Once ready:
1. Go to **SQL Editor**
2. Open `handoff-docs/DATABASE_SCHEMA.md`
3. Copy the `CREATE TABLE resorts` SQL
4. Paste into SQL Editor
5. Click "Run"

**Verification:** Go to Table Editor → see `resorts` table (empty)

### Step 13: Add Sample Data (5 min)

In Supabase SQL Editor, paste the Hunter Mountain INSERT from DATABASE_SCHEMA.md → Run

```sql
SELECT * FROM resorts;
```

Should return 1 row (Hunter Mountain) ✓

### Step 14: Connect Next.js to Supabase (10 min)

In Cursor terminal:

```bash
npm install @supabase/supabase-js
```

Ask Cursor:

```
Help me create a Supabase client at /lib/supabase.ts
following the pattern in TECHNICAL_SPEC.md.

Then create a .env.local file (don't commit it) with placeholders
for SUPABASE_URL and SUPABASE_ANON_KEY.

Show me where to find these in my Supabase dashboard.
```

Follow Cursor's instructions:
1. Get values from Supabase: Project Settings → API
2. Add to `.env.local`
3. Verify `.env.local` is in `.gitignore`

### Step 15: Test Connection (10 min)

Ask Cursor:

```
Update app/page.tsx to fetch resorts from Supabase
and display the count of resorts.
```

After Cursor updates code:
- Run `npm run dev`
- Page should show "1 resort in database"

If it works: **YOU JUST CONNECTED YOUR APP TO A REAL DATABASE.**

### Step 16: Final Commit & Deploy (5 min)

```bash
git add .
git commit -m "Connect to Supabase and display resort count"
git push
```

**Important:** Add environment variables to Vercel:
1. Go to Vercel project → Settings → Environment Variables
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy (Settings → Deployments → click latest → Redeploy)

Wait ~1 min → visit your live URL → should show "1 resort"

### Step 17: Celebrate! 🎉

You now have:
- ✅ Working Next.js app
- ✅ Connected to real database
- ✅ Live on the internet
- ✅ Code in GitHub
- ✅ Auto-deploys on push

**This is more than 80% of "I have an app idea" people ever do.**

---

## 📝 What's Next (Day 2-30)

Open `DEVELOPMENT_ROADMAP.md` and follow the phases:

- **Phase 1:** Add 30 resorts to database
- **Phase 2:** Build the map view
- **Phase 3:** Add filters
- **Phase 4:** Build resort detail pages
- **Phase 5:** Polish & launch

---

## 🆘 Common Day 1 Issues

### "npm: command not found"
→ Node.js not installed. Install from nodejs.org

### "Permission denied" errors
→ Don't use admin/sudo. Run as regular user.

### Vercel deploy fails
→ Check build logs. Usually missing env vars.

### Supabase: "Failed to fetch"
→ Check .env.local has correct values, no extra spaces

### "Module not found" errors  
→ Run `npm install` again

### Page shows "1 resort" then breaks
→ Tell Cursor the exact error, it'll help debug

---

## 💡 Working with Cursor AI Effectively

### Good Prompts:
✅ "Update X to do Y, following the pattern in TECHNICAL_SPEC.md"
✅ "I'm getting this error: [paste full error]. How do I fix?"
✅ "Show me how to add a button to navigate to /resort/hunter-mountain"

### Bad Prompts:
❌ "Make it work"
❌ "Add stuff"
❌ "Build the entire app" (too big)

### Pro Tips:
1. **Always read what Cursor generates** before clicking Apply
2. **Test after every change** — don't accumulate untested code
3. **Commit often** — every working state should be a commit
4. **Ask "why" questions** — learn while building
5. **Don't fight Cursor** — if it suggests a different approach, hear it out

---

## 🎯 Daily Routine (After Day 1)

```
Morning (1 hour):
- Open Cursor, review yesterday's TODO
- Pick 1-2 tasks from roadmap
- Read relevant section of handoff docs

Build (3-4 hours):
- Implement features
- Test in browser
- Commit working code

Afternoon (1 hour):
- Manual test what you built
- Push to GitHub
- See live deployment
- Plan tomorrow

Done!
```

---

## 📞 When You're Stuck for 30+ Minutes

Don't waste time. Take action:

1. **Tell Cursor**: "I've been stuck on X for 30 minutes. Here's what I tried. What should I try next?"
2. **Search Stack Overflow** for exact error
3. **Skip the feature** if it's blocking — come back later
4. **Take a break** — 10 minutes away helps clarity
5. **Ask in Cursor Discord** or other communities

---

## 🏆 First Week Goals

By end of week 1:
- [ ] Local dev environment works
- [ ] App deployed to Vercel
- [ ] Connected to Supabase
- [ ] 30 resorts in database
- [ ] Can fetch and display resort data
- [ ] Comfortable using Cursor AI
- [ ] Git/GitHub workflow second nature

---

## 💪 You Got This

You're not alone. You have:
- Detailed plans (handoff docs)
- AI assistant (Cursor)
- Years of best practices encoded in tools
- A real problem to solve
- Time and motivation

Most people fail by:
- Not starting
- Quitting on first hard problem
- Trying to be perfect

You succeed by:
- Starting
- Persisting through stuck moments
- Shipping imperfect work
- Listening to users

**Ship every day. Talk to users every week. Compound results monthly.**

---

## 🎬 Final Note from Claude

I built these handoff documents to give you a head start that most founders never have. 

But the most important thing is **execution**. No plan survives contact with reality. Adapt as you learn.

The product spec will change. The tech stack might change. The business model will evolve.

What matters is: **Are you building something users love?**

Everything else is details.

Go ship something. I believe in you. 🚀

---

*When you open this in Cursor, start with Step 1 above. Don't skip steps. Each builds on the last.*
