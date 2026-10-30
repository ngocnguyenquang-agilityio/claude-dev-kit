---
description: Write my standup (Yesterday / Today / Blockers) from my git commits, my GitHub PRs and issues, and the handoff notes.
argument-hint: "[since, e.g. 3 days]"
allowed-tools: Bash(git config user.email), Bash(git log:*), Bash(date:*), Bash(gh pr list:*), Bash(gh issue list:*), Read, Glob
---

## Context

- Me: !`git config user.email`
- Today: !`date "+%A %Y-%m-%d"`
- Window override: $ARGUMENTS

## Task

Write a standup report for me, ready to paste into team chat.

1. **Window.** If "Window override" is non-empty, use it as git's `--since` value (`3 days`, `2026-10-15`). Otherwise start at 00:00 of the previous working day: on Monday that's Friday, on any other day it's yesterday. Pass it as an absolute `"YYYY-MM-DD 00:00"`, because git reads `yesterday` as 24 hours back. Say the window in the report's first line.
2. **Commits.** Run `git log --all --no-merges --author="<my email>" --since="<window>" --format="%h %ad %s" --date=short`. Group the commits by issue, using the `(#N)` in each commit subject.
3. **Handoff notes.** Written by the `handoff` skill. Glob `.claude/wip/*.md` and read each note. Their **Next** items feed Today, and their **Open** items feed Blockers.
4. **GitHub.** Run three queries in Bash:
   - `gh pr list --author @me --state merged --search "merged:>=<window start date>"` gives Yesterday's merge refs.
   - `gh pr list --author @me` and `gh issue list --assignee @me` give what's still open.
   - If a call fails on its flags or output format, retry it once exactly as written above.
   - If a query still fails, skip just that query and end the report with a note naming it, e.g. `(GitHub issues skipped: gh issue list failed)`. When every query fails, the note is `(GitHub skipped: gh unavailable)`.
5. **Write** the report as plain text, with at most ~8 bullets in total:

   ```text
   Standup <today> (since <window start>)

   Yesterday
   - #<N> <issue title>: merged (PR #<M>)

   Today
   - #<N> <next step from the wip note>

   Blockers
   - none
   ```

   - **Yesterday:** finished work from the commits and the merged or opened PRs, one bullet per issue, with refs as `#N` and `PR #N`.
   - **Today:** the wip notes' **Next** items and my open PRs or issues.
   - **Blockers:** the wip notes' **Open** items, or `none`.

Done when every commit in the window is covered by a Yesterday bullet, and every wip **Next** item is covered by a Today bullet.
