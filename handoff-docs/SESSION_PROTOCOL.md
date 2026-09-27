# Wynla: session protocol

How a Claude Code session on this repo runs. Read with `CURRENT_STATUS.md`.
Last updated 2026-09-23.

## Roles

- Saitarn decides direction (CEO). Claude does the work (Ops) and only
  escalates what it cannot do: dashboard clicks in Supabase, Vercel,
  GitHub secrets, Resend, keys.
- Strategy questions ("what do you think") get a discussion, not code.
  Code happens on an explicit instruction ("ทำเลย", "build this").
- Thai in chat, English in code, commits and docs.

## Start of a session

1. Read `handoff-docs/CURRENT_STATUS.md` (what is live, what is pending,
   the founder checklist) and the package doc for the area you touch.
2. `git -C C:/Users/saita/ridewise status` and `git branch --list` to see
   which branches and worktrees exist. Do not assume `main` is the base.
3. Summarise the state in five to seven lines, list the plan, get one
   confirmation, then run the whole batch.

## Never-stop mode

Once a batch is confirmed, run it to the end: no "what next?" pauses
between steps. Collect everything only Saitarn can do (SQL to run, env
vars, dashboard toggles) and hand it over as one list at the end. If work
is still in flight when a turn ends, schedule the next wake-up
(`ScheduleWakeup`, prompt `<<autonomous-loop-dynamic>>`) so idle time does
not stall the loop.

## Worktrees (one per package)

Every package gets its own worktree and branch off the current base
branch (today `feat/season-1-round2-clean`):

```
git -C C:/Users/saita/ridewise worktree add C:/Users/saita/ridewise-worktrees/<pkg> -b wf/<pkg> <base>
cd C:/Users/saita/ridewise-worktrees/<pkg>
cmd /c mklink /J node_modules C:\Users\saita\ridewise\node_modules
```

- The junction shares one `node_modules`; `npm install <dep>` from any
  worktree lands in it. Commit `package.json` and `package-lock.json`
  with the code that needs the dependency.
- Do not run `next build` or `next dev` in a package worktree; the shared
  `.next` cache and the junction make two builds collide. Use
  `npx tsc --noEmit`, `npm run lint` (0 errors) and `npm test`.
- Stay inside your file scope. If you must touch a file another package
  owns, say so in the integration notes instead of editing it.
- Database rules: no DDL, no row writes unless the brief says so, feature
  detect tables and columns that the pending SQL may not have created.
- Never print secrets. `.env.local` holds keys; reading it is fine,
  echoing it is not.

## Commits and PRs

- One coherent commit per logical chunk, message explains why, ends with
  `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Package branches are not pushed by the package agent; the integrator
  merges them into the base branch, runs the checks, and pushes.
- PRs go to `main` from the base branch. The description lists what
  shipped, the SQL to run, the env vars, and the founder checklist; it
  ends with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Merging a PR needs Saitarn's GitHub session in Chrome; Claude prepares
  the PR and asks for the click.

## End of a session

Update `handoff-docs/CURRENT_STATUS.md`: what shipped, what is pending,
the founder checklist, and anything learned for "Do not". Keep it to
today's truth; move history into the package docs rather than piling it
up here.
