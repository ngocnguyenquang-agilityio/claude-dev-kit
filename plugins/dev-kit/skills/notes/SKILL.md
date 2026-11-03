---
name: notes
description: Keep track of work across sessions. Modes are handoff (write a per-branch note so a fresh session can continue) and standup (write Yesterday / Today / Blockers from commits, PRs and notes). Use when pausing work or ending a session mid-task, or when the user asks for a standup or a summary of recent work.
argument-hint: "<handoff|standup> [focus for the next session, or since, e.g. 3 days]"
disable-model-invocation: true
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"), Bash(git config user.email), Bash(git log:*), Bash(date:*), Bash(gh pr list:*), Bash(gh issue list:*), Read, Glob
---

Mode and arguments: $ARGUMENTS

The first word is the mode: `handoff` or `standup`. Everything after it is the mode's arguments, called `$ARGUMENTS` in the mode file. If the first word is not a mode, infer it from the request (pausing work is `handoff`, a summary of recent work is `standup`) and say which one you chose. When nothing tells you, ask.

Config: !`node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`

- Me: !`git config user.email`
- Today: !`date "+%A %Y-%m-%d"`

Read `references/<mode>.md` in this skill's folder and follow it. `baseBranch`, `wipNote` and `branch.issue` come from the config above.
