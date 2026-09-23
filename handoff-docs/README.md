# handoff-docs

Context for people and agents working on Wynla. Start with the two live
files, then dip into the rest only when a task needs them.

## Read first (kept current)

| File | What it is |
|---|---|
| `CURRENT_STATUS.md` | What is live on wynla.app, what is pending, the founder checklist, the round ledger. Rewritten 2026-09-23. |
| `SESSION_PROTOCOL.md` | How a session runs: never-stop batches, worktree + branch rules, PR creation, what to verify before finishing. |
| `DB_SCHEMA_LIVE_2026-09-23.md` | The live Supabase schema as of 2026-09-23. |
| `sql/` | Pending migrations, in the order to run them (`2026-09-23-ALL-season-1.sql`, then `2026-09-23-ALL-round-2.sql`). |
| `DATA_BACKFILL_2026-09-23.md` | The September data backfill: what was fixed, coverage, how to re-run. |
| `*_2026-09-23.md` (AUTH, DATA_PIPELINE, GO, INSTALL, PASS_DATA, PREDICTION_LEDGER) | Per-feature notes from Season 1 rounds 1 and 2: what shipped, the env vars and Supabase settings each needs. |
| `RESEND_SETUP.md` | Transactional email setup. |

The root `README.md` has how to run, check, deploy and which env vars
exist.

## Planning documents (May 2026, historical)

`PRODUCT_SPEC.md`, `TECHNICAL_SPEC.md`, `DATABASE_SCHEMA.md`,
`DESIGN_GUIDE.md`, `DEVELOPMENT_ROADMAP.md`, `BUSINESS_CONTEXT.md`,
`QUICK_START.md`, `STAGE_4_5_6_PLANS.md` and `MASTER_PROMPT_FOR_CLAUDE_CODE.md` were
written before the first line of code, for a Cursor-based build that never
happened in that shape. They still explain the original intent (map-first,
pass-aware, generous free tier, no scraped trail maps, no ski-vs-snowboard
judgements) but the stack details, folder layout and roadmap in them are
superseded by the code and by `CURRENT_STATUS.md`. Do not take a number or
a schema from them; take it from the live schema file or the database.

## Conventions

- Dates in file names are the day the snapshot was taken, US format
  YYYY-MM-DD.
- A file that is no longer true gets a one-line "superseded by" note at
  the top rather than being deleted, so old links keep resolving.
