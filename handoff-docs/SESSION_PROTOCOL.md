# Wynla — Session Protocol

This file defines how every Claude Code session works. Read this
along with CURRENT_STATUS.md when starting a session.

## At Start of Every Session
1. Read wynla-handoff/CURRENT_STATUS.md
2. Read wynla-handoff/STAGE_4_5_6_PLANS.md if working on Stage 4-6
3. Summarize current state to user in 5-7 lines
4. Wait for user confirmation before proceeding with task

## At End of Every Session
Update wynla-handoff/CURRENT_STATUS.md:
- Last Session Result: what we did
- Next Action: single concrete step for next session
- Recent Decisions: append new decisions with date (keep last 10)
- Don't Do: append any new anti-patterns learned
- Data Stats Snapshot: update if numbers changed

Then: git add -A && git commit -m "session: <one-line summary>"

## When User Drags CURRENT_STATUS.md to Chat (other Claude)
The other Claude (in claude.ai chat) will use it as context.
That Claude handles strategy/review/decisions.
You (Claude Code) handle execution/file edits/scraping.

## Decision Source of Truth
- Strategic decisions: discussed in chat with the other Claude
- Implementation decisions: made by you with user confirmation
- ALL decisions land in CURRENT_STATUS.md "Recent Decisions" section
