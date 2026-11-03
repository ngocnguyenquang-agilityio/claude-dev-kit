---
name: issue
description: Work a GitHub issue from draft to PR. Modes are new (draft and file an issue), start (branch and plan), finish (checks, review, status docs, commands) and fix (bug flow with a regression test). Use when the user asks to file, start, pick up, finish or hotfix an issue or bug.
argument-hint: "<new|start|finish|fix> [issue number or description]"
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs")
---

Mode and arguments: $ARGUMENTS

The first word is the mode: `new`, `start`, `finish` or `fix`. Everything after it is the mode's arguments, called `$ARGUMENTS` in the mode file. If the first word is not a mode, infer it from the request (a bug report is `fix`, "file an issue" is `new`) and say which one you chose. When nothing tells you, ask.

Config: !`node "${CLAUDE_PLUGIN_ROOT}/hooks/kit-config.mjs"`

Read `references/<mode>.md` in this skill's folder and follow it. `baseBranch`, `issuesDir`, `checks` and `branch` come from the config above.
